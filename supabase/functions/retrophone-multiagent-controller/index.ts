import {createClient} from "npm:@supabase/supabase-js@2";
const project=Deno.env.get("SUPABASE_URL")||"https://aikxbgixitaaatkmcols.supabase.co";
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const norm=(v:unknown)=>String(v||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
const safe=(v:unknown,max=140)=>String(v||"").replace(/[<>]/g," ").slice(0,max);
const exact=(title:string,brand:string,model:string)=>norm(title).replace(/\b(mobile phone|cell phone)\b/g,"").trim()===norm(brand+" "+model);
const fetchText=async(url:string,ms=4800)=>{try{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),ms);try{const r=await fetch(url,{signal:controller.signal,headers:{"Accept":"text/html,application/json"}});if(!r.ok)return{ok:false,status:r.status,text:""};return{ok:true,status:r.status,text:(await r.text()).slice(0,45000)}}finally{clearTimeout(timeout)}}catch{return{ok:false,status:0,text:""}}};
Deno.serve(async req=>{
 if(req.method==="GET")return json({ok:true,service:"retrophone-multi-brand-research-v1",publishes_unverified:false,agents:["researcher","source_verifier","licensed_media","trilingual_drafts","publisher"],note:"Five task stages coordinated by one worker"});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(!key)return json({error:"worker_not_configured"},503);
 const token=req.headers.get("x-retrophone-cron-token")||"";
 if(token.length!==64)return json({error:"unauthorized"},401);
 const db=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:allowed,error:ae}=await db.rpc("agent_validate_internal_photo_worker",{p_token:token});
 if(ae||allowed!==true)return json({error:"unauthorized"},403);
 let options:Record<string,unknown>={};
 try{options=await req.json().catch(()=>({}));if(!options||typeof options!=="object"||Array.isArray(options))options={}}catch{}
 const batch=Math.min(5,Math.max(1,Number.isInteger(options.limit)?Number(options.limit):3));
 const {data:tasks,error:qe}=await db.rpc("agent_claim_catalog_research_jobs",{p_limit:batch});
 if(qe)return json({error:"claim_failed",code:qe.code||"unknown",detail:safe(qe.message,160)},503);
 const outcomes:unknown[]=[];
 for(const task of tasks||[]){
  const t=Number(task.task_id),mid=Number(task.phone_model_id);
  const brand=safe(task.brand,70),model=safe(task.model_name,80);
  const stages:Record<string,string>={researcher:"pending",source_verifier:"pending",licensed_media:"pending",trilingual_drafts:"pending",publisher:"pending"};
  try{
   const [modelR,archiveR,mediaR,photosR]=await Promise.all([
    db.from("phone_models").select("id,release_year,display_year,year_type,source_url,hero_image_url").eq("id",mid).maybeSingle(),
    db.from("agent_catalog_archival_summaries").select("summary_ru,summary_hy,summary_en,source_url,year_label,generated_at,evidence_status").eq("phone_model_id",mid).maybeSingle(),
    db.from("agent_catalog_verified_media").select("image_url,license,author").eq("phone_model_id",mid).maybeSingle(),
    db.from("agent_photo_search_state").select("status,attempts").eq("phone_model_id",mid).maybeSingle()
   ]);
   if(modelR.error||archiveR.error||mediaR.error||photosR.error||!modelR.data)throw Error("database_read_error");
   const m=modelR.data,arch=archiveR.data;
   stages.researcher=arch?"archival_draft_found":"needs_historical_sources";
   const candidates:{source_kind:string,url:string,title:string,evidence:string,verification_status:string}[]=[];
   // Candidate discovery, not factual verification. Never promote a search hit to an approved source.
   const wikiUrl=new URL("https://en.wikipedia.org/w/api.php");
   wikiUrl.searchParams.set("action","query");wikiUrl.searchParams.set("list","search");wikiUrl.searchParams.set("format","json");wikiUrl.searchParams.set("srlimit","5");
   wikiUrl.searchParams.set("srsearch",'"'+brand+" "+model+'"');
   const wiki=await fetchText(wikiUrl.toString());
   if(wiki.ok){try{
    const parsed=JSON.parse(wiki.text);
    const hit=(parsed?.query?.search||[]).find((v:any)=>exact(String(v.title||""),brand,model));
    if(hit)candidates.push({source_kind:"encyclopedia",url:"https://en.wikipedia.org/wiki/"+encodeURIComponent(hit.title.replaceAll(" ","_")),title:safe(hit.title,180),evidence:"Exact model title match; candidate only; technical claims not independently checked",verification_status:"candidate"});
   }catch{}}
   const slug=norm(model).replaceAll(" ","-");
   const museumUrl="https://www.mobilephonemuseum.com/phone-detail/"+slug;
   const museum=await fetchText(museumUrl);
   if(museum.ok){const title=(museum.text.match(/<title[^>]*>([^<]{2,160})<\/title>/i)||[])[1]||"";
    if(norm(title).includes(norm(model)) && norm(title).includes(norm(brand)))
      candidates.push({source_kind:"museum",url:museumUrl,title:safe(title,180),evidence:"Model text in page title; archival facts require separate corroboration",verification_status:"candidate"});
   }
   for(const c of candidates){
    const {error:e}=await db.from("agent_research_sources").upsert({task_id:t,...c},{onConflict:"task_id,url",ignoreDuplicates:true});
    if(e)throw Error("source_save_failed:"+safe(e.code,30));
   }
   const {data:sources,error:se}=await db.from("agent_research_sources")
    .select("url,source_kind,verification_status").eq("task_id",t);
   if(se)throw Error("source_audit_failed");
   const good=(sources||[]).filter(s=>s.verification_status==="verified"&&["official","museum"].includes(s.source_kind));
   const domains=new Set(good.map(s=>{try{return new URL(s.url).hostname}catch{return""}}));
   const twoSources=domains.size>=2;
   stages.source_verifier=twoSources?"two_verified_domains":"needs_two_independent_verified_sources";
   stages.licensed_media=mediaR.data?"verified_commons_photo":m.hero_image_url?"existing_site_image":"photo_search_pending";
   const trilingual=!!(arch?.summary_ru&&arch?.summary_hy&&arch?.summary_en);
   stages.trilingual_drafts=trilingual?"archival_drafts_unverified":"needs_translation_drafts";
   const fingerprint=[mid,arch?.generated_at||"none",Array.from(domains).sort().join(","),candidates.map(c=>c.url).sort().join(","),mediaR.data?.image_url||""].join("|");
   const {data:previous}=await db.from("agent_research_runs").select("id,input_fingerprint").eq("task_id",t).order("id",{ascending:false}).limit(1).maybeSingle();
   let duplicate=false;
   if(previous?.input_fingerprint===fingerprint){duplicate=true;}
   else {
    const draft={model:brand+" "+model,quality_status:"sources_only_needs_review",
     historical_archive:{year:arch?.year_label??m.display_year,source_url:arch?.source_url||m.source_url,evidence_status:arch?.evidence_status||"not_available"},
     multilingual_drafts:trilingual?{ru:{description:arch.summary_ru},hy:{description:arch.summary_hy},en:{description:arch.summary_en}}:{},
     candidate_sources:candidates.map(c=>c.url),photo_on_site:mediaR.data?.image_url||m.hero_image_url||null,
     blockers:["independent_historical_facts_not_verified",...(!trilingual?["trilingual_editorials_missing"]:[])]};
    const checks={source_domains_verified:domains.size,release_year_verified:false,model_identity_exact:true,
     photo_license_checked:!!mediaR.data,translation_drafts_unverified:true,
     five_agent_stages:stages,site_edited:false,zero_paid_spend:true};
    const {error:re}=await db.from("agent_research_runs").insert({task_id:t,mode:"multi_brand_supervisor_v1",
      status:"sources_only",structured_draft:draft,technical_checks:checks,
      automation_cost_usd:0,started_at:new Date().toISOString(),finished_at:new Date().toISOString(),input_fingerprint:fingerprint});
    if(re)throw Error("draft_save_failed:"+safe(re.code,30));
   }
   const {error:te}=await db.from("agent_research_tasks").update({
     status:"needs_sources",lease_until:null,updated_at:new Date().toISOString()
   }).eq("id",t);
   if(te)throw Error("release_failed");
   stages.publisher="not_eligible_unverified";
   await db.from("agent_worker_events").insert({event_type:duplicate?"multiagent_duplicate_skipped":"multiagent_research_saved",
     task_id:t,details:{phone_model_id:mid,brand,model,stages,candidate_sources:candidates.length,
      verified_source_domains:domains.size,photo_attempts:photosR.data?.attempts||0,duplicate,
      public_catalog_changed:false}});
   outcomes.push({model:brand+" "+model,task_id:t,duplicate,candidate_sources:candidates.length,stages});
  }catch(e){
   const message=safe(e instanceof Error?e.message:String(e),175);
   await db.from("agent_research_tasks").update({status:"needs_sources",lease_until:null,updated_at:new Date().toISOString()}).eq("id",t);
   await db.from("agent_worker_events").insert({event_type:"multiagent_research_failed",task_id:t,details:{error:message,agent_stages:stages}});
   outcomes.push({model:brand+" "+model,task_id:t,error:message});
  }
 }
 const {data:pub,error:pe}=await db.rpc("agent_autopublish_verified_research",{p_limit:5});
 return json({ok:true,claimed:(tasks||[]).length,results:outcomes,
   published:pe?{error:"publisher_unavailable",code:pe.code}:pub,
   only_verified_published:true,zero_paid_calls:true});
});