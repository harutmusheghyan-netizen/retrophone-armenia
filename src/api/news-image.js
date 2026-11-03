'use strict';
const TOPICS=Object.freeze({
battery:'lithium ion battery',imac:'Apple iMac computer',macbook:'Apple MacBook laptop',
iphone:'Apple iPhone smartphone',apple:'Apple computer',geely:'Geely Coolray car',
tesla:'Tesla electric car',bmw:'BMW automobile',mercedes:'Mercedes Benz car',
samsung:'Samsung Galaxy smartphone',xiaomi:'Xiaomi smartphone',huawei:'Huawei smartphone',
graphics:'Nvidia graphics card',processor:'computer processor chip',gaming:'PlayStation console',
car:'electric car',smartphone:'mobile smartphone',laptop:'laptop computer',
rocket:'space rocket',servers:'computer server racks'});
const safeUrl=(raw,hosts)=>{try{const u=new URL(raw);return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:null}catch{return null}};
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|nbsp|quot|lt|gt|#39);/gi,' ').replace(/\s+/g,' ').trim().slice(0,120);
const allowedLicense=s=>/^(?:CC0|CC\s*0|CC\s*BY(?:-SA)?\s*\d|Public domain|PD(?:-|$))/i.test(s);
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
 if(req.method!=='GET')return res.status(405).json({found:false,error:'method_not_allowed'});
 const key=String(req.query?.topic||'').toLowerCase();
 if(!Object.prototype.hasOwnProperty.call(TOPICS,key))return res.status(400).json({found:false,error:'unknown_topic'});
 const p=new URLSearchParams({action:'query',gen¶»§q«^