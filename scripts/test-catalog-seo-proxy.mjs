import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../catalog-proxy/api/proxy.js',import.meta.url),'utf8');
const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const base='https://retrophone-armenia-catalog.vercel.app/phones/nokia/1110';
const original='<html lang="ru"><head><title>Nokia 1110</title>'
 +'<meta name="description" content="Original text">'
 +'<link rel="canonical" href="'+base+'"></head>'
 +'<body><section><h2>История модели</h2><p>Old Russian history</p></section></body></html>';
const fixture={
 brand:'nokia',model_name:'1110',release_year:2005,
 description_ru:'Оригинальная русская история телефона. '.repeat(8),
 description_hy:'Nokia 1110 հեռախոսի պատմությունն ու բնութագրերը։ '.repeat(9),
 description_en:'Original English account of the Nokia 1110 mobile phone. '.repeat(6),
 verified_sources:[],published_at:'2026-11-01T00:00:00Z'
};
async function run(lang,data=fixture){
  globalThis.fetch=async u=>{
    if(String(u).startsWith('https://aikxbgixitaaatkmcols.supabase.co/'))
      return new Response(JSON.stringify(data?[data]:[]),{status:200,headers:{'Content-Type':'application/json'}});
    return new Response(original,{status:200,headers:{'Content-Type':'text/html'}});
  };
  const res={code:0,headers:{},text:'',status(n){this.code=n;return this},
    setHeader(n,v){this.headers[n]=v;return this},end(s=''){this.text=String(s);return this}};
  await handler({method:'GET',url:'/?path=phones/nokia/1110&lang='+lang,headers:{accept:'text/html'}},res);
  assert.equal(res.code,200);
  return res.text;
}
for(const lang of ['ru','hy','en']){
  const html=await run(lang);
  const own=lang==='ru'?base:base+'?lang='+lang;
  assert.ok(html.includes('<link rel="canonical" href="'+own+'">'),lang+' self canonical');
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,lang+' only one canonical');
  for(const [l,url] of [['ru',base],['hy',base+'?lang=hy'],['en',base+'?lang=en'],['x-default',base]]){
    assert.ok(html.includes('<link rel="alternate" hreflang="'+l+'" href="'+url+'">'),
      lang+' alternate '+l);
  }
  assert.equal((html.match(/hreflang=/g)||[]).length,4,lang+' reciprocal exactly four');
}
const incomplete=await run('hy',{...fixture,description_en:'too short'});
assert.ok(incomplete.includes('<link rel="canonical" href="'+base+'?lang=hy">'));
assert.equal((incomplete.match(/hreflang=/g)||[]).length,0,'incomplete translations must not generate language group');
const fallback=await run('hy',null);
assert.ok(fallback.includes('<link rel="canonical" href="'+base+'">'),
  'no vetted editorial: preserve existing source canonical');
assert.equal((fallback.match(/hreflang=/g)||[]).length,0);
console.log('CATALOG_SEO_LANG_CANONICAL_HREFLANG_OK: 3 locales, x-default, incomplete & fallback guards');
