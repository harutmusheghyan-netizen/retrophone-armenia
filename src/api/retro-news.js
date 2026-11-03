'use strict';
const KEY="sb_publishable_PvxphKmdiZKPMGD0BbPBuw_nS2cKRJt";
const URL='https://aikxbgixitaaatkmcols.supabase.co/rest/v1/retro_news_posts';
module.exports=async function(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const n=Number(req.query?.limit||60),at=Number(req.query?.offset||0);
 if(!Number.isInteger(n)||n<1||n>100||!Number.isInteger(at)||at<0||at>25000)
 return res.status(400).json({error:'invalid_pagination'});
 const p=new URLSearchParams({select:'id,slug,title_ru,title_hy,title_en,excerpt_ru,excerpt_hy,excerpt_en,body_ru,body_hy,body_en,category,source_url,source_name,source_published_at,image_url,image_source_url,image_author,image_license,image_license_url,image_caption_ru,image_caption_hy,image_caption_en,extra_images,published_at',
 status:'eq.published',order:'published_at.desc,id.desc',limit:String(n),offset:String(at)});
 const slug=String(req.query?.slug||'');
 if(slug){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return res.status(400).json({error:'invalid_slug'});p.set('slug','eq.'+slug);p.set('offset','0')}
 const ac=new AbortController(),timeout=setTimeout(()=>ac.abort(),7500);
 try{const r=await fetch(URL+'?'+p,{headers:{apikey:KEY,Accept:'application/json'},signal:ac.signal});
 if(!r.ok)return res.status(503).json({error:'news_database_unavailable'¶»§q«^