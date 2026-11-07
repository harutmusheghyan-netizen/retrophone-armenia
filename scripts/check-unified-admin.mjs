
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
const old=fs.readFileSync('review/mobile-admin-20261108/index.html','utf8');
const src=(html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)||[])[1];
assert(src,'old news editor inline JS missing');
new vm.Script(src,{filename:'news-original-script.js'});
new vm.Script(js,{filename:'admin-unified.js'});
for(const section of ['news','catalog','brand','about','homepage'])
 assert(html.includes('data-cms-tab="'+section+'"'),'menu missing: '+section);
for(const id of ['cmsFields','cmsInventoryBox','cmsPreview','cmsSave','cmsPublish','cmsModal'])
 assert(html.includes('id="'+id+'"'),'form UI missing: '+id);
for(const rpc of ['cms_save_admin_draft','cms_preview_admin_draft','cms_publish_admin_draft'])
 assert(js.includes(rpc),'RPC missing: '+rpc);
assert(html.includes("retro_news_publish_draft_v2"),'news video publisher missing');
assert(html.includes('id="video_url"'),'news video input missing');
assert(html.includes('id="video_caption_hy"'),'Armenian video caption missing');
assert(js.includes('cms_preview_current_revision')===false,'client is not allowed to fake server validation');
assert(!/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|BEGIN PRIVATE KEY/i.test(html),'private secret in public HTML');
assert(old.includes('RetroPhone admin mobile-only usability patch'),'mobile #1 baseline lost');
assert(!/\\(pointer:coarse\\)/.test(html),'touch pointer must NOT force mobile in desktop browser mode');
assert(/@media\\s*\\(max-width:850px\\)/.test(html),'mobile breakpoint missing');
console.log('UNIFIED_ADMIN_SECURITY_STATIC_OK: five tabs, guarded RPC, video, original session login');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chrome not installed');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'retrophone-unified-'));
try{
 let mock=html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js"><\/script>\s*<script>[\s\S]*?<\/script>/,
 '<script>document.getElementById("workspace").classList.remove("hidden");</script>');
 mock=mock.replace('<script src="/admin-unified.js" defer></script>',
 '<script src="file://'+path.resolve(root+'/admin-unified.js')+'" defer></script>');
 mock=mock.replace('</body></html>',
 '<script>window.addEventListener("DOMContentLoaded",()=>{'+
 'document.getElementById("cmsPanel").classList.remove("hidden");'+
 'document.getElementById("newsArea").classList.add("hidden");'+
 'const e=document.querySelector(".cms-grid");'+
 'const c=getComputedStyle(e).gridTemplateColumns.trim().split(/\\s+/);'+
 'document.documentElement.dataset.cmsColumns=String(c.length);'+
 'document.documentElement.dataset.cmsTabs=String(document.querySelectorAll("[data-cms-tab]").length);'+
 '});</script></body></html>');
 fs.writeFileSync(path.join(tmp,'index.html'),mock);
 for(const [width,expectedCols] of [[390,1],[850,1],[980,2],[1300,2]]) {
  const dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu',
    '--disable-dev-shm-usage','--allow-file-access-from-files','--no-first-run',
    '--virtual-time-budget=800','--window-size='+width+',900','--dump-dom',
    'file://'+path.join(tmp,'index.html')],
    {encoding:'utf8',timeout:25000,stdio:['ignore','pipe','ignore']});
  const tabs=Number(dom.match(/data-cms-tabs="(\d+)"/)?.[1]||0);
  const cols=Number(dom.match(/data-cms-columns="(\d+)"/)?.[1]||0);
  assert.equal(tabs,5,'tab count wrong at '+width);
  assert.equal(cols,expectedCols,'column layout wrong at '+width);
  console.log(JSON.stringify({width,expectedCols,observedColumns:cols,tabs}));
 }
 console.log('UNIFIED_ADMIN_BROWSER_LAYOUT_OK');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
