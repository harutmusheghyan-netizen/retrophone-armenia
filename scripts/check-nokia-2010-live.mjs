'use strict';
// Read-only, no credentials. Fails closed unless all three published HTML pages work.
const root = process.env.CATALOG_BASE_URL || 'https://retrophone-armenia-catalog.vercel.app';
const expected = {
  ru: 'Проверенная история модели',
  hy: 'Մոդելի ստուգված պատմությունը',
  en: 'Verified model history'
};
let failures=0;
for (const [lang, heading] of Object.entries(expected)) {
  const url=new URL('/phones/nokia/2010',root);
  url.searchParams.set('lang',lang);
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),12000);
  try {
    const res=await fetch(url,{
      headers:{Accept:'text/html','User-Agent':'RetroPhoneCatalogSmoke/1.0'},
      redirect:'follow',
      signal:controller.signal
    });
    const body=(await res.text()).slice(0,450000);
    const checks={
      status_200:res.status===200,
      html:/(?:<!doctype\s+html|<html\b)/i.test(body),
      correct_lang:(body.match(/<html\b[^>]*>/i)||[''])[0].includes('lang="'+lang+'"') || (body.match(/<html\b[^>]*>/i)||[''])[0].includes("lang='"+lang+"'"),
      verified_section:body.includes('data-rp-verified-history="true"'),
      localized_heading:body.includes(heading),
      model_identity:/Nokia\s+2010/i.test(body),
      source_citation:/nokiamuseum\.net|mobilephonemuseum\.com/i.test(body)
    };
    const ok=Object.values(checks).every(Boolean);
    console.log(JSON.stringify({url:url.toString(),status:res.status,checks,ok}));
    if(!ok)failures++;
  } catch(e) {
    console.error(JSON.stringify({url:url.toString(),error:String(e.message||e)}));
    failures++;
  } finally {clearTimeout(t)}
}
if(failures){
  console.error('NOT VERIFIED: '+failures+' localized page(s) failed; mass publication remains disabled.');
  process.exitCode=1;
} else console.log('VERIFIED: Nokia 2010 live RU/HY/EN pages. Mass publishing still requires explicit protected bulk rollout.');
