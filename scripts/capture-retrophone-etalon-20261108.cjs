'use strict';
/**
 * Backup PUBLIC files from the exact, known-good Vercel deployment.
 * This is a rendered static reference, NOT an export of private environment
 * secrets, database data, third-party pictures, or Vercel function source.
 * Never publish this reference branch as the production site's source.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');

const PINNED='https://retrophone-armenia-lo2dvzqz4-harutmusheghyan-4829.vercel.app';
const PRODUCTION='https://retrophone-armenia.vercel.app';
const DEPLOYMENT_ID='dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu';
const OUT='recovery/etalon-2026-11-08';
const pages=[
 ['/', 'site/index.html','html',true],
 ['/news/','site/news/index.html','html',true],
 ['/news/archive/','site/news/archive/index.html','html',false],
 ['/sitemap/','site/sitemap/index.html','html',false],
 ['/robots.txt','site/robots.txt','text',true],
 ['/sitemap.xml','site/sitemap.xml','xml',false],
 ['/assets/retrophone-logo.avif','site/assets/retrophone-logo.avif','image',false],
];
for (const model of [
 '101','1110','1200','1600','1610','2010','2100','2110','2110i',
 '2140','2300','2323-classic','2330-classic','2600','2610'
]) {
 pages.push(['/nokia-'+model+'.html','site/nokia-'+model+'.html','html',false]);
}
function hash(buf){return createHash('sha256').update(buf).digest('hex')}
async function fetchRoute(base,route) {
 const u=new URL(route,base);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try {
  const r=await fetch(u,{signal:controller.signal,redirect:'error',headers:{
   'Accept':'text/html,application/xml,text/plain,image/avif,*/*',
   'User-Agent':'RetroPhone-Reference-Snapshot/1.0'
  }});
  if(new URL(r.url).hostname!==new URL(base).hostname)
    throw new Error('unexpected_origin');
  const body=Buffer.from(await r.arrayBuffer());
  if(body.length>4000000)throw new Error('unexpectedly_large_response');
  return {status:r.status,content_type:r.headers.get('content-type'),body};
 } finally{clearTimeout(timeout)}
}
const fileEntries=[],warnings=[],checklist=[];
let mainSourceHash=null;
for(const [route,file,kind,required] of pages){
 let reply;
 try {reply=await fetchRoute(PINNED,route)} catch(e) {
  if(required)throw new Error('required_reference_failed '+route+': '+String(e.message||e));
  warnings.push({route,error:String(e.message||e)});continue;
 }
 if(reply.status!==200){
  if(required)throw new Error('required_reference_http_'+reply.status+' '+route);
  warnings.push({route,status:reply.status});continue;
 }
 if(kind==='html'&&!/<(?:!doctype html|html\b)/i.test(reply.body.toString('utf8').slice(0,6000))){
  if(required)throw new Error('required_reference_not_html '+route);
  warnings.push({route,error:'unexpected_content_type'});continue;
 }
 const dst=path.join(OUT,file);
 await fs.mkdir(path.dirname(dst),{recursive:true});
 await fs.writeFile(dst,reply.body);
 const entry={route,file,bytes:reply.body.length,sha256:hash(reply.body),content_type:reply.content_type};
 fileEntries.push(entry);
 if(route==='/')mainSourceHash=entry.sha256;
 console.log('SAVED '+route+' '+entry.bytes+' bytes SHA256='+entry.sha256.slice(0,14));
}
if(!mainSourceHash)throw Error('fatal_reference_homepage_missing');
for(const route of ['/','/news/','/robots.txt','/api/retro-news?limit=1']){
 let r=await fetchRoute(PRODUCTION,route);
 const probe={url:PRODUCTION+route,http_status:r.status,content_type:r.content_type,bytes:r.body.length};
 if(route==='/') {
  probe.matches_pinned_homepage=hash(r.body)===mainSourceHash;
  if(!probe.matches_pinned_homepage)throw Error('production_homepage_differs_from_pinned_etalon');
 }
 if(r.status!==200)throw Error('production_route_http_'+r.status+':'+route);
 checklist.push(probe);
}
const report={
 title:'RetroPhone Armenia — immutable working site reference',
 reference_date:'2026-11-08',
 captured_at:new Date().toISOString(),
 production_url:PRODUCTION,
 source_deployment_id:DEPLOYMENT_ID,
 source_deployment_url:PINNED,
 frozen_reference:true,
 files:fileEntries,
 production_checks:checklist,
 warnings,
 scope:{
  included:'Rendered PUBLIC HTML pages, robots/sitemap and same-site logo as fetched from pinned deployment',
  excluded:'Original Vercel function source, private admin data, environment secrets, database dump, third-party images and hidden asset dependencies',
  safe_to_deploy_as_full_site:false
 },
 restore_instructions:'First prefer Vercel rollback to source_deployment_id; do NOT deploy this static reference in place of dynamic production code.'
};
await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(OUT,'README.md'),[
 '# RetroPhone Armenia — reference snapshot 2026-11-08',
 '',
 'This is a byte-for-byte backup of the public HTTP responses saved in site/.',
 '',
 '- **Pinned Vercel deployment:** '+DEPLOYMENT_ID,
 '- **Production URL:** '+PRODUCTION,
 '- **Captured at:** '+report.captured_at,
 '- **Files captured:** '+fileEntries.length,
 '- **Uncaptured optional routes:** '+warnings.length,
 '- **Production homepage matches pinned deployment:** yes',
 '',
 'For recovery, rollback Vercel to the pinned deployment ID before attempting any rebuild.',
 'The snapshot is public-static only, **not** an independently deployable full Vercel/Supabase application.',
 'Never delete the working deployment or overwrite the approved homepage/design.',
 '',
 'Checksums and exact routes are in manifest.json.',
 ''
].join('\n'));
console.log('REFERENCE_SNAPSHOT_OK files='+fileEntries.length+' warnings='+warnings.length);
