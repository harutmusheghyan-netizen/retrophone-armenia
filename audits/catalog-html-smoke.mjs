// Read-only HTML smoke test for RetroPhone Armenia (RU/HY/EN).
// CATALOG_BASE=https://preview.example CATALOG_PATHS=/phones/nokia/2010,/phones/nokia/6555 node audits/catalog-html-smoke.mjs
// Tests server-delivered HTML; JavaScript-rendered text needs a browser test separately.
const base=process.env.CATALOG_BASE;
if(!base||!/^https:\/\//i.test(base)){console.error('CATALOG_BASE must be an HTTPS Preview URL');process.exit(2)}
const paths=(process.env.CATALOG_PATHS||'/phones/nokia/2010').split(',').map(x=>x.trim()).filter(Boolean);
const strict=process.env.STRICT_LANGUAGE==='1';
let failures=0;
for(const path of paths){
 for(const lang of ['ru','hy','en']){
  const url=new URL(path,base);url.searchParams.set('lang',lang);
  try{
   const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000)});
   const html=await response.text();
   const htmlLang=html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1]||null;
   const body=html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]||'';
   // Ignore script, styles, HTML comments and tags; inspect server-visible body copy only.
   const visible=body.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/gi,' ').replace(/\s+/g,' ').trim();
   const cyrillicSamples=[...visible.matchAll(/[А-Яа-яЁё]{5,}/g)].slice(0,8).map(m=>m[0]);
   const armenian=/[\u0531-\u058F]/.test(visible);
   const verifiedHistoryMarker=html.includes('data-rp-verified-history="true"');
   const serverLocalizedMarker=html.includes('data-rp-serverlocalized="true"');
   const languageLeak=(lang!=='ru'&&cyrillicSamples.length>0);
   const ok=response.ok&&htmlLang===lang&&(!strict||(!languageLeak&&(lang!=='hy'||armenian)));
   if(!ok)failures++;
   console.log(JSON.stringify({url:url.href,status:response.status,htmlLang,verifiedHistoryMarker,serverLocalizedMarker,visibleChars:visible.length,cyrillicSamples,armenian,languageLeak,strict,ok}));
  }catch(e){failures++;console.log(JSON.stringify({url:url.href,error:String(e),ok:false}))}
 }
}
if(failures)process.exitCode=1;
