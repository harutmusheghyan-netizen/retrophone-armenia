// Read-only public content revision API. No credentials beyond a publishable key.
const URL="https://aikxbgixitaaatkmcols.supabase.co/rest/v1/site_content_revision?select=scope,revision";
const KEY=process.env.RETRO_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_PvxphKmdiZKPMGD0BbPBuw_nS2cKRJt";
export default async function handler(req,res){
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store, max-age=0");
 if(req.method!=="GET")return res.status(405).json({error:"method_not_allowed"});
 try{
  const r=await fetch(URL,{headers:{apikey:KEY,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!r.ok)return res.status(503).json({error:"revision_unavailable"});
  const rows=await r.json();
  const catalog=rows.find(x=>x.scope==="catalog")?.revision,news=rows.find(x=>x.scope==="news")?.revision;
  if(!Number.isSafeInteger(Number(catalog))||!Number.isSafeInteger(Number(news)))
   return res.status(503).json({error:"revision_invalid"});
  return res.status(200).json({catalog:Number(catalog),news:Number(news)});
 }catch{return res.status(503).json({error:"revision_unavailable"});}
}
