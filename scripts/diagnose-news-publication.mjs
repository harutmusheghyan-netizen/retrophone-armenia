#!/usr/bin/env node
// Read-only health check: never publishes, deletes, or changes data.
const base = process.env.NEWS_SITE_URL || 'https://retrophone-armenia.vercel.app';
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Yerevan',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const errors = [];
for(const path of ['/api/retro-news?limit=100','/news/','/news/archive/']){
  try {
    const r=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
    const body=await r.text();
    if(!r.ok) errors.push(path+': HTTP '+r.status);
    if(path.startsWith('/api/')){
      let data;try{data=JSON.parse(body)}catch{throw Error('invalid JSON')}
      const posts=Array.isArray(data)?data:['posts','data','items','results'].map(k=>data?.[k]).find(Array.isArray);
      if(!posts) throw Error('API posts array not found');
      const todays=posts.filter(p=>p.status==='published' && p.published_at && new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Yerevan',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(p.published_at))===today);
      console.log(JSON.stringify({day_yerevan:today,visible_today:todays.length,latest_slug:posts[0]?.slug||null}));
      if(todays.length!==3) errors.push('API has '+todays.length+' of 3 news today; requires publisher investigation');
    }
  } catch(e){errors.push(path+': '+String(e.message||e))}
}
if(errors.length){console.error(JSON.stringify({status:'FAIL',errors},null,2));process.exitCode=1}
else console.log('PASS: three published news are visible in API; HTML endpoints reachable (visual rendering not verified)');
