// Preview-only protected news ingester. NOT a news research or verification engine.
// This endpoint refuses publication until configured and the guarded database RPC exists.
import { validateNewsPayload } from "./validation.mjs";

const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}
});

function tokenEquals(a:string,b:string):boolean {
  const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);
  if(x.length!==y.length)return false;
  let difference=0;
  for(let i=0;i<x.length;i++)difference|=x[i]^y[i];
  return difference===0;
}
function tokenFromRequest(req:Request):string {
  const h=req.headers.get("authorization")||"";
  const match=h.match(/^Bearer ([^\s]+)$/);
  return match?.[1]||"";
}

Deno.serve(async req=>{
  if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
  const expected=Deno.env.get("RETROPHONE_NEWS_INGEST_TOKEN")||"";
  const supplied=tokenFromRequest(req);
  if(expected.length<32 || !tokenEquals(supplied,expected))return respond({error:"unauthorized"},401);

  // Fail closed until a reviewed migration and live backup restore test are complete.
  if(Deno.env.get("RETROPHONE_NEWS_PUBLISH_ENABLED")!=="true")
    return respond({error:"publication_disabled"},503);

  const url=(Deno.env.get("SUPABASE_URL")||"").replace(/\/+$/,"");
  const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url.startsWith("https://") || !serviceRole)return respond({error:"server_not_configured"},503);

  const contentLength=Number(req.headers.get("content-length")||0);
  if(contentLength>65000)return respond({error:"payload_too_large"},413);
  let input:unknown;
  try {
    const raw=await req.text();
    if(raw.length>65000)return respond({error:"payload_too_large"},413);
    input=JSON.parse(raw);
  } catch{return respond({error:"invalid_json"},400);}

  const checked=validateNewsPayload(input);
  if(!checked.ok)return respond({error:"validation_failed",fields:checked.errors},422);

  // DB RPC is the serialization and idempotency boundary. This function deliberately
  // does not directly insert rows or create a Cron job.
  const headers={
    "apikey":serviceRole,
    "Authorization":"Bearer "+serviceRole,
    "Content-Type":"application/json",
    "Accept":"application/json",
    "Prefer":"return=representation"
  };
  const endpoint=url+"/rest/v1/rpc/retrophone_news_publish_checked";
  try {
    const reply=await fetch(endpoint,{
      method:"POST",headers,
      body:JSON.stringify({p_post:checked.article}),
      signal:AbortSignal.timeout(15000)
    });
    if(!reply.ok){
      // No database error details or credentials are returned to the client.
      if(reply.status===404 || reply.status===406)
        return respond({error:"guarded_rpc_unavailable"},503);
      if(reply.status===409)return respond({error:"duplicate_or_limit"},409);
      return respond({error:"database_rejected"},503);
    }
    const value=await reply.json();
    const result=Array.isArray(value)?value[0]:value;
    if(result?.status==="daily_limit_reached")return respond({error:"daily_limit_reached"},409);
    if(result?.status==="conflict")return respond({error:"duplicate_source_or_slug"},409);
    if(!result || !["published","already_exists"].includes(result.status)
       || !Number.isSafeInteger(Number(result.id)) || Number(result.id)<=0)
      return respond({error:"invalid_database_response"},502);

    const confirm=await fetch(url+"/rest/v1/retro_news_posts?id=eq."+encodeURIComponent(String(result.id))
      +"&select=id,slug,status,published_at&limit=1",{
        headers:{"apikey":serviceRole,"Authorization":"Bearer "+serviceRole,"Accept":"application/json"},
        signal:AbortSignal.timeout(8000)
      });
    if(!confirm.ok)return respond({error:"publication_verification_failed"},502);
    const rows=await confirm.json();
    if(!Array.isArray(rows) || rows.length!==1 || rows[0].status!=="published"
       || rows[0].slug!==checked.article.slug)
      return respond({error:"publication_verification_failed"},502);

    return respond({ok:true,outcome:result.status,id:Number(result.id),
      slug:rows[0].slug,published_at:rows[0].published_at});
  }catch{
    return respond({error:"database_unreachable"},503);
  }
});
