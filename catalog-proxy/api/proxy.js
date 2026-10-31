// RetroPhone Armenia catalog proxy — source-verified RU/HY/EN pages.
// This function preserves the pre-existing layout, CSS, image licenses and catalog structure.
// Only entries from public.agent_published_model_editorials (published_at IS NOT NULL)
// can replace historical copy; archive drafts remain unverified and are never promoted.
const ORIGIN=process.env.RETRO_ORIGIN||"https://retrophone-armenia-catalog-2ww1duy3s-harutmusheghyan-4829.vercel.app";
const API="https://aikxbgixitaaatkmcols.supabase.co/rest/v1/agent_published_model_editorials";
const KEY="sb_publishable_PvxphKmdiZKPMGD0BbPBuw_nS2cKRJt"; // public/anon, NOT service_role
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const labels={
 ru:{heading:"Проверенная история модели",year:"Год выпуска",sources:"Источники",stock:"Наличие в продаже уточняется отдельно."},
 hy:{heading:"Մոդելի ստուգված պատմությունը",year:"Թողարկման տարեթիվը",sources:"Աղբյուրներ",stock:"Վաճառքում առկայությունը հաստատվում է առանձին։"},
 en:{heading:"Verified model history",year:"Release year",sources:"Sources",stock:"Availability for sale is confirmed separately."}
};
async function getEditorial(brand,model){
 try{
  const q=new URL(API);
  q.searchParams.set("select","brand,model_name,release_year,description_ru,description_hy,description_en,verified_sources,published_at");
  q.searchParams.set("brand","ilike."+brand);
  q.searchParams.set("model_name","ilike."+model);
  q.searchParams.set("published_at","not.is.null");
  q.searchParams.set("limit","1");
  const r=await fetch(q,{headers:{apikey:KEY,Accept:"application/json"},signal:AbortSignal.timeout(6000),cache:"no-store"});
  if(!r.ok)return null;
  const x=await r.json(),a=x?.[0];
  return a&&a.published_at&&a.model_name.toLowerCase()===model.toLowerCase()
    &&a.brand.toLowerCase()===brand.toLowerCase()?a:null;
 }catch{return null}
}
function localized(html,data,l){
 const text=data["description_"+l],L=labels[l];
 if(typeof text!=="string"||text.trim().length<160)return html;
 const old=/<section><h2>История модели<\/h2>[\s\S]*?<\/section>/i;
 if(!old.test(html))return html;
 let links="";
 for(const s of (Array.isArray(data.verified_sources)?data.verified_sources:[]).slice(0,12)){
  try{
   const u=new URL(s.url);
   if(u.protocol==="https:")
    links+='<li><a target="_blank" rel="noopener noreferrer" href="'+esc(u.href)+'">'+esc(s.title||s.kind||u.hostname)+'</a></li>';
  }catch{}
 }
 const sect='<section data-rp-verified-history="true"><h2>'+esc(L.heading)
  +'</h2><p style="white-space:pre-line">'+esc(text)
  +'</p><p class="muted">'+esc(L.year)+': '+esc(data.release_year)+'</p>'
  +(links?'<details><summary>'+esc(L.sources)+'</summary><ul>'+links+'</ul></details>':"")
  +'<p class="muted">'+esc(L.stock)+'</p></section>';
 html=html.replace(old,sect).replace(/<html\b([^>]*)>/i,(_,x)=>'<html'+x.replace(/\s+lang=["'][^"']*["']/i,"")+' lang="'+l+'" data-rp-verified="true">');
 const title=esc(data.brand+" "+data.model_name+" — "+L.heading+" | RetroPhone Armenia"),excerpt=esc(text.slice(0,155));
 html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+title+'</title>')
  .replace(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="'+excerpt+'">')
  .replace(/<meta property="og:title" content="[^"]*">/i,'<meta property="og:title" content="'+title+'">')
  .replace(/<meta property="og:description" content="[^"]*">/i,'<meta property="og:description" content="'+excerpt+'">')
  .replace(/"inLanguage":"ru"/g,'"inLanguage":"'+l+'"');
 const base="https://retrophone-armenia-catalog.vercel.app/phones/"
   +encodeURIComponent(data.brand.toLowerCase())+"/"
   +encodeURIComponent(data.model_name.toLowerCase().replace(/\s+/g,"-"));
 const alternates=["ru","hy","en"].map(lang=>'<link rel="alternate" hreflang="'+lang+'" href="'+base+'?lang='+lang+'">').join("");
 return html.replace("</head>",alternates+"</head>");
}
export default async function handler(req,res){
 if(!["GET","HEAD"].includes(req.method)){res.status(405).end("Method Not Allowed");return}
 try{
  const incoming=new URL(req.url,"https://retrophone.example"),path=incoming.searchParams.get("path")||"";
  const target=new URL("/"+path.replace(/^\/+/,""),ORIGIN);
  incoming.searchParams.forEach((v,k)=>{if(k!=="path")target.searchParams.append(k,v)});
  const upstream=await fetch(target,{method:req.method,headers:{
   accept:req.headers.accept||"*/*","user-agent":"RetroPhone-Armenia-I18n-Proxy/2.0"},
   redirect:"follow",signal:AbortSignal.timeout(15000)});
  const type=upstream.headers.get("content-type")||"application/octet-stream";
  res.status(upstream.status).setHeader("Content-Type",type);
  res.setHeader("Cache-Control",type.includes("text/html")?"public, max-age=30":"public, max-age=300");
  if(req.method==="HEAD")return res.end();
  if(!type.includes("text/html"))return res.end(Buffer.from(await upstream.arrayBuffer()));
  let html=await upstream.text();
  const match=upstream.ok&&path.match(/^phones\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
  if(match){
   const data=await getEditorial(match[1],match[2].replace(/-/g," "));
   if(data)html=localized(html,data,labels[incoming.searchParams.get("lang")]?incoming.searchParams.get("lang"):"ru");
  }
  const inject='<script src="/retro-i18n.js" defer></script>';
  if(!html.includes('src="/retro-i18n.js"'))html=html.includes("</head>")?html.replace("</head>",inject+"</head>"):html+inject;
  return res.end(html);
 }catch{res.status(502).end("Catalog upstream unavailable")}
}