
'use strict';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('review/unified-admin-20261108/index.html','utf8');
const match=html.match(/window\.supabase\.createClient\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
assert(match,'expected public Supabase config in original editor');
const [,base,key]=match;
assert(base==='https://aikxbgixitaaatkmcols.supabase.co' && key.startsWith('sb_publishable_'),
'Production URL or key mismatch');
const checks=[
 ['GET','/rest/v1/cms_editor_drafts?select=id&limit=1',null,'draft list'],
 ['GET','/rest/v1/cms_admin_audit?select=id&limit=1',null,'audit log'],
 ['POST','/rest/v1/rpc/cms_save_admin_draft',{p_section:'about',p_record_key:'main',p_document:{},p_expected_revision:0},'save'],
 ['POST','/rest/v1/rpc/cms_preview_admin_draft',{p_id:'00000000-0000-0000-0000-000000000001',p_expected_revision:1},'preview'],
 ['POST','/rest/v1/rpc/cms_publish_admin_draft',{p_id:'00000000-0000-0000-0000-000000000001',p_expected_revision:1},'publish'],
 ['POST','/rest/v1/rpc/retro_news_publish_draft_v2',{p_draft_id:-999999999,p_expected_revision:1},'news video publish']
];
for(const [method,route,data,label] of checks){
 const ctrl=new AbortController();const time=setTimeout(()=>ctrl.abort(),12000);
 try{
  const r=await fetch(base+route,{method,headers:{
    apikey:key,'Content-Type':'application/json',Accept:'application/json'
  },body:data?JSON.stringify(data):undefined,redirect:'error',signal:ctrl.signal});
  console.log(JSON.stringify({label,http_status:r.status,denied:[401,403].includes(r.status)}));
  if(![401,403].includes(r.status))throw Error('ANON_ACCESS_NOT_DENIED_'+label);
 }finally{clearTimeout(time)}
}
console.log('UNIFIED_ADMIN_ANON_ACCESS_DENIED_OK');
