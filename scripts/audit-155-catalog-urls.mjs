// Read-only SEO crawl of the 155 catalog entries omitted from current sitemap.
// All URLs are fixed from an audited GitHub snapshot, not built from user input.
// Does not modify production, Supabase, sitemap, or source content.
import {readFile,writeFile,mkdir} from 'node:fs/promises';

const input=JSON.parse(await readFile(new URL('../seo-audit/missing-155.json',import.meta.url),'utf8'));
if(input.missing_count!==155||input.models?.length!==155){
  throw new Error('The 155-model snapshot was unexpectedly changed');
}
const allowedHost='retrophone-armenia-catalog.vercel.app';
function attr(tag,key) {
  // Only read attributes from fixed HTML link/meta tags; quote-safe parser.
  const normalized=tag.replace(/\s*=\s*/g,'=');
  const i=normalized.toLowerCase().indexOf(key.toLowerCase()+'=');
  if(i<0)return '';
  const raw=normalized.slice(i+key.length+1);
  const quote=raw.charAt(0);
  if(quote==='"'||quote==="'") {
    const end=raw.indexOf(quote,1);
    return end<0?'':raw.slice(1,end);
  }
  return raw.split(/[\s>]/)[0]||'';
}
function firstTag(html,tag,matcher) {
  return (html.match(new RegExp('<'+tag+'\\b[^>]*>','gi'))||[]).find(matcher)||'';
}
async function probe(entry){
  const url=new URL(entry.url);
  if(url.protocol!=='https:'||url.hostname!==allowedHost||!url.pathname.startsWith('/phones/'))
    throw new Error('Unexpected external URL in audit input');
  const signal=AbortSignal.timeout(12000);
  const response=await fetch(url,{redirect:'follow',signal,headers:{'user-agent':'RetroPhoneSEOAudit/1.0 (+GitHub Actions read-only)'}});
  const body=response.ok?await response.text():'';
  const canonicalTag=firstTag(body,'link',t=>attr(t,'rel').toLowerCase()==='canonical');
  const canonical=attr(canonicalTag,'href');
  const robotsTag=firstTag(body,'meta',t=>attr(t,'name').toLowerCase()==='robots');
  const robots=attr(robotsTag,'content');
  const xRobots=response.headers.get('x-robots-tag')||'';
  const noindex=/\bnoindex\b/i.test(robots+' '+xRobots);
  const title=body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'';
  let state='indexable';
  if(response.status!==200)state='http_error';
  else if(noindex)state='noindex';
  else if(canonical!==entry.url)state='canonical_conflict';
  else if(!title.trim())state='missing_title';
  return {...entry,status:response.status,robots,x_robots_tag:xRobots,canonical,title:title.slice(0,180),state};
}
const results=new Array(input.models.length);
let cursor=0;
async function worker(){
  while(cursor<input.models.length){
    const i=cursor++, item=input.models[i];
    try{results[i]=await probe(item);}
    catch(e){results[i]={...item,status:null,robots:'',canonical:'',title:'',state:'fetch_error',error:String(e).slice(0,170)};}
  }
}
await Promise.all(Array.from({length:5},worker));
const totals={};const brands={};
for(const r of results) {
  totals[r.state]=(totals[r.state]||0)+1;
  brands[r.brand]??={indexable:0,noindex:0,other:0};
  const name=r.state==='indexable'?'indexable':r.state==='noindex'?'noindex':'other';
  brands[r.brand][name]++;
}
const extraXml=await readFile(new URL('../catalog-proxy/sitemap-additions.xml',import.meta.url),'utf8');
const extraUrls=[...extraXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
const confirmedIndexable=new Set(results.filter(r=>r.state==='indexable').map(r=>r.url));
const extraInvalid=extraUrls.filter(u=>!confirmedIndexable.has(u));
await mkdir('seo-audit/results',{recursive:true});
const stamp=new Date().toISOString();
await writeFile('seo-audit/results/live-url-audit.json',JSON.stringify({checked_at:stamp,total:results.length,totals,brands,extra_urls:extraUrls,extra_invalid:extraInvalid,results},null,2)+'\n');
const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const rows=['id,brand,model,status,robots,canonical,state,url'];
for(const r of results)rows.push([r.id,r.brand,quote(r.model),r.status??'',quote(r.robots),quote(r.canonical),r.state,r.url].join(','));
await writeFile('seo-audit/results/live-url-audit.csv',rows.join('\n')+'\n');
const lines=['# Read-only crawl of 155 missing RetroPhone catalog URLs','',`Checked: ${stamp}`,'',
  ...Object.entries(totals).map(([key,count])=>'- '+key+': '+count),'',
  'Supplemental sitemap candidates no longer indexable: '+extraInvalid.length,'',
  'These results are a technical indexing-signal audit, NOT a Google index coverage report.',
  'Indexable means HTTP 200, no noindex, self canonical, nonempty title. Verify content quality before sitemap inclusion.'];
await writeFile('seo-audit/results/live-url-summary.md',lines.join('\n')+'\n');
console.log('SEO_155_CHECK_COMPLETED '+JSON.stringify({total:results.length,totals,brands}));
for(const r of results) console.log('SEO_ROW '+JSON.stringify({id:r.id,brand:r.brand,model:r.model,status:r.status,state:r.state}));
if(process.env.GITHUB_STEP_SUMMARY)
  await writeFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n',{flag:'a'});
if((totals.fetch_error||0)>0)console.warn('SEO_AUDIT_INCOMPLETE: fetch failures require retry before final decision');

if(extraInvalid.length){console.error('SEO_EXTRA_SITEMAP_STALE '+JSON.stringify(extraInvalid));process.exitCode=1;}
