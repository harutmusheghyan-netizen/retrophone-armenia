'use strict';
const allowed=new Set(['overview','audit','catalog_search','inventory_add','inventory_edit','inventory_undo']);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Robots-Tag','noindex,nofollow');
 if(req.method!=='GET'&&req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 const action=req.method==='GET'?'overview':String(req.body?.action||'');
 if(!allowed.has(action))return res.status(400).json({error:'unsupported_action'});
 const source=process.env.RESEARCH_SYNC_URL,token=process.env.RESEARCH_SYNC_TOKEN;
 if(!source||!token)return res.status(503).json({error:'research_bridge_unavailable'});
 const url=source.replace(/retrophone-agent-sync$/,'retrophone-agent-operations');
 if(url===source)return res.status(503).json({error:'operations_endpoint_missing'});
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);
 try{
 const body=req.method==='GET'?{action}:{...req.body,action};
 const response=await fetch(url,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','x-retrophone-agent-token':token},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({error:'non_json_response'}));
 return res.status(response.status).json(data);
 }catch(e){return res.status(503).json({error:'backend_unavailable',detail:String(e.message||e).slice(0,90)})}
 finally{clearTimeout(timer)}
};