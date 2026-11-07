'use strict';
// Public, anonymous, read-only safety checks. Never send credentials or
// impersonate an administrator. The only POST requests target a nonexistent
// negative draft ID and MUST be rejected before any mutation.
const pageUrl = 'https://retrophone-armenia.vercel.app/admin/';
const response = await fetch(pageUrl, {redirect:'error',headers:{Accept:'text/html'}});
if(response.status!==200)throw Error('admin_html_not_200:'+response.status);
const html = await response.text();
if(!html.toLowerCase().includes('retrophone'))throw Error('admin_html_not_expected_site');
for(const needle of ['id="loginForm"','id="email"','id="pass"',
                     'id="preview"','id="publish"','id="recoverPassword"',
                     "retro_news_preview_draft","retro_news_publish_draft","signInWithPassword"]) {
 if(!html.includes(needle))throw Error('admin_control_missing:'+needle);
}
if(/(?:SUPABASE_SERVICE_ROLE_KEY|sb_secret_|BEGIN PRIVATE KEY)/i.test(html))
 throw Error('public_admin_contains_secret_indicators');
const match = html.match(/window\.supabase\.createClient\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
if(!match)throw Error('supabase_public_client_not_detected');
const base = new URL(match[1]);const publishable = match[2];
if(base.hostname!=='aikxbgixitaaatkmcols.supabase.co'||!publishable.startsWith('sb_publishable_'))
 throw Error('unexpected_supabase_target_or_public_key');
console.log('PASS public admin loads; login/recovery/preview/publish controls exist; secret indicators absent');
const checks=[
 {name:'anonymous draft list',method:'GET',path:'/rest/v1/retro_news_edit_drafts?select=id&limit=1'},
 {name:'anonymous preview RPC',method:'POST',path:'/rest/v1/rpc/retro_news_preview_draft',
  body:{p_draft_id:-999999999,p_expected_revision:0}},
 {name:'anonymous publish RPC',method:'POST',path:'/rest/v1/rpc/retro_news_publish_draft',
  body:{p_draft_id:-999999999,p_expected_revision:0}}
];
for(const test of checks) {
 const ctl = new AbortController();
 const timeout = setTimeout(()=>ctl.abort(),12000);
 try{
  const res=await fetch(new URL(test.path,base),{
   method:test.method,
   headers:{apikey:publishable,'Content-Type':'application/json','Accept':'application/json'},
   body:test.body?JSON.stringify(test.body):undefined,
   signal:ctl.signal,
   redirect:'error'
  });
  // No accidental public access to the endpoint, regardless of whether
  // rejection occurs in API authorization or database function grants.
  console.log(JSON.stringify({test:test.name,http_status:res.status,denied:res.status===401||res.status===403}));
  if(res.status!==401&&res.status!==403)
    throw Error('ANONYMOUS_ACCESS_NOT_CONCLUSIVELY_DENIED:'+test.name+':'+res.status);
 } finally {clearTimeout(timeout)}
}
const legacyUrl='https://retrophone-armenia-admin.vercel.app/';
const legacyResponse=await fetch(legacyUrl,{headers:{Accept:'text/html'},redirect:'error'});
const legacyHtml=await legacyResponse.text();
const recoveryAssessment={
  legacy_admin_http:legacyResponse.status,
  admin_html:/(?:<html\b|<!doctype\s+html)/i.test(legacyHtml),
  has_password_update_api:/\.updateUser\s*\(/.test(legacyHtml),
  has_password_recovery_handler:/PASSWORD_RECOVERY|type=['"]recovery|type\s*===?\s*['"]recovery/i.test(legacyHtml),
  has_recovery_form:/восстанов|парол|reset|recover|password/i.test(legacyHtml)
};
console.log('STANDALONE_ADMIN_RECOVERY_CHECK '+JSON.stringify(recoveryAssessment));
if(legacyResponse.status!==200||!recoveryAssessment.admin_html)
 throw Error('legacy_admin_unavailable');
console.log('ADMIN_ANONYMOUS_SECURITY_SMOKE_OK');
