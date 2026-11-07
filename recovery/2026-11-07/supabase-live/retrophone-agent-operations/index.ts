import {createClient} from "npm:@supabase/supabase-js@2";
type Dict=Record<string,unknown>;
const isObj=(v:unknown):v is Dict=>!!v&&typeof v==="object"&&!Array.isArray(v);
const text=(x:unknown,n=120)=>typeof x==="string"?x.trim().slice(0,n):"";
const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,"0")).join("");
const safeSame=(a:string,b:string)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0};
const normalized=(x:unknown)=>text(x,130).normalize("NFKC").toLowerCase().replace(/[\s\-_]+/g," ").trim();
const imageKey=(s:unknown)=>{let u=text(s,1200);try{const v=new URL(u);return(v.hostname+v.pathname).toLowerCase().replace(/\/%[0-9a-f]{2}/gi,(x)=>decodeURIComponent(x))}catch{return u.toLowerCase()}};
const urlValid=(x:unknown)=>{try{const u=new URL(text(x,1200));return u.protocol==="https:"&&!u.username&&!u.password}catch{return false}};
const safeCondition=["unverified","excellent","good","fair","parts"];
const allowedStatus=["draft","ready_for_review","reserved","sold"];
const fields=["item_code","phone_model_id","brand","model","condition_grade","tested","battery_notes","accessories","asking_price_amd","owner_photo_url","status","notes"];
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const token=req.headers.get("x-retrophone-agent-token")||"";
 if(token.length<38||token.length>160)return reply({error:"unauthorized"},401);
 let payload:Dict;
 try{let raw=await req.text();if(raw.length>28000)return reply({error:"too_large"},413);payload=JSON.parse(raw);if(!isObj(payload))return reply({error:"invalid_body"},400)}
 catch{return reply({error:"invalid_json"},400)}
 let secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret){try{secret=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default}catch{}}
 const url=Deno.env.get("SUPABASE_URL");
 if(!secret||!url)return reply({error:"backend_not_configured"},503);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:access,error:ae}=await db.from("agent_research_access").select("token_sha256,active").eq("id",1).maybeSingle();
 if(ae||!access?.active||!safeSame(await hash(token),access.token_sha256))return reply({error:"unauthorized"},401);
 const action=text(payload.action,50);
 if(action==="overview"){
  const [i,a,h,t]=await Promise.all([
   db.from("agent_inventory_items").select("id,item_code,phone_model_id,brand,model,condition_grade,tested,asking_price_amd,status,updated_at").order("updated_at",{ascending:false}).limit(100),
   db.from("agent_quality_audits").select("id,summary,findings,created_at").order("id",{ascending:false}).limit(1),
   db.from("agent_private_change_log").select("id,record_table,record_id,operation,created_at,before_data,after_data").order("id",{ascending:false}).limit(25),
   db.from("agent_inventory_items").select("id",{count:"exact",head:true})
  ]);
  if(i.error||a.error||h.error||t.error)return reply({error:"overview_query_failed"},500);
  return reply({inventory:i.data||[],inventory_total:t.count||0,latest_audit:a.data?.[0]||null,history:h.data||[],enforced:"no_catalog_writes_no_auto_stock",paid_cost_usd:0});
 }
 if(action==="catalog_search"){
  const q=text(payload.query,75).replace(/[%_,()*]/g,"").trim();
  if(q.length<2)return reply({error:"search_query_too_short"},400);
  const [models,brands]=await Promise.all([
   db.from("phone_models").select("id,brand_id,model_name,display_year,release_year,hero_image_url").ilike("model_name","%"+q+"%").order("model_name").limit(25),
   db.from("brands").select("id,name")
  ]);
  if(models.error||brands.error)return reply({error:"catalog_search_failed"},500);
  const byId=new Map((brands.data||[]).map(b=>[b.id,b.name]));
  return reply({results:(models.data||[]).map(m=>({id:m.id,name:(byId.get(m.brand_id)||"Brand")+" "+m.model_name,year:m.release_year||m.display_year||null,has_photo:!!m.hero_image_url,stock:"not_checked"})),notice:"Энциклопедия; наличие реального экземпляра не подразумевается"});
 }
 if(action==="audit"){
  const [m,p,b]=await Promise.all([
   db.from("phone_models").select("id,brand_id,model_name,release_year,display_year,year_type,description,source_url,hero_image_url,image_source_url,image_credit,image_license,is_published").range(0,1999),
   db.from("phone_photos").select("id,phone_model_id,image_url,source_url,photographer,license,is_primary,is_published").range(0,999),
   db.from("brands").select("id,name")
  ]);
  if(m.error||p.error||b.error)return reply({error:"audit_source_unavailable"},500);
  const models=m.data||[],photos=p.data||[],brands=new Map((b.data||[]).map(x=>[x.id,x.name]));
  let stats={models_checked:models.length,photos_checked:photos.length,missing_description:0,missing_reference:0,missing_photo:0,photo_incomplete_credits:0,unverified_year:0,duplicate_model_groups:0,reused_image_groups:0,duplicate_photos_same_model:0,seo_needs_work:0};
  const seen=new Map<string,number[]>(),photoSeen=new Map<string,{model:number;id:number}[]>(),inModelPhoto=new Map<string,number[]>(),issues:Dict[]=[];
  const push=(kind:string,severity:string,id:number,model:string,message:string)=>{if(issues.length<170)issues.push({kind,severity,model_id:id,model,message})};
  for(const m of models){
   const name=(brands.get(m.brand_id)||"Unknown")+" "+m.model_name,key=m.brand_id+":"+normalized(m.model_name);
   seen.set(key,[...(seen.get(key)||[]),m.id]);
   if(!m.description||String(m.description).trim().length<120){stats.missing_description++;push("seo_description","medium",m.id,name,"Историческое описание отсутствует либо очень короткое")}
   if(!m.source_url){stats.missing_reference++;push("source_missing","medium",m.id,name,"Не указан источник характеристик")}
   if(!m.hero_image_url){stats.missing_photo++;push("photo_missing","medium",m.id,name,"Нет утверждённого основного изображения")}
   else if(!m.image_credit||!m.image_license||!m.image_source_url){stats.photo_incomplete_credits++;push("license_incomplete","high",m.id,name,"Недостаточно данных об авторе, лицензии или источнике фото")}
   if(m.year_type==="unverified"||!m.year_type||!m.display_year&&!m.release_year){stats.unverified_year++;push("date_unverified","low",m.id,name,"Не подтверждён тип года или год модели")}
   if(!m.description||String(m.description).trim().length<120||!m.source_url)stats.seo_needs_work++;
  }
  for(const [key,list] of seen)if(list.length>1){stats.duplicate_model_groups++;push("duplicate_model","high",list[0],key,"Совпадающие записи ID "+list.join(", "))}
  for(const p of photos){
   const key=imageKey(p.source_url||p.image_url),g=photoSeen.get(key)||[];g.push({model:p.phone_model_id,id:p.id});photoSeen.set(key,g);
   const uniqueKey=p.phone_model_id+":"+key;inModelPhoto.set(uniqueKey,[...(inModelPhoto.get(uniqueKey)||[]),p.id]);
  }
  for(const [key,group] of photoSeen)if(new Set(group.map(x=>x.model)).size>1){stats.reused_image_groups++;push("photo_reused","high",group[0].model,key,"Один источник фотографии указан для разных моделей; нужна проверка")}
  for(const [key,group] of inModelPhoto)if(group.length>1){stats.duplicate_photos_same_model++;push("photo_duplicate","low",Number(key.split(":")[0]),key,"Дублируется источник изображения в рамках одной модели")}
  const summary={...stats,read_only:true,auto_fix:false,checked_scope:"database_metadata_not_live_pages",note:"Это диагностика всей базы, без повторной проверки опубликованных старых страниц."};
  const {data:entry,error}=await db.from("agent_quality_audits").insert({audit_type:"catalog_data",scope:"encyclopedia_metadata",summary,findings:issues}).select("id,created_at").single();
  if(error)return reply({error:"audit_saved_failed"},500);
  return reply({audit_id:entry.id,at:entry.created_at,summary,top_findings:issues.slice(0,50),total_issues_sampled:issues.length,changed_models:0});
 }
 if(action==="inventory_add"||action==="inventory_edit"){
  if(!isObj(payload.item))return reply({error:"item_required"},400);
  const v=payload.item, item:Dict={};
  for(const k of fields)if(Object.prototype.hasOwnProperty.call(v,k))item[k]=v[k];
  if("item_code"in item){const s=text(item.item_code,41).toUpperCase();if(!/^[A-Z0-9_-]{3,40}$/.test(s))return reply({error:"invalid_item_code"},400);item.item_code=s}
  if("brand"in item){const s=text(item.brand,80);if(s.length<2)return reply({error:"invalid_brand"},400);item.brand=s}
  if("model"in item){const s=text(item.model,120);if(!s)return reply({error:"invalid_model"},400);item.model=s}
  if("condition_grade"in item&&!safeCondition.includes(item.condition_grade as string))return reply({error:"invalid_condition"},400);
  if("status"in item&&!allowedStatus.includes(item.status as string))return reply({error:"invalid_status"},400);
  if("tested"in item&&typeof item.tested!=="boolean")return reply({error:"invalid_tested"},400);
  for(const field of ["battery_notes","accessories","notes"])if(field in item){if(item[field]!==null&&typeof item[field]!=="string")return reply({error:"invalid_"+field},400);item[field]=item[field]===null?null:text(item[field],500)}
  if("asking_price_amd"in item&&item.asking_price_amd!==null){const n=Number(item.asking_price_amd);if(!Number.isFinite(n)||n<0||n>1e9)return reply({error:"invalid_price"},400);item.asking_price_amd=n}
  if("owner_photo_url"in item&&item.owner_photo_url!==null&&!urlValid(item.owner_photo_url))return reply({error:"invalid_photo_url"},400);
  if("phone_model_id"in item&&item.phone_model_id!==null){const id=Number(item.phone_model_id);if(!Number.isInteger(id)||id<1)return reply({error:"invalid_model_reference"},400);const x=await db.from("phone_models").select("id,model_name,brand_id").eq("id",id).maybeSingle();if(x.error||!x.data)return reply({error:"model_reference_not_found"},400);item.phone_model_id=id}
  item.updated_at=new Date().toISOString();
  if(action==="inventory_add"){
   if(!item.item_code||!item.brand||!item.model)return reply({error:"item_code_brand_model_required"},400);
   item.status="draft";
   const {data,error}=await db.from("agent_inventory_items").insert(item).select("id,item_code,brand,model,status").single();
   if(error)return reply({error:error.code==="23505"?"duplicate_item_code":"inventory_create_failed"},400);
   return reply({ok:true,item:data,publication:false,quantity_in_stock_not_affected:true});
  }
  const id=Number(payload.id);if(!Number.isInteger(id)||id<1)return reply({error:"invalid_inventory_id"},400);
  if(Object.keys(item).length<2)return reply({error:"no_updates"},400);
  const {data,error}=await db.from("agent_inventory_items").update(item).eq("id",id).select("id,item_code,status,updated_at").maybeSingle();
  if(error||!data)return reply({error:"inventory_update_failed"},400);
  return reply({ok:true,item:data,publication:false,stock_not_affected:true});
 }
 if(action==="inventory_undo"){
  const id=Number(payload.id),confirmed=payload.confirmed===true;
  if(!Number.isInteger(id)||id<1||!confirmed)return reply({error:"explicit_undo_confirmation_required"},400);
  const [last,entry]=await Promise.all([
   db.from("agent_private_change_log").select("id,operation,before_data,after_data").eq("record_table","agent_inventory_items").eq("record_id",String(id)).order("id",{ascending:false}).limit(1).maybeSingle(),
   db.from("agent_inventory_items").select("*").eq("id",id).maybeSingle()
  ]);
  if(last.error||entry.error||!last.data||!entry.data)return reply({error:"cannot_undo_this_item"},409);
  const a=last.data;
  if(a.operation==="INSERT"){
   if(entry.data.status!=="draft")return reply({error:"cannot_undo_non_draft"},409);
   const z=await db.from("agent_inventory_items").delete().eq("id",id);
   if(z.error)return reply({error:"undo_failed"},500);
   return reply({ok:true,action:"draft_item_removed",id});
  }
  if(a.operation!=="UPDATE"||!isObj(a.before_data)||!isObj(a.after_data)||String(entry.data.updated_at)!==String(a.after_data.updated_at))
    return reply({error:"history_conflict_or_not_reversible"},409);
  const restore:Dict={};for(const k of fields)if(k in a.before_data)restore[k]=a.before_data[k];
  restore.updated_at=new Date().toISOString();
  const z=await db.from("agent_inventory_items").update(restore).eq("id",id).select("id,item_code,status").single();
  if(z.error)return reply({error:"undo_failed"},500);
  return reply({ok:true,action:"previous_inventory_version_restored",item:z.data});
 }
 return reply({error:"unsupported_action"},400);
});