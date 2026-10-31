import {createClient} from "npm:@supabase/supabase-js@2";
const endpoint=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const norm=(value:unknown)=>String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const strip=(value:unknown,length=180)=>String(value||"").replace(/[<>\u0000-\u001f]/g," ").trim().slice(0,length);
const approvedLabel=(label:string,brand:string,model:string)=>{
 const a=norm(label),b=norm(brand+" "+model);
 return a===b||a===b+" mobile phone"||a===b+" cellphone";
};
async function getJson(url:URL):Promise<{data:any,error:string|null}>{
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),7500);
 try{
  const res=await fetch(url.toString(),{signal:ctrl.signal,headers:{
   "accept":"application/json","user-agent":"RetroPhoneArmeniaSourceResearch/1.0 (https://retrophone-armenia.vercel.app/; exact-title research)" }});
  if(!res.ok)return{data:null,error:"http_"+res.status};
  const text=await res.text();
  if(text.length>160000)return{data:null,error:"oversized_response"};
  return{data:JSON.parse(text),error:null};
 }catch(e){return{data:null,error:"network_or_parse_error"}}
 finally{clearTimeout(timer)}
}
Deno.serve(async(req)=>{
 if(req.method==="GET")return send({ok:true,worker:"retrophone-source-discovery",version:1,only_candidates:true,autopublish:false,minimum_independent_sources:2});
 if(req.method!=="POST")return send({error:"method_not_allowed"},405);
 if(!endpoint||!serviceKey)return send({error:"not_configured"},503);
 const token=req.headers.get("x-retrophone-cron-token")||"";
 if(!/^[a-f0-9]{64}$/i.test(token))return send({error:"unauthorized"},401);
 const db=createClient(endpoint,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:allowed,error:authError}=await db.rpc("agent_validate_internal_photo_worker",{p_token:token});
 if(authError||allowed!==true)return send({error:"unauthorized"},403);
 let limit=2;try{const body=await req.json();if(body&&Number.isInteger(body.limit))limit=Math.max(1,Math.min(3,body.limit))}catch{}
 const {data:tasks,error:claimError}=await db.rpc("agent_claim_source_discovery_jobs",{p_limit:limit});
 if(claimError)return send({ok:false,error:"source_claim_failed",code:strip(claimError.code,20)},503);
 const results:unknown[]=[];
 for(const task of tasks||[]){
  const taskId=Number(task.task_id),brand=strip(task.brand,70),model=strip(task.model_name,90);
  const records:{task_id:number,source_kind:string,url:string,title:string,evidence:string,verification_status:string,reviewer_note:string}[]=[];
  const networkErrors:string[]=[];
  try{
   const wiki=new URL("https://en.wikipedia.org/w/api.php");
   [["action","query"],["list","search"],["srsearch",'"'+brand+" "+model+'"'],["srlimit","8"],["format","json"]].forEach(([k,v])=>wiki.searchParams.set(k,v));
   const wikipedia=await getJson(wiki);
   if(wikipedia.error)networkErrors.push("wikipedia_"+wikipedia.error);
   for(const hit of wikipedia.data?.query?.search||[]){
    if(!approvedLabel(String(hit.title||""),brand,model))continue;
    const title=strip(hit.title,130);
    records.push({task_id:taskId,source_kind:"encyclopedia",
      url:"https://en.wikipedia.org/wiki/"+encodeURIComponent(title.replaceAll(" ","_")),
      title,evidence:"Exact-title Wikipedia search hit. Treat as reference candidate, not verified historical proof.",
      verification_status:"candidate",reviewer_note:"Cross-check date, variant and specifications against two independent primary/museum sources."});
    break;
   }
   const wikidata=new URL("https://www.wikidata.org/w/api.php");
   [["action","wbsearchentities"],["search",brand+" "+model],["language","en"],["limit","8"],["format","json"]].forEach(([k,v])=>wikidata.searchParams.set(k,v));
   const wd=await getJson(wikidata);
   if(wd.error)networkErrors.push("wikidata_"+wd.error);
   for(const item of wd.data?.search||[]){
    if(!/^Q[0-9]+$/.test(String(item.id||""))||!approvedLabel(String(item.label||""),brand,model))continue;
    records.push({task_id:taskId,source_kind:"encyclopedia",
      url:"https://www.wikidata.org/wiki/"+item.id,title:strip(item.label,130),
      evidence:"Exact-label Wikidata item; not an independent technical source; candidate only.",
      verification_status:"candidate",reviewer_note:"Find primary manufacturer documentation and independent museum sources."});
    break;
   }
   let inserted=0;
   for(const item of records){
    const {data,error}=await db.from("agent_research_sources")
      .upsert(item,{onConflict:"task_id,url",ignoreDuplicates:true}).select("id");
    if(error)throw Error("insert_failed:"+strip(error.code,30));
    inserted+=(data||[]).length;
   }
   const {data:finish,error:finishError}=await db.rpc("agent_finish_source_discovery_job",{
    p_task_id:taskId,p_candidate_count:inserted,p_error:networkErrors.length?networkErrors.join(";").slice(0,180):null
   });
   if(finishError)throw Error("finish_failed:"+strip(finishError.code,20));
   results.push({task_id:taskId,brand,model,attempt:task.attempt,found:inserted,disposition:finish?.status||"unknown",network_errors:networkErrors});
  }catch(e){
   const failure=strip(e instanceof Error?e.message:String(e),180);
   await db.rpc("agent_finish_source_discovery_job",{p_task_id:taskId,p_candidate_count:0,p_error:failure});
   results.push({task_id:taskId,brand,model,error:failure});
  }
 }
 return send({ok:true,claimed:(tasks||[]).length,results,verified_facts:0,published:0});
});