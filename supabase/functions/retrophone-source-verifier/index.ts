import {createClient} from "npm:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")||"";
const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const permitted=new Set(["www.nokia.com","www.ericsson.com","www.mobilephonemuseum.com",
 "www.mobilephonehistory.co.uk","www.nokiamuseum.net","www.globenewswire.com","globenewswire.com",
 "mobilephonemuseum.com","nokia.com","ericsson.com","mobilephonehistory.co.uk","nokiamuseum.net"]);
const norm=(s:unknown)=>String(s||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const unhtml=(s:string)=>s.replace(/&#(\d+);/g,(_,v)=>String.fromCharCode(Number(v))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">");
const clean=(html:string)=>unhtml(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," "));
function identity(text:string,brand:string,model:string):number{
 const s=norm(text),needle=norm(brand+" "+model);
 const i=s.indexOf(needle);if(i<0)return -1;
 const before=s.slice(Math.max(0,i-1),i),after=s.slice(i+needle.length);
 if(before&&/[a-z0-9]/.test(before))return -1;
 const following=after.trim().split(" ").slice(0,2).join(" ");
 // Prevent confusing Nokia 2660 with Nokia 2660 Flip or new 4G variants.
 if(/^(flip|4g|5g|2022|2023|classic|plus|mini|pro|dual|ii)\b/.test(following))return -1;
 return i;
}
async function examine(raw:string,brand:string,model:string,year:number){
 let parsed:URL;try{parsed=new URL(raw)}catch{return {outcome:"needs_human_review",status:0,title:"",excerpt:"",error:"bad_url"}}
 if(parsed.protocol!=="https:"||!permitted.has(parsed.hostname.toLowerCase()))
  return {outcome:"needs_human_review",status:0,title:"",excerpt:"",error:"untrusted_host"};
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),9500);
 try{
  const res=await fetch(raw,{signal:ctrl.signal,headers:{"Accept":"text/html","User-Agent":"RetroPhoneArmeniaResearch/1.0 (https://retrophone-armenia.vercel.app/; source-check)"},redirect:"follow"});
  const final=new URL(res.url);if(!permitted.has(final.hostname.toLowerCase()))
   return {outcome:"needs_human_review",status:res.status,title:"",excerpt:"",error:"unexpected_redirect"};
  if(res.status===429||res.status>=500)return{outcome:"retry",status:res.status,title:"",excerpt:"",error:"upstream_retryable"};
  if(!res.ok)return{outcome:"needs_human_review",status:res.status,title:"",excerpt:"",error:"source_not_reachable"};
  if(!(res.headers.get("content-type")||"").includes("text/html"))
   return{outcome:"needs_human_review",status:res.status,title:"",excerpt:"",error:"non_html_requires_document_review"};
  const html=(await res.text()).slice(0,900000);
  const title=clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||"").slice(0,240);
  if(/access denied|just a moment|captcha|page not found|error 403/i.test(title))
   return{outcome:"needs_human_review",status:res.status,title,excerpt:"",error:"source_access_challenge"};
  const body=clean(html).slice(0,180000);
  const normalized=norm(body),target=norm(brand+" "+model);
  const idx=identity(body,brand,model);
  const titleIndex=identity(title,brand,model);
  if(idx<0&&titleIndex<0)
   return{outcome:"needs_human_review",status:res.status,title,excerpt:"",error:"exact_model_not_found"};
  const years=[year-1,year,year+1].filter(y=>y>=1990&&y<=2026);
  const excerpt=idx>=0?normalized.slice(Math.max(0,idx-125),Math.min(normalized.length,idx+target.length+210)):norm(title);
  const yearFound=years.some(y=>excerpt.includes(String(y)))||years.some(y=>norm(title).includes(String(y)));
  if(!yearFound)
   return{outcome:"needs_human_review",status:res.status,title,excerpt:excerpt.slice(0,250),error:"model_found_but_year_not_proved_in_context"};
  return{outcome:"verified",status:res.status,title,excerpt:excerpt.slice(0,250),error:null};
 }catch{return{outcome:"retry",status:0,title:"",excerpt:"",error:"network_timeout_or_parse"}}
 finally{clearTimeout(timer)}
}
Deno.serve(async req=>{
 if(req.method==="GET")return reply({ok:true,service:"retrophone-source-verifier",automated_source_identity_check:true,does_not_verify_all_facts:true});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 if(!key||!url)return reply({error:"worker_unconfigured"},503);
 const token=req.headers.get("x-retrophone-cron-token")||"";
 if(!/^[a-f0-9]{64}$/i.test(token))return reply({error:"unauthorized"},401);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:yes,error:ae}=await db.rpc("agent_validate_internal_photo_worker",{p_token:token});
 if(ae||yes!==true)return reply({error:"unauthorized"},403);
 const {data:jobs,error:qe}=await db.rpc("agent_claim_source_verification_jobs",{p_limit:2});
 if(qe)return reply({error:"claim_failed",code:qe.code},503);
 const results=[];
 for(const job of jobs||[]){
  const checked=await examine(job.source_url,job.brand,job.model_name,Number(job.year_label)||0);
  const {data:result,error:fe}=await db.rpc("agent_finish_source_verification_job",{
   p_source_id:job.source_id,p_outcome:checked.outcome,p_http_status:checked.status,
   p_page_title:checked.title,p_excerpt:checked.excerpt,p_error:checked.error
  });
  results.push({source_id:job.source_id,model:job.brand+" "+job.model_name,
   outcome:fe?"save_failed":result?.outcome||"unknown",
   details:fe?.code||checked.error||"checked",http:checked.status});
 }
 return reply({ok:true,checked:results.length,results,
  quality_requirements_unchanged:true,automatic_publication:false});
});