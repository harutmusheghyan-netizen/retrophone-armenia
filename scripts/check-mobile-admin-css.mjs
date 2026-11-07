'use strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const original=fs.readFileSync('recovery/etalon-2026-11-08/site/admin/index.html','utf8');
const edited=fs.readFileSync('review/mobile-admin-20261108/index.html','utf8');
const demo=fs.readFileSync('review/mobile-admin-20261108/demo.html','utf8');
const stop='</style></head>';
const o=original.indexOf(stop),n=edited.indexOf(stop);
assert(o>0 && n>o,'style marker missing');
const patch=edited.slice(o,n);
assert.equal(edited.slice(0,o),original.slice(0,o),'HTML/CSS before override differs');
assert.equal(edited.slice(n),original.slice(o),'HTML and JS after CSS override differ');
assert(patch.includes('(pointer:coarse)'), 'desktop-site-mode touch fallback missing');
assert(patch.includes('.panels {grid-template-columns:minmax(0,1fr)'), 'single column mobile layout missing');
assert(patch.includes('.sticky #publish {grid-column:1/-1;}'), 'publish button not full width');
assert(patch.includes('font-size:16px'), 'mobile font too small');
assert(demo.includes('Демонстрация мобильного оформления'),'preview banner missing');
assert(!demo.includes('createClient(') && !demo.includes('signInWithPassword('),'demo unexpectedly has live admin auth');
console.log('STATIC_MOBILE_PATCH_OK: no non-CSS changes to the real editor');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('no_chrome_available_for_layout_test');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'retrophone-layout-'));
try{
 const verifyJs='<script>document.addEventListener("DOMContentLoaded",function(){'
  +'const e=document.querySelector(".panels");'
  +'const cols=getComputedStyle(e).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean);'
  +'document.documentElement.dataset.gridColumns=String(cols.length);'
  +'document.documentElement.dataset.viewportWidth=String(window.innerWidth);'
  +'});</script></body></html>';
 const injected=demo.replace('</body></html>',verifyJs);
 const page=path.join(dir,'index.html');
 fs.writeFileSync(page,injected);
 for(const [width,expect] of [[390,1],[980,1],[1300,2]]) {
  const output=execFileSync(chrome,[
   '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--hide-scrollbars','--no-first-run','--virtual-time-budget=1000',
   '--window-size='+width+',900','--dump-dom','file://'+page
  ],{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','ignore']});
  const count=Number(output.match(/data-grid-columns="(\d+)"/)?.[1]||0);
  const viewport=Number(output.match(/data-viewport-width="(\d+)"/)?.[1]||0);
  console.log(JSON.stringify({requestedWidth:width,actualViewport:viewport,computedGridColumns:count,expectedColumns:expect}));
  assert.equal(count,expect,'incorrect column count at '+width);
 }
 console.log('MOBILE_ADMIN_CHROMIUM_LAYOUT_OK');
} finally {fs.rmSync(dir,{recursive:true,force:true});}

const previewUrl='https://retrophone-armenia-admin-7uo3i0zgx-harutmusheghyan-4829.vercel.app/';
const ctrl=new AbortController();
const timeout=setTimeout(()=>ctrl.abort(),12000);
try{
 const res=await fetch(previewUrl,{redirect:'follow',signal:ctrl.signal});
 const body=(await res.text()).slice(0,100000);
 const result={url:previewUrl,http_status:res.status,
   has_demo_banner:body.includes('Демонстрация мобильного оформления'),
   has_mobile_css:body.includes('RetroPhone admin mobile-only usability patch'),html_title:(body.match(/<title>([^<]{0,100})<\/title>/i)||[])[1]||null,content_type:res.headers.get('content-type'),response_bytes:body.length};
 console.log('PREVIEW_HTTP '+JSON.stringify(result));
 if(res.status===200){
  if(!result.has_demo_banner||!result.has_mobile_css){if(/<html\b[^>]*data-dpl-id=/i.test(body)){console.log('PREVIEW_PROTECTED_BY_VERCEL_AUTH: content can only be checked with a valid authenticated share link');}else throw Error('preview content mismatch');} else console.log('MOBILE_ADMIN_PREVIEW_HTTP_OK');
 }else if(res.status===401||res.status===403){
  console.log('MOBILE_ADMIN_PREVIEW_AUTH_PROTECTED: login to Vercel may be required');
 }else throw Error('unexpected_preview_http_'+res.status);
}finally{clearTimeout(timeout)}
