const MODELS=['2140','2300','2323 classic','2330 classic','2600','2610','2630','2650','2652','2660'];
async function sync(payload){const url=process.env.RESEARCH_SYNC_URL,token=process.env.RESEARCH_SYNC_TOKEN;if(!url||!token)return{ok:false,error:'bridge_missing'};
const c=new AbortController(),t=setTimeout(()=>c.abort(),11000);try{let r=await fetch(url,{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json','x-retrophone-agent-token':token},body:JSON.stringify(payload)});let v=await r.json().catch(()=>({}));return{ok:r.ok,http:r.status,...v}}catch(e){return{ok:false,error:String(e.message)}}finally{clearTimeout(t)}}
module.exports=async(req,res)=>{res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Robots-Tag','noindex');
if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'method'});
if(req.method==='GET'){let v=await sync({action:'dashboard',model:'2300'});return res.status(v.ok?200:(v.http||503)).json(v)}
let p=req.body||{},model=String(p.model||'').toLowerCase().trim(),verdict=String(p.verdict||''),run_id=Number(p.run_id),notes=String(p.notes||'').trim();
if(!MODELS.includes(model)||!['approved_draft','requires_revision','needs_more_sources','rejected'].includes(verdict)||!Number.isInteger(run_id)||run_id<1||notes.length<8||notes.length>1200)return res.status(400).json({error:'invalid_review_request'});
let v=await sync({action:'review',model,run_id,verdict,notes,confirmed_manual_check:p.confirmed_manual_check===truÿÿÿ¶»§q«^ÿÿÿ