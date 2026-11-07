'use strict';
// Read-only, authenticated bridge health probe. No catalog/news writes.
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Robots-Tag','noindex,nofollow');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  const secret=process.env.AGENT_DIAGNOSTIC_TOKEN;
  const supplied=req.headers['x-agent-diagnostic-token'];
  if(!secret || typeof supplied!=='string' || supplied!==secret || secret.length<32)
    return res.status(401).json({error:'unauthorized'});
  const url=process.env.RESEARCH_SYNC_URL;
  const token=process.env.RESEARCH_SYNC_TOKEN;
  if(!url || !token) return res.status(503).json({error:'bridge_not_configured'});
  let parsed;
  try { parsed=new URL(url); } catch { return res.status(503).json({error:'invalid_bridge_url'}); }
  if(parsed.protocol!=='https:') return res.status(503).json({error:'bridge_must_use_https'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try {
    // Supabase sync explicitly supports 'dashboard'; read-only authentication probe.
    const upstream=await fetch(parsed.href,{method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json','x-retrophone-agent-token':token},
      body:JSON.stringify({action:'dashboard'})});
    return res.status(upstream.ok?200:502).json({
      bridge_authenticated:upstream.ok,
      upstream_status:upstream.status,
      checked_at:new Date().toISOString()
    });
  } catch {
    return res.status(503).json({error:'bridge_unreachable'});
  } finally {clearTimeout(timeout);}
};
