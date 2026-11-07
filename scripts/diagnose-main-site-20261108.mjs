'use strict';
// Read-only external availability check: no credentials, no writes.
const targets=[
  ['MAIN /','https://retrophone-armenia.vercel.app/'],
  ['MAIN /news/','https://retrophone-armenia.vercel.app/news/'],
  ['MAIN /robots.txt','https://retrophone-armenia.vercel.app/robots.txt'],
  ['MAIN /api/retro-news?limit=1','https://retrophone-armenia.vercel.app/api/retro-news?limit=1'],
  ['OLDER PRODUCTION /','https://retrophone-armenia-lo2dvzqz4-harutmusheghyan-4829.vercel.app/']
];
let failures=0;
for(const [label,url] of targets){
 const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),13000);
 try{
  const r=await fetch(url,{redirect:'follow',signal:ctl.signal,
    headers:{'Accept':'text/html,application/json,*/*','User-Agent':'RetroPhoneMainSiteDiagnostic/1.0'}});
  const body=(await r.text()).slice(0,80000);
  const info={label,url,final_url:r.url,status:r.status,
    content_type:r.headers.get('content-type'),server:r.headers.get('server'),
    vercel_id:r.headers.get('x-vercel-id'),
    length:body.length,
    looks_like_site:/(?:RetroPhone|retrophone-armenia|<html)/i.test(body),
    body_start:body.slice(0,200).replace(/\s+/g,' ').replace(/[<>]/g,'_')};
  console.log(JSON.stringify(info));
  if(label==='MAIN /'&&(!r.ok||!/(?:<html\b|<!doctype\s+html)/i.test(body)))failures++;
 }catch(e){
  console.log(JSON.stringify({label,url,error:String(e?.message||e)}));
  if(label==='MAIN /')failures++;
 }finally{clearTimeout(t)}
}
console.log('MAIN_HOME_HTTP_RESULT',failures?'FAILED':'OK');
if(failures)process.exitCode=1;
