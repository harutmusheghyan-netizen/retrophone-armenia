'use strict';
const QUEUE=new Set(['2140','2300','2323 classic','2330 classic','2600','2610','2630','2650','2652','2660']);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store,private');res.setHeader('X-Robots-Tag','noindex,nofollow');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const model=String(req.query?.model||'').trim().toLowerCase();
 if(!QUEUE.has(model))return res.status(400).json({error:'model_outside_research_queue'});
 const base=process.env.RESEARCH_SYNC_URL,token=process.env.RESEARCH_SYNC_TOKEN;
 if(!base||!token)return res.status(503).json({error:'bridge_unavailable'});
 let c=new AbortController(),t=setTimeout(()=>c.abort(),11500);
 try{const p=await fetch(base,{method:'POST',signal:c.signal,headers:{'Content-Type':'application/json','x-retrophone-agent-token':token},
 body:JSON.stringify({action:'handoff',model})});
 const d=await p.json().catch(()=>({error:'invalid_upstream_response'}));
 res.status(p.status).json(d);
 }catch(e){res.status(503).json({error:'handoff_unavailable'})}finally{clearTimeout(t)}
};