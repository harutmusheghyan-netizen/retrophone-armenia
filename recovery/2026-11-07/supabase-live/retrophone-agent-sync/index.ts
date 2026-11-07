import { createClient } from "npm:@supabase/supabase-js@2";

const cors={ "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" };
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const isRecord=(x:unknown):x is Record<string,unknown>=>typeof x==="object"&&x!==null&&!Array.isArray(x);
const text=(x:unknown,n=1000)=>typeof x==="string"?x.slice(0,n):"";
const https=(x:unknown)=>{const s=text(x,800);try{const u=new URL(s);return u.protocol==="https:"&&u.hostname.length>2?s:null}catch{return null}};
const hash=async (token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const same=(a:string,b:string)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0};
const positive=(x:unknown)=>typeof x==="number"&&Number.isInteger(x)&&x>=0&&x<=20;
Deno.serve(async req=>{
 if(req.method!=="POST")return response({error:"method_not_allowed"},405);
 let payload:Record<string,unknown>;
 try{const raw=await req.text();if(raw.length>75000)return response({error:"too_large"},413);payload=JSON.parse(raw);if(!isRecord(payload))return response({error:"invalid_request"},400)}catch{return response({error:"bad_json"},400)}
 const token=req.headers.get("x-retrophone-agent-token")||"";
 if(token.length<38||token.length>160)return response({error:"unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL");
 let key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key){try{key=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}")?.default}catch{key=undefined}}
 if(!url||!key)return response({error:"backend_not_configured"},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:access,error:accessError}=await db.from("agent_research_access").select("token_sha256,active").eq("id",1).maybeSingle();
 if(accessError||!access?.active||!same(await hash(token),access.token_sha256))return response({error:"unauthorized"},401);
 const action=text(payload.action,30);
 // Normalize worker payloads that may include a Nokia brand prefix; preserve exact model variants.
 const model=text(payload.model,65).trim().toLowerCase()
   .replace(/^(?:nokia[\s_-]+)+/g,"").replace(/[\s_-]+/g," ").trim();
 if(!["queue_next","dashboard","catalog_plan","review_batches","review_next_three","publish_approved_batch"].includes(action)&&!/^[a-z0-9][a-z0-9 .-]{1,64}$/.test(model))return response({error:"invalid_model"},400);
 if(action==="publish_approved_batch"){
   const batchId=Number(payload.batch_id);
   if(!Number.isSafeInteger(batchId)||batchId<1)return response({error:"invalid_batch_id"},400);
   const ownerToken=text(payload.owner_access_token,5000);
   if(ownerToken.length<40)return response({error:"owner_login_required"},401);
   const {data:verifiedOwner,error:ownerError}=await db.auth.getUser(ownerToken);
   if(ownerError||!verifiedOwner?.user?.id)return response({error:"owner_session_invalid"},401);
   const {data:ownerAdmin,error:roleError}=await db.from("admin_users").select("user_id").eq("user_id",verifiedOwner.user.id).maybeSingle();
   if(roleError||!ownerAdmin)return response({error:"owner_admin_role_required"},403);
   const {data:published,error:publicationError}=await db.rpc("agent_publish_approved_review_batch",{p_batch_id:batchId});
   if(publicationError)return response({error:"publication_guard_rejected",reason:publicationError.message?.slice(0,220)||"quality_or_approval_blocker",code:publicationError.code||"unknown",batch_id:batchId},409);
   return response({ok:true,result:published,publication_scope:"strictly_owner_approved_quality_verified_batch",batch_id:batchId});
 }

 if(action==="review_batches"){
   const {data:batches,error:be}=await db.from("agent_review_batches")
    .select("id,status,target_count,created_at,reviewed_at,published_at,reviewer_note")
    .order("id",{ascending:false}).limit(12);
   if(be)return response({error:"review_batches_unavailable",code:be.code||"unknown"},503);
   const ids=(batches||[]).map(x=>x.id);
   if(!ids.length)return response({ok:true,ready_batches:[],awaiting_review:0,
     publication_requires_manual_approval:true});
   const {data:items,error:ie}=await db.from("agent_review_batch_items")
     .select("id,batch_id,phone_model_id,run_id,review_status,draft_snapshot,reviewer_note,approved_by,approved_at,published_at")
     .in("batch_id",ids).order("id",{ascending:true});
   if(ie)return response({error:"review_batch_items_unavailable",code:ie.code||"unknown"},503);
   const ready=(batches||[]).map(b=>({...b,models:(items||[]).filter(i=>i.batch_id===b.id).map(i=>({
     id:i.id,phone_model_id:i.phone_model_id,run_id:i.run_id,
     model:i.draft_snapshot?.model,
     preview_url:"https://retrophone-armenia-catalog.vercel.app/phones/"+
       String(i.draft_snapshot?.brand||"").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"/"+
       String(i.draft_snapshot?.model||"").replace(/^Nokia /i,"").toLowerCase().replace(/\s+/g,"-"),
     review_status:i.review_status,editorial:i.draft_snapshot,approved_by:i.approved_by,
     reviewer_note:i.reviewer_note}))}));
   return response({ok:true,ready_batches:ready,
     awaiting_review:ready.filter(x=>x.status==="awaiting_review").length,
     publication_requires_manual_approval:true,auto_publish:false,
     photo_candidates_are_not_verified:true});
 }
 if(action==="review_next_three"){
    const {data:created,error:e}=await db.rpc("agent_stage_three_for_review");
    if(e)return response({error:"review_batch_staging_failed",code:e.code||"unknown"},503);
    return response({ok:true,new_batch:created?.[0]||null,
       message:created?.length?"three_distinct_models_staged_for_manual_review":"waiting_for_three_distinct_models",
       publication_requires_manual_approval:true,auto_publish:false});
 }
 if(action==="catalog_plan"){
  const [plan,photos]=await Promise.all([
    db.from("agent_catalog_workplan")
      .select("phone_model_id,batch_number,status,phone_models!inner(model_name,release_year,display_year,hero_image_url,description,specifications,brands(name))")
      .order("batch_number").range(0,999),
    db.from("agent_photo_search_state").select("phone_model_id,status,attempts").range(0,999)
  ]);
  if(plan.error||photos.error)return response({error:"catalog_plan_read_failed",code:plan.error?.code||photos.error?.code||"unknown"},503);
  const byId=new Map((photos.data||[]).map(x=>[x.phone_model_id,x]));
  const brands=new Map<string,any>(),batches=new Map<number,any>();
  let withoutPhoto=0,photoStopped=0,needsCoreInfo=0,awaitingWorkers=0;
  for(const x of plan.data||[]){
    const m=x.phone_models as any;
    const brand=Array.isArray(m.brands)?m.brands[0]?.name:m.brands?.name||"Unknown";
    const p=byId.get(x.phone_model_id);
    const lacking=!m.description||String(m.description).trim().length<150||
      !m.specifications||Object.keys(m.specifications).length===0||!(m.release_year||m.display_year);
    if(lacking)needsCoreInfo++;
    if(!m.hero_image_url)withoutPhoto++;
    if(p?.status==="no_photo_after_3")photoStopped++;
    if(x.status==="planned")awaitingWorkers++;
    const b=brands.get(brand)||{brand,total:0,missing_photo:0,needs_core_info:0,photo_search_exhausted:0};
    b.total++;if(!m.hero_image_url)b.missing_photo++;
    if(lacking)b.needs_core_info++;if(p?.status==="no_photo_after_3")b.photo_search_exhausted++;
    brands.set(brand,b);
    const q=batches.get(x.batch_number)||{batch:x.batch_number,total:0,planned:0,pilot_active:0};
    q.total++;if(x.status==="planned")q.planned++;if(x.status==="pilot_active")q.pilot_active++;
    batches.set(x.batch_number,q);
  }
  return response({ok:true,summary:{models:(plan.data||[]).length,missing_photo:withoutPhoto,
    core_info_incomplete:needsCoreInfo,photo_after_three:photoStopped,
    research_not_dispatched:awaitingWorkers,batch_size:25,publishing_disabled:true},
    brands:Array.from(brands.values()),batches:Array.from(batches.values()),
    note:"Planning only: non-Nokia research worker has not yet been deployed; no public catalog changes."});
 }
if(action==="queue_next"){
  const {data:claims,error:claimError}=await db.rpc("agent_claim_pilot_jobs",{p_limit:4,p_cooldown_hours:18});
  if(claimError)return response({error:"queue_claim_failed",code:claimError.code||"unknown"},503);
  const chosen=(claims||[]).map(x=>({model:x.model,task_id:x.task_id,is_new:false}));
  const {error:logErr}=await db.from("agent_worker_events").insert({
    event_type:chosen.length?"queue_claimed":"queue_empty",
    details:{count:chosen.length,models:chosen.map(x=>x.model),scope:"nokia-20-quality-v1",catalog_changed:false}
  });
  return response({ok:true,models:chosen,mode:"autonomous_research_only",
   pilot:"nokia-20-quality-v1",queue_logged:!logErr,auto_publish:false,budget_for_paid_ai_usd:0});
 }
 const label="Nokia "+model;
 const {data:task,error:taskError}=await db.from("agent_research_tasks").select("id,phone_model_id,model_label,status,constraints").ilike("model_label",label).maybeSingle();
 if(taskError)return response({error:"task_lookup_failed"},500);
 if(!task)return response({error:"model_not_in_test_queue",normalized_model:model},404);
 if(action==="model_diagnosis")return response({ok:true,model:task.model_label,task_id:task.id,task_status:task.status,normalized_model:model,no_changes:true});

 if(action==="handoff"){
   const [runResult,srcResult,reviewResult]=await Promise.all([
     db.from("agent_research_runs").select("id,status,mode,structured_draft,technical_checks,started_at").eq("task_id",task.id).order("id",{ascending:false}).limit(1).maybeSingle(),
     db.from("agent_research_sources").select("url,title,source_kind,author,license,evidence,verification_status").eq("task_id",task.id).order("id",{ascending:true}).limit(80),
     db.from("agent_research_reviews").select("verdict,notes,created_at,agent_research_runs!inner(task_id)").eq("agent_research_runs.task_id",task.id).order("id",{ascending:false}).limit(5)
   ]);
   if(runResult.error||srcResult.error||reviewResult.error)return response({error:"handoff_query_failed"},500);
   const run=runResult.data;
   const s=srcResult.data||[];
   const verified=s.filter(x=>x.verification_status==="verified");
   const candidates=s.filter(x=>x.verification_status==="candidate");
   const rejected=s.filter(x=>x.verification_status==="rejected");
   const draft=run?.structured_draft||{};
   const checks=run?.technical_checks||{};
   const facts=Array.isArray(draft.fact_checks)?draft.fact_checks:[];
   const photos=Array.isArray(draft.photo_ranking)?draft.photo_ranking:[];
   const translations=isRecord(draft.multilingual_drafts)?draft.multilingual_drafts:{};
   const gate=isRecord(checks.quality_gate)?checks.quality_gate:{status:"not_evaluated"};
   return response({ok:true,model:label,task_status:task.status,
     report_id:run?.id||null,report_at:run?.started_at||null,
     report_mode:run?.mode||null,editor_verified_sources:verified,
     pending_source_candidates:candidates,
     rejected_source_count:rejected.length,photo_candidates:photos.slice(0,8),
     fact_checks:facts.slice(0,25),multilingual_drafts:translations,
     quality_gate:gate,editor_reviews:(reviewResult.data||[]).map((x:any)=>({verdict:x.verdict,notes:x.notes,created_at:x.created_at})),
     ready_for_publication:false,stock_unknown:true,
     instructions:"Assistant: verify original manufacturer/museum facts, visually check photos and licenses, then publish manually; never invent inventory. Confirm only two most recently handled models."});
 }
 if(action==="dashboard"){
   const {data:tasks,error:e}=await db.from("agent_research_tasks").select("id,model_label,status,priority,updated_at").order("priority").limit(50);
   if(e)return response({error:"dashboard_query_failed"},500);
   const taskIds=(tasks||[]).map(t=>t.id);
   const [runsRes,srcRes,revRes,qRes]=await Promise.all([
     db.from("agent_research_runs").select("id,task_id,status,mode,started_at,finished_at,structured_draft,technical_checks").in("task_id",taskIds).order("id",{ascending:false}).limit(120),
     db.from("agent_research_sources").select("task_id,source_kind,verification_status").in("task_id",taskIds).limit(800),
     db.from("agent_research_reviews").select("run_id,verdict,created_at,notes").order("id",{ascending:false}).limit(50),
     db.from("agent_quality_gate_results").select("task_id,score,status,checks,blockers,checked_at").in("task_id",taskIds).limit(100)
   ]);
   if(runsRes.error||srcRes.error||revRes.error||qRes.error)return response({error:"dashboard_details_failed"},500);
   const runs=runsRes.data||[],sources=srcRes.data||[],reviews=revRes.data||[];
   const rows=(tasks||[]).map(t=>{
     const relevant=runs.filter(r=>r.task_id===t.id);
     const last=relevant[0]||null;
     const own=sources.filter(s=>s.task_id===t.id);
     const review=last?reviews.find(r=>r.run_id===last.id)||null:null;
     const quality=(qRes.data||[]).find(q=>q.task_id===t.id)||null;
     return {quality:quality?{score:quality.score,status:quality.status,blockers:quality.blockers,checks:quality.checks,checked_at:quality.checked_at}:null,model:t.model_label.replace(/^Nokia /,""),label:t.model_label,status:t.status,priority:t.priority,
       updated_at:t.updated_at,latest_run:last?{id:last.id,status:last.status,mode:last.mode,at:last.started_at,
         drafts:last.structured_draft?.multilingual_drafts||null,quality:last.technical_checks?.quality_gate||null}:null,
       total_runs:relevant.length,source_count:own.length,
       verified_sources:own.filter(s=>s.verification_status==="verified"&&(s.source_kind==="official"||s.source_kind==="museum")).length,
       verified_photos:own.filter(s=>s.verification_status==="verified"&&s.source_kind==="photo").length,
       latest_review:review?{verdict:review.verdict,notes:review.notes,at:review.created_at}:null
     }
   });
   const {data:events}=await db.from("agent_worker_events").select("event_type,created_at,task_id,details").order("id",{ascending:false}).limit(20);
   return response({ok:true,recent_worker_events:events||[],models:rows,summary:{queued:rows.filter(r=>r.status==="queued").length,
     ready:rows.filter(r=>r.status==="under_review"||r.status==="approved").length,
     need_sources:rows.filter(r=>r.status==="needs_sources").length,
     total_runs:runs.length,qa_scored:(qRes.data||[]).length,
     qa_drafts_approved:(qRes.data||[]).filter(q=>q.status==="draft_approved").length,
     pilot_batch:"nokia-20-quality-v1",pilot_target:20},catalog_unchanged:true,publishing_disabled:true,paid_budget_usd:0});
 }
 if(action==="review"){
   const verdict=text(payload.verdict,40);
   if(!["approved_draft","requires_revision","needs_more_sources","rejected"].includes(verdict))return response({error:"invalid_verdict"},400);
   const note=text(payload.notes,1200).trim();
   if(note.length<8)return response({error:"explanation_required"},400);
   const {data:runs,error:runsError}=await db.from("agent_research_runs").select("id,task_id").eq("task_id",task.id).order("id",{ascending:false}).limit(1);
   if(runsError||!runs?.length)return response({error:"no_run_to_review"},409);
   const runId=runs[0].id;
   if(payload.run_id!==runId)return response({error:"stale_run_refresh_required",run_id:runId},409);
   const {data:sources}=await db.from("agent_research_sources").select("source_kind,verification_status").eq("task_id",task.id).limit(200);
   const real=(sources||[]).filter(s=>s.verification_status==="verified"&&["official","museum"].includes(s.source_kind)).length;
   const photos=(sources||[]).filter(s=>s.verification_status==="verified"&&s.source_kind==="photo").length;
   const {data:photoState}=await db.from("agent_photo_search_state").select("attempts,status").eq("phone_model_id",task.phone_model_id).maybeSingle();
   const waivePhoto=photoState?.status==="no_photo_after_3"&&photoState?.attempts===3;
   if(verdict==="approved_draft"&&(real<2||(!waivePhoto&&photos<1)||payload.confirmed_manual_check!==true))
      return response({error:"approval_requires_two_verified_historical_sources_photo_or_three_failed_attempts_and_manual_confirmation",real,photos,photo_waived:waivePhoto},409);
   if(verdict==="approved_draft"){
     const {data:qa,error:qe}=await db.from("agent_quality_gate_results").select("checks,blockers").eq("task_id",task.id).maybeSingle();
     const c=qa?.checks||{};
     if(qe||!qa||c.model_identity_exact!==true||c.release_year_verified!==true||
         Number(c.independent_historical_source_domains||0)<2||(Number(c.licensed_photo_sources||0)<1&&c.photo_waived_after_three!==true)||
         c.draft_ru_present!==true||c.draft_hy_present!==true||c.draft_en_present!==true||
         Number(c.pending_editor_corrections||0)>0)
       return response({error:"research_quality_gate_incomplete",blockers:qa?.blockers||["quality_report_missing"]},409);
   }
   const checklist={human_checked:payload.confirmed_manual_check===true,official_or_museum_verified:real,
      photo_verified:photos,photo_waived_after_three:waivePhoto,scope:"research_draft_only",publication_authorized:false};
   const {data:review,error:err}=await db.from("agent_research_reviews").insert({
     run_id:runId,reviewer:"project_owner_review_panel",verdict,checklist,notes:note}).select("id").single();
   if(err)return response({error:"review_not_saved"},500);
   const status=verdict==="approved_draft"?"approved":verdict==="requires_revision"?"revision_needed":
      verdict==="needs_more_sources"?"needs_sources":"rejected";
   await db.from("agent_research_tasks").update({status,updated_at:new Date().toISOString()}).eq("id",task.id);
   return response({ok:true,review_id:review.id,task_status:status,scope:"research_only",site_published:false});
 }
 if(action==="context"){
   const {data:sources}=await db.from("agent_research_sources").select("source_kind,url,title,author,license,evidence,verification_status").eq("task_id",task.id).eq("verification_status","verified").order("id",{ascending:true}).limit(25);
   const {data:reviews}=await db.from("agent_research_reviews").select("verdict,notes,checklist,created_at,agent_research_runs!inner(task_id)").eq("agent_research_runs.task_id",task.id).order("created_at",{ascending:false}).limit(3);
   const {data:registry}=await db.from("agent_document_registry").select("url,title,source_kind,curator_note,target_models").eq("active",true).contains("target_models",[model]).limit(15);
   const {data:modelData}=await db.from("phone_models").select("display_year,release_year").eq("id",task.phone_model_id).maybeSingle();
   const {data:corrections}=await db.from("agent_editor_feedback").select("field_name,verdict,original_value,corrected_value,reason,evidence_url,created_at").eq("phone_model_id",task.phone_model_id).order("id",{ascending:false}).limit(20);
   const {data:quality}=await db.from("agent_quality_gate_results").select("score,status,blockers,checks").eq("phone_model_id",task.phone_model_id).maybeSingle();
   const {data:photoSearch}=await db.from("agent_photo_search_state").select("attempts,status,last_attempt_at").eq("phone_model_id",task.phone_model_id).maybeSingle();
   return response({photo_search:{attempts:photoSearch?.attempts||0,remaining:Math.max(0,3-(photoSearch?.attempts||0)),
     search_allowed:photoSearch?.status==="pending",status:photoSearch?.status||"pending",max_attempts:3},
     editor_correction_memory:corrections||[],current_quality_gate:quality||null,model:label,task_id:task.id,task_status:task.status,archive_registry:registry||[],known_year:modelData?.release_year||modelData?.display_year||null,supervisor_sources:sources||[],feedback:(reviews||[]).map((r:any)=>({verdict:r.verdict,notes:r.notes,checklist:r.checklist})),approvalRequired:true,publishingDisabled:true});
 }
 if(action!=="save")return response({error:"unsupported_action"},400);
 if(!isRecord(payload.result))return response({error:"missing_result"},400);
 const p=payload.result;
 if(text(p.model,100).toLowerCase()!==label.toLowerCase())return response({error:"model_mismatch"},400);
 const {data:photoState,error:psError}=await db.from("agent_photo_search_state")
   .select("attempts,status").eq("phone_model_id",task.phone_model_id).maybeSingle();
 if(psError)return response({error:"photo_retry_state_unavailable"},503);
 const photoSearchAllowed=photoState?.status==="pending";
 const photoSearchClosed=!photoSearchAllowed;
 if(task.status==="approved"||task.status==="rejected")return response({error:"task_closed"},409);
 const fingerprint=await hash(JSON.stringify({model:label,autonomous:p.autonomous===true,archiveOnly:p.archiveOnly===true,result:p}));
 const {data:existingRun,error:existingError}=await db.from("agent_research_runs").select("id").eq("task_id",task.id).eq("input_fingerprint",fingerprint).limit(1).maybeSingle();
 if(existingError)return response({error:"duplicate_check_failed"},503);
 if(existingRun){
   await db.from("agent_research_tasks").update({lease_until:null}).eq("id",task.id);
   await db.from("agent_worker_events").insert({event_type:"save_duplicate",task_id:task.id,details:{run_id:existingRun.id}});
   return response({ok:true,duplicate:true,run_id:existingRun.id,task_id:task.id,live_site_unchanged:true});
 }
 const wiki=Array.isArray(p.sources)?p.sources.slice(0,7):[];
 const photos=!photoSearchClosed&&Array.isArray(p.photos)?p.photos.slice(0,10):[];
 const curated=Array.isArray(p.curatedSources)?p.curatedSources.slice(0,20):[];
 const discovered=Array.isArray(p.discoveredDocuments)?p.discoveredDocuments.slice(0,15):[];
 const sources=[
 ...wiki.filter(isRecord).map(x=>({task_id:task.id,source_kind:"encyclopedia",url:https(x.url),title:text(x.title,200),evidence:text(x.excerpt,1000),verification_status:"candidate"})),
 ...photos.filter(isRecord).map(x=>({task_id:task.id,source_kind:"photo",url:https(x.sourceUrl),title:text(x.title,200),author:text(x.author,200),license:text(x.license,150),evidence: "License checked from Wikimedia metadata; manual model verification pending",verification_status:"candidate"})),
 ...curated.filter(isRecord).map(x=>({task_id:task.id,source_kind:["official","museum","encyclopedia","photo"].includes(text(x.source_kind))?text(x.source_kind):"other",url:https(x.url),title:text(x.title,200),author:text(x.author,200),license:text(x.license,150),evidence:text(x.evidence,1000),verification_status:"candidate"})),
 ...discovered.filter(isRecord).map(x=>({task_id:task.id,source_kind:["official","museum","encyclopedia"].includes(text(x.source_kind))?text(x.source_kind):"other",url:https(x.url),title:text(x.title,200),evidence:text(x.evidence,1000)+" | Auto-discovered document; unreviewed by editor; HTTP: "+text(x.httpStatus,100),verification_status:"candidate"}))
 ].filter(s=>!!s.url&&!!s.title);
 const rank=(x:any)=>x.source_kind==="official"?5:x.source_kind==="museum"?4:x.source_kind==="photo"?3:x.source_kind==="encyclopedia"?2:1;
 const byUrl=new Map<string,typeof sources[number]>();
 for(const entry of sources){
   const previous=byUrl.get(entry.url!);
   if(!previous||rank(entry)>rank(previous))byUrl.set(entry.url!,entry);
 }
 const distinctSources=Array.from(byUrl.values());
 if(distinctSources.length>0){
   const {error:sourceError}=await db.from("agent_research_sources").upsert(distinctSources,{onConflict:"task_id,url",ignoreDuplicates:true});
   if(sourceError){
     await db.from("agent_worker_events").insert({event_type:"research_failed",task_id:task.id,details:{stage:"source_save",code:sourceError.code||"unknown"}});
     return response({error:"sources_save_failed",code:sourceError.code||"unknown"},503);
   }
 }
 const sourceCount=wiki.length+curated.length+discovered.length;
 const imgs=photos.filter(x=>isRecord(x)&&x.mayUseCommercially===true);
 const checks={
 model_exact_match:text(p.model,100).toLowerCase()===label.toLowerCase(),
 quality_gate:isRecord(p.qualityGate)?p.qualityGate:{status:"not_computed"},official_or_museum_sources:curated.filter(x=>isRecord(x)&&["official","museum"].includes(text(x.source_kind))).length,
 automated_literature_count:wiki.length,autodiscovered_documents:discovered.length,
 discover_docs_need_review:true,license_checked_photos:imgs.length,
 historic_facts_require_human_review:true,model_photo_match_requires_human:true,
 official_sources_verified_by_supervisor_only:true,zero_paid_generation:true,site_edited:false,
 photo_authors_licenses_recorded:imgs.length===0?"none":true
 };
 const draft={model:label,multilingual_drafts:isRecord(p.multilingualDrafts)?p.multilingualDrafts:{},fact_checks:Array.isArray(p.factChecks)?p.factChecks.slice(0,25):[],photo_ranking:Array.isArray(p.photoRanking)?p.photoRanking.slice(0,10):[], wikipedia:wiki, wikimedia_photos:photos, known_sources:curated, autodiscovered_documents:discovered, text_generation:"disabled_without_paid_gateway",facts_to_verify:["Date and release region","Model variants","Photograph matches device","Author and full license terms"],status:"sources_only_needs_review"};
 const {data:run,error:runError}=await db.from("agent_research_runs").insert({task_id:task.id,status:"sources_only",mode:p.archiveOnly===true?"free_archive_scan":p.autonomous===true?"autonomous_queue_v3":"free_supervised_v2",structured_draft:draft,technical_checks:checks,automation_cost_usd:0,input_fingerprint:fingerprint,started_at:new Date().toISOString(),finished_at:new Date().toISOString()}).select("id").single();
 if(runError){
   if(runError.code==="23505"){
     const {data:previous}=await db.from("agent_research_runs").select("id").eq("task_id",task.id).eq("input_fingerprint",fingerprint).maybeSingle();
     await db.from("agent_research_tasks").update({lease_until:null}).eq("id",task.id);
     return response({ok:true,duplicate:true,run_id:previous?.id||null,task_id:task.id,live_site_unchanged:true});
   }
   await db.from("agent_worker_events").insert({event_type:"research_failed",task_id:task.id,details:{stage:"run_save",code:runError.code||"unknown"}});
   return response({error:"save_failed",code:runError.code||"unknown"},503);
 }
 let photoRetryResult=photoState?{attempts:photoState.attempts,status:photoState.status}:null;
 let retryError:any=null;
 const countAttempt=p.archiveOnly!==true&&p.photoSearchAttempted!==false&&Array.isArray(p.photos)&&photoSearchAllowed;
 if(countAttempt){
   const good=photos.find((x:any)=>isRecord(x)&&x.mayUseCommercially===true&&
      https(x.sourceUrl)&&text(x.author,200).length>0&&text(x.license,150).length>0);
   const {data:photoResult,error:pe}=await db.rpc("agent_record_photo_search_attempt",
      {p_model_id:task.phone_model_id,p_licensed_candidate_url:good?https(good.sourceUrl):null});
   retryError=pe;
   photoRetryResult=photoResult?.[0]||photoRetryResult;
 }
 const {data:qaAfterSave,error:qaError}=await db.from("agent_quality_gate_results").select("status,score,blockers").eq("task_id",task.id).maybeSingle();
 const unresolved=(qaAfterSave?.blockers||[]).filter((x:string)=>x!=="needs_human_editor_approval");
 const readyForHuman=!!qaAfterSave&&unresolved.length===0;
 const newStatus=p.archiveOnly===true?task.status:readyForHuman?"under_review":"needs_sources";
 const {error:taskUpdateError}=await db.from("agent_research_tasks")
   .update({status:newStatus,lease_until:null,updated_at:new Date().toISOString()}).eq("id",task.id);
 await db.from("agent_worker_events").insert({
   event_type:taskUpdateError||qaError||retryError?"research_failed":"research_saved",
   task_id:task.id,
   details:{run_id:run.id,status:newStatus,quality_score:qaAfterSave?.score||0,
     blockers:qaAfterSave?.blockers||[],saved_sources:distinctSources.length,
     photo_search:photoRetryResult||null,code:taskUpdateError?.code||qaError?.code||retryError?.code||null,auto_publish:false}
 });
 if(taskUpdateError||qaError||retryError)return response({error:"research_saved_but_followup_failed",run_id:run.id,
   code:taskUpdateError?.code||qaError?.code||retryError?.code||"unknown",live_site_unchanged:true},503);
 const {data:newReviewBatch,error:batchError}=await db.rpc("agent_stage_three_for_review");
 if(batchError)await db.from("agent_worker_events").insert({
   event_type:"research_failed",task_id:task.id,
   details:{stage:"three_model_review_staging",code:batchError.code||"unknown",no_auto_publish:true}
 });
 return response({ok:true,run_id:run.id,task_id:task.id,saved_sources:distinctSources.length,
   review_batch:newReviewBatch?.[0]||null,review_staging_error:batchError?.code||null,
   new_status:newStatus,quality_gate:qaAfterSave||null,photo_search:photoRetryResult||null,paid_cost_usd:0,
   live_site_unchanged:true,review_required:true});
});