// RetroPhone Armenia autonomous, source-verified Wikimedia photo worker.
// Unauthorized callers cannot claim or modify any queue rows.
const base=Deno.env.get('SUPABASE_URL')||'https://aikxbgixitaaatkmcols.supabase.co';
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const rpc=async(name,body)=>{
 const r=await fetch(base+'/rest/v1/rpc/'+name,{
 method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},
 body:JSON.stringify(body)
 });
 const text=await r.text();let val;try{val=JSON.parse(text)}catch{val={message:text.slice(0,200)}}
 if(!r.ok)throw Error(name+': '+r.status+' '+JSON.stringify(val).slice(0,200));
 return val;
};
const unhtml=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/\s+/g,' ').trim().slice(0,160);
const clean=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'');
function exactFileMatch(title,brand,model){
 const stem=String(title||'').replace(/^File:/i,'').replace(/\.(?:jpe?g|png|webp)$/i,'');
 const base=clean(brand+model),name=clean(stem);
 if(!name.startsWith(base))return false;
 const suffix=name.slice(base.length);
 if(!suffix)return true;
 if(/^(?:classic|i|ii|iii|plus|pro|mini|xl|neo|note|dual|edition|5g|4g|3g)/.test(suffix))return false;
 // Allow only photographic orientation, colors, camera numbering and view qualifiers.
 return /^(?:(?:front|rear|back|side|view|detail|screen|display|photo|image|mobile|phone|black|white|silver|blue|red|green|grey|gray|gold|pink|orange|purple|brown|opened|closed|folded|open|battery|with|without|top|bottom|left|right|original)|[0-9]{1,3})+$/.test(suffix);
}
function allowLicense(lic){
 const s=String(lic||'').toLowerCase().replace(/\s+/g,' ').trim();
 return /^(?:cc\s?by(?:-sa)?\s?(?:2\.0|2\.5|3\.0|4\.0)|cc0(?:\s?1\.0)?|public domain|pd|pd-old|pd-self)$/.test(s);
}
const getImg=async(brand,model,attempt=1)=>{
 const searchQueries=['intitle:"'+brand+' '+model+'"','intitle:"'+model+'" "'+brand+'"','"'+brand+' '+model+'"'];
 const ix=Math.min(2,Math.max(0,Number(attempt||1)-1));
 const u=new URL('https://commons.wikimedia.org/w/api.php');
 for(const [k,v] of Object.entries({action:'query',format:'json',generator:'search',gsrsearch:searchQueries[ix],gsrnamespace:'6',gsrlimit:ix===2?'50':'32',prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'500',origin:'*'}))u.searchParams.set(k,v);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 let payload;try{
 const r=await fetch(u,{signal:controller.signal,headers:{'User-Agent':'RetroPhoneArmeniaBot/1.0 (https://retrophone-armenia.vercel.app/; catalog research)','Accept':'application/json'}});
 if(!r.ok)throw Error('commons_http_'+r.status);
 payload=await r.json();
 }finally{clearTimeout(timer)}
 const pages=Object.values(payload?.query?.pages||{});
 for(const p of pages){
  if(p.ns!==6||!exactFileMatch(p.title,brand,model))continue;
  const ii=p.imageinfo?.[0];if(!ii||!/^image\/(?:jpeg|png|webp)$/i.test(ii.mime||''))continue;
  const ext=ii.extmetadata||{};
  const license=unhtml(ext.LicenseShortName?.value||'');
  const author=unhtml(ext.Artist?.value||ext.Credit?.value||'');
  if(!allowLicense(license)||author.length<2||/^(?:unknown|none|anonymous)$/i.test(author))continue;
  const file=p.title.slice(5).replace(/ /g,'_');
  const filePage='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file);
  const img='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=500';
  return {filePage,img,license,author,metadata:{title:p.title,provider:'Wikimedia Commons',licenseSource:'Commons imageinfo.extmetadata',identityRule:'exact_model_filename',checked_at:new Date().toISOString()}};
 }
 return null;
};
Deno.serve(async(req)=>{
 if(req.method==='GET')return json({ok:true,service:'retrophone-autonomous-catalog-worker',publishes_stock:false});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 if(!key)return json({error:'worker_not_configured'},503);
 const token=req.headers.get('x-retrophone-cron-token')||'';
 if(token.length!==64)return json({error:'scheduler_auth_required'},401);
 try{const allowed=await rpc('agent_validate_internal_photo_worker',{p_token:token});
 if(allowed!==true)return json({error:'scheduler_auth_failed'},403)}catch{return json({error:'scheduler_auth_failed'},403)}
 const result={ok:true,claimed:0,photo_saved:0,no_photo:0,retry:0,errors:[]};
 try{
  const tasks=await rpc('agent_claim_auto_enrichment_jobs',{p_limit:8});
  result.claimed=tasks.length;
  // Three at once keeps rate under control; each attempt is idempotently recorded.
  for(let offset=0;offset<tasks.length;offset+=3){
   await Promise.all(tasks.slice(offset,offset+3).map(async task=>{
    try{
     const photo=await getImg(task.brand,task.model_name,task.attempt||1);
     if(photo){
      await rpc('agent_finish_auto_enrichment_job',{p_model_id:task.phone_model_id,p_status:'photo_found',
       p_file_page_url:photo.filePage,p_image_url:photo.img,p_author:photo.author,p_license:photo.license,p_metadata:photo.metadata});
      result.photo_saved++;
     }else{
      await rpc('agent_finish_auto_enrichment_job',{p_model_id:task.phone_model_id,p_status:'no_licensed_photo'});
      result.no_photo++;
     }
    }catch(e){
     result.retry++;result.errors.push({id:task.phone_model_id,reason:String(e).slice(0,120)});
     try{await rpc('agent_finish_auto_enrichment_job',{p_model_id:task.phone_model_id,p_status:'retry',p_error:String(e).slice(0,120)})}catch{}
    }
   }));
  }
  return json(result)
 }catch(e){return json({ok:false,error:'worker_batch_failed',reason:String(e).slice(0,160)},500)}
});
