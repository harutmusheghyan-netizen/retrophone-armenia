'use strict';
import assert from 'node:assert/strict';

const etalon='https://retrophone-admin-etalon.vercel.app';
const checks=[
  [etalon+'/', 'new-admin-home'],
  [etalon+'/admin-unified.js','new-admin-code'],
  ['https://retrophone-armenia.vercel.app/','original-public-home'],
  ['https://retrophone-armenia.vercel.app/admin/','original-admin-home'],
  ['https://retrophone-armenia-admin.vercel.app/','original-standalone-admin']
];
for(const [url,label] of checks){
  const ctl=new AbortController();
  const deadline=setTimeout(()=>ctl.abort(),16000);
  try{
    const res=await fetch(url,{signal:ctl.signal,redirect:'error',headers:{'Accept':'text/html,application/javascript,*/*'}});
    const body=await res.text();
    const valid=res.status===200 && (label==='new-admin-code'?
      body.includes('cms_preview_admin_draft')&&body.includes('cms_publish_admin_draft') :
      body.toLowerCase().includes('retrophone'));
    console.log(JSON.stringify({label,status:res.status,valid,bytes:body.length}));
    assert(valid,'Route '+label+' failed or returned protected login instead of app');
    if(label==='new-admin-home'){
      assert(body.includes('data-cms-tab="catalog"')&&body.includes('data-cms-tab="homepage"'),'Five section tabs missing');
      assert(body.includes('@media (max-width:850px)'),'Mobile mode breakpoint missing');
      assert(!body.includes('(pointer:coarse)'),'Touch-screen force-mobile regression');
    }
  }finally{clearTimeout(deadline)}
}
console.log('ADMIN_ETALON_LIVE_HTTP_OK');
