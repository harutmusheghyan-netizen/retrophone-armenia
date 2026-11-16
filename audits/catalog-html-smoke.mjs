// Read-only smoke test for RetroPhone Armenia catalog translations.
// Usage: CATALOG_BASE=https://... node audits/catalog-html-smoke.mjs
// No database writes, no secrets, no changes to page content.
const base=process.env.CATALOG_BASE;
if(!base || !/^https:\/\//.test(base)){console.error('Set CATALOG_BASE to an HTTPS Preview URL');process.exit(2)}
const paths=(process.env.CATALOG_PATHS||'/phones/nokia/2010').split(',').map(s=>s.trim()).filter(Boolean);
let failures=0;
for(const path of paths){
 for(const lang of ['ru','hy','en']){
  const url=new URL(path,base);url.searchParams.set('lang',lang);
  try{
   const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000)});
   const html=await response.text();
   const htmlLang=html.match(/<html[^>]*\blang=["']([^"']+)/i)?.[1]||'missing';
   const marker=html.includes('data-rp-verified-history="true"');
   const pageText=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
   const hasCyrillic=/[А-Яа-яЁё]{5,}/.test(pageText);
   const ok=response.ok&&htmlLang===lang;
   if(!ok)failures++;
   console.log(JSON.stringify({url:url.href,status:response.status,htmlLang,verifiedHistoryMarker:marker,containsCyrillic:hasCyrillic,ok}));
  }catch(e){failures++;console.log(JSON.stringify({url:url.href,error:String(e),ok:false}))}
 }
}
if(failures)process.exitCode=1;
