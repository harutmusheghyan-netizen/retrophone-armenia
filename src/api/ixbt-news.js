'use strict';
const feed='https://www.ixbt.com/export/news.rss';
function decode(s){return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&(#(?:x[0-9a-f]+|[0-9]+)|amp|lt|gt|quot|apos|nbsp);/gi,(_,name)=>{if(name[0]==='#'){const n=Number(name[1]?.toLowerCase()==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10));return Number.isFinite(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):''}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[name.toLowerCase()]||''}).replace(/<[^>]*>/g,'').trim()}
function field(xml,key){const match=xml.match(new RegExp('<'+key+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+key+'>','i'));return match?decode(match[1]):''}
module.exports=async function(req,res){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Access-Control-Allow-Origin','https://retrophone-armenia.vercel.app');if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
try{
const r=await fetch(feed,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'RetroPhoneArmenia/1.0 (+https://retrophone-armenia.vercel.app/news/)'},signal:AbortSignal.timeout(8500)});
if(!r.ok)throw Error('upstream_http_'+r.status);
const xml=(await r.text()).slice(0,650000);if(!/<rss[\s>]/i.test(xml)||!/<item[\s>]/i.test(xml))throw Error('invalid_rss');
const items=[];const seen=new Set();
for(const m of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
const pie¶»§q«^