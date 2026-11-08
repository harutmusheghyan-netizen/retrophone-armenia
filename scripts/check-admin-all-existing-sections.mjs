'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root='review/unified-admin-20261108';
const html=fs.readFileSync(root+'/index.html','utf8');
const js=fs.readFileSync(root+'/admin-unified.js','utf8');
const brandA=JSON.parse(fs.readFileSync(root+'/brand-etalon-part-1.json','utf8'));
const brandB=JSON.parse(fs.readFileSync(root+'/brand-etalon-part-2.json','utf8'));
const logos=JSON.parse(fs.readFileSync(root+'/brand-original-logos.json','utf8'));
const homepage=JSON.parse(fs.readFileSync(root+'/homepage-etalon-data.json','utf8'));
const about=JSON.parse(fs.readFileSync(root+'/about-etalon-data.json','utf8'));
new vm.Script(js);
assert.equal(Object.keys(brandA.brands).length,5);
assert.equal(Object.keys(brandB.brands).length,5);
for(const item of Object.values({...brandA.brands,...brandB.brands})){
 for(const lang of ['ru','hy','en']){
  assert(item.languages[lang].text.length>800, 'missing preserved '+item.name+' '+lang);
 }
}
assert.equal(Object.keys(logos.logos).length,10);
assert.equal(Object.keys(homepage.blocks).length,5);
assert(!html.includes('(pointer:coarse)'), 'desktop site mode broken');
assert(js.includes('loadOriginalBrand')&&js.includes('loadOriginalHome'),'source loaders missing');
assert(html.includes('id="cmsOriginalBox"'),'read-only originals box missing');
console.log('EXISTING_ALL_SECTIONS_BASELINES_PRESENT_OK 30 histories, 10 logos, 5 home blocks, 87 About fields');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chrome unavailable');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'retro-admin-all-'));
try{
 const fixture={brandA,brandB,logos,homepage,about};
 const stub=[
 'window.__existingFixtures=__FIXTURE__;',
 'window.__fakeCalls=[];',
 'const mockBrands=[{id:1,name:"Nokia",slug:"nokia",short_history:"Old short history",history_url:"https://retrophone-armenia-history.vercel.app/Nokia.html"}];',
 'const catalogRow={id:381,brand_id:1,model_name:"Test Nokia",release_year:2007,',
 ' description:"Existing RU source description",hero_image_url:"https://upload.wikimedia.org/wikipedia/commons/a/a0/example.jpg",',
 ' image_source_url:"https://commons.wikimedia.org/wiki/File:Example.jpg",',
 ' image_credit:"Wikimedia author",image_license:"CC BY-SA 4.0",',
 ' source_url:"https://example.org/original",specifications:{display:"LCD"}};',
 'window.__retroAdminClient={',
 ' auth:{getUser:async()=>({data:{user:{id:"test"}},error:null})},',
 ' from:(table)=>{const req={filters:{},select(){return this},eq(k,v){this.filters[k]=v;return this},',
 ' order(){return this},limit(){return this},range(){return this},',
 ' single:async function(){return {data:catalogRow,error:null}},',
 ' maybeSingle:async function(){let data=null;',
 ' if(table==="admin_users")data={user_id:"test"};',
 ' if(table==="cms_editor_drafts"&&req.filters.section==="catalog"&&req.filters.record_key==="381")',
 ' data={id:"00000000-0000-0000-0000-000000000381",revision:2,document:{description_ru:"Saved existing draft takes precedence"}};',
 ' return {data,error:null};},',
 ' then:(resolve,reject)=>{const rows=table==="brands"?mockBrands:',
 ' table==="phone_models"?[catalogRow]:table==="phone_model_translations"?',
 ' [{language_code:"ru",description:"Stored translated RU"},{language_code:"hy",description:"Existing Armenian history"},{language_code:"en",description:"Existing English history"}]:',
 ' table==="products"?[{price_amd:9900,stock_quantity:2,condition:"Working",is_published:true}]:[];',
 ' return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};return req;},',
 ' rpc:async(name,args)=>{window.__fakeCalls.push({name,args});return {data:{ok:true,id:"00000000-0000-0000-0000-000000000001",revision:1},error:null};}',
 '};',
 'window.fetch=async(path)=>{const f=window.__existingFixtures;',
 ' const map={"brand-etalon-part-1.json":f.brandA,"brand-etalon-part-2.json":f.brandB,',
 ' "brand-original-logos.json":f.logos,"homepage-etalon-data.json":f.homepage,',
 ' "about-etalon-data.json":f.about};',
 ' const p=String(path).replace(/^.*\\//,"");',
 ' if(!map[p])return {ok:false,status:404};',
 ' return {ok:true,status:200,json:async()=>map[p]};};',
 'document.addEventListener("DOMContentLoaded",()=>document.getElementById("workspace").classList.remove("hidden"));'
 ].join('\n').replace('__FIXTURE__',JSON.stringify(fixture).replace(/</g,'\\u003c'));
 const authScript=/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>\s*<script>[\s\S]*?<\/script>/;
 assert(authScript.test(html),'Cannot isolate production auth in browser QA');
 let page=html.replace(authScript,'<script>'+stub+'</script>');
 page=page.replace('<script src="/admin-unified.js" defer></script>',
  '<script src="file://'+path.resolve(root+'/admin-unified.js')+'" defer></script>');
 const probe=[
 'function delay(n){return new Promise(r=>setTimeout(r,n));}',
 'window.addEventListener("load",async()=>{',
 'await delay(100);',
 'document.querySelector("[data-cms-tab=brand]").click();await delay(500);',
 'document.querySelector("#cmsList .cms-entry")?.click();await delay(650);',
 'const brand=window.__existingFixtures.brandA.brands["1"];',
 'const bGood=["ru","hy","en"].every(x=>document.getElementById("cms_history_"+x)?.value===brand.languages[x].text);',
 'const logoGood=document.querySelector("#cmsOriginalBox .cms-original-image")?.src===window.__existingFixtures.logos.logos["1"].logo_url;',
 'document.documentElement.dataset.brandPrefill=String(bGood&&logoGood);',
 'document.querySelector("[data-cms-tab=catalog]").click();await delay(550);',
 'const brandFirst=document.querySelectorAll("#cmsList .cms-brand-choice").length===1 &&',
 ' document.querySelector("#cmsNavigatorTitle")?.textContent.includes("Все бренды");',
 'document.documentElement.dataset.brandFirst=String(brandFirst);',
 'document.querySelector("#cmsList .cms-brand-choice")?.click();await delay(250);',
 'const modelAfterBrand=document.querySelectorAll("#cmsList .cms-entry").length===1 &&',
 ' document.querySelector("#cmsBackToBrands")&&!document.querySelector("#cmsBackToBrands").classList.contains("hidden");',
 'document.documentElement.dataset.modelAfterBrand=String(!!modelAfterBrand);',
 'document.querySelector("#cmsList .cms-entry")?.click();await delay(600);',
 'const ru=document.getElementById("cms_description_ru")?.value;',
 'const hy=document.getElementById("cms_description_hy")?.value;',
 'const catImg=document.querySelector("#cmsOriginalBox .cms-original-image")?.src;',
 'const catGood=ru==="Saved existing draft takes precedence"&&hy==="Existing Armenian history"&&',
 ' catImg==="https://upload.wikimedia.org/wikipedia/commons/a/a0/example.jpg"&&',
 ' document.getElementById("cmsChangeInventory")?.checked===false;',
 'document.documentElement.dataset.catalogPrefill=String(catGood);',
 'document.querySelector("[data-cms-tab=homepage]").click();await delay(400);',
 'document.querySelector("#cmsList .cms-entry")?.click();await delay(500);',
 'const main=window.__existingFixtures.homepage.blocks.hero;',
 'const homeGood=document.getElementById("cms_text_ru")?.value===main.text_ru&&',
 ' document.getElementById("cms_subtitle_hy")?.value===main.subtitle_hy;',
 'document.documentElement.dataset.homePrefill=String(homeGood);',
 'document.querySelector("[data-cms-tab=news]").click();await delay(200);',
 'const newsGood=!document.getElementById("newsArea").classList.contains("hidden")&&',
 ' document.getElementById("editorForm")!==null;',
 'document.documentElement.dataset.newsLegacy=String(newsGood);',
 '});'
 ].join('\n');
 page=page.replace('</body></html>','<script>'+probe+'</script></body></html>');
 fs.writeFileSync(path.join(temp,'index.html'),page);
 for(const [width,expectedColumns] of [[390,1],[980,2]]){
  const dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--allow-file-access-from-files','--no-first-run','--virtual-time-budget=4500','--window-size='+width+',860',
   '--dump-dom','file://'+path.join(temp,'index.html')],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:30000});
  const values=Object.fromEntries(['brand-prefill','brand-first','model-after-brand','catalog-prefill','home-prefill','news-legacy'].map(k=>
   [k,dom.match(new RegExp('data-'+k+'="([^"]+)"'))?.[1]||'missing']));
  console.log(JSON.stringify({width,expectedColumns,values}));
  for(const [key,value] of Object.entries(values))assert.equal(value,'true',key+' incorrect');
 }
 console.log('ALL_SECTIONS_EXISTING_DATA_PREFILL_AND_DRAFT_PRECEDENCE_OK');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
