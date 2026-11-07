'use strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const root='review/unified-admin-20261108';
const original=fs.readFileSync('recovery/etalon-2026-11-08/site/index.html','utf8');
const baseline=JSON.parse(fs.readFileSync(root+'/about-etalon-data.json','utf8'));
const match=original.match(/const ABOUT_I18N = (\{[^\n]+\});/);
assert(match,'Original approved About translations not found');
const exact=JSON.parse(match[1]);
assert.deepEqual({ru:baseline.ru,hy:baseline.hy,en:baseline.en},exact);
assert.equal(baseline.founder_photo.data_url,(original.match(/<img class="about-founder-photo" src="(data:image\/webp;base64,[A-Za-z0-9+/=]+)"/)||[])[1], 'Original photo must match the approved page');
for(const lang of ['ru','hy','en'])assert.equal(baseline.keys.filter(k=>exact[lang][k]?.trim()).length,29);
const html=fs.readFileSync(root+'/index.html','utf8');
const js=fs.readFileSync(root+'/admin-unified.js','utf8');
new vm.Script(js);
assert(js.includes('getOriginalAbout'),'Missing original content loader');
console.log('ABOUT_EXACT_ORIGINAL_29x3_LANGUAGES_OK');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chrome not installed');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'retro-about-'));
try {
 const stub=[
  'window.__aboutBaseline=__JSON__;',
  'window.__capturedCmsRpc=null;',
  'window.__retroAdminClient={',
  ' auth:{getUser:async()=>({data:{user:{id:"test"}},error:null})},',
  ' from:(table)=>({select(){return this},eq(){return this},',
  ' maybeSingle:async()=>({data:table==="admin_users"?{user_id:"test"}:null,error:null})}),',
  ' rpc:async(name,args)=>{window.__capturedCmsRpc={name,args};',
  ' return {data:{ok:true,id:"00000000-0000-0000-0000-000000000001",revision:1},error:null};}',
  '};',
  'window.fetch=async()=>({ok:true,json:async()=>window.__aboutBaseline});',
  'document.addEventListener("DOMContentLoaded",()=>document.getElementById("workspace").classList.remove("hidden"));'
 ].join('\n').replace('__JSON__',JSON.stringify(baseline).replace(/</g,'\\u003c'));
 const target=/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>\s*<script>[\s\S]*?<\/script>/;
 assert(target.test(html),'Cannot remove real Supabase auth for isolated browser test');
 let testPage=html.replace(target,'<script>'+stub+'</script>');
 testPage=testPage.replace('<script src="/admin-unified.js" defer></script>',
  '<script src="file://'+path.resolve(root+'/admin-unified.js')+'" defer></script>');
 const probe=[
  'window.addEventListener("load",()=>{',
  'document.querySelector("[data-cms-tab=about]").click();',
  'setTimeout(()=>{',
  'const b=window.__aboutBaseline;',
  'const n=document.querySelectorAll("[data-cms-field^=about_]").length;',
  'const matches=document.getElementById("cms_about_title_ru")?.value===b.ru.title',
  ' &&document.getElementById("cms_about_p1_hy")?.value===b.hy.p1',
  ' &&document.getElementById("cms_about_founder_en")?.value===b.en.founder;',
  'const pic=document.querySelector(".cms-about-original-photo");',
  'const photoOk=pic?.getAttribute("src")===b.founder_photo.data_url;',
  'document.documentElement.dataset.aboutPhoto=String(photoOk);',
  'document.documentElement.dataset.aboutLoaded=String(matches&&n===87);',
  'document.documentElement.dataset.aboutFields=String(n);',
  'if(matches){document.getElementById("cmsSave").click();',
  ' setTimeout(()=>{const call=window.__capturedCmsRpc;',
  ' const d=call?.args?.p_document||{};',
  ' const complete=call?.name==="cms_save_admin_draft" &&',
  ' Object.keys(d).filter(k=>k.startsWith("about_")).length===87 &&',
  ' d.title_ru===b.ru.title && d.body_hy.includes(b.hy.p3);',
  ' document.documentElement.dataset.aboutSave=String(complete);},250);}',
  '},350);',
  '});'
 ].join('\n');
 testPage=testPage.replace('</body></html>','<script>'+probe+'</script></body></html>');
 fs.writeFileSync(path.join(temp,'index.html'),testPage);
 const result=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--allow-file-access-from-files','--no-first-run',
  '--virtual-time-budget=2600','--window-size=390,860','--dump-dom',
  'file://'+path.join(temp,'index.html')],
  {encoding:'utf8',timeout:25000,stdio:['ignore','pipe','ignore']});
 const loaded=result.match(/data-about-loaded="([^"]+)"/)?.[1],
  saved=result.match(/data-about-save="([^"]+)"/)?.[1],
  count=result.match(/data-about-fields="([^"]+)"/)?.[1],
  photo=result.match(/data-about-photo="([^"]+)"/)?.[1];
 console.log(JSON.stringify({loaded,saved,count,photo}));
 assert.equal(loaded,'true','Prior approved About text is not visible in editor');
 assert.equal(saved,'true','About draft did not include all prior text');
 assert.equal(photo,'true','Original founder photo not visible in the editor preview');
 console.log('ABOUT_MOBILE_EDITOR_PREFILL_AND_DRAFT_OK');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
