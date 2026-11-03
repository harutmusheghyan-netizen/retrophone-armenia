'use strict';
const licenses=new Set(['CC BY 2.0','CC BY 3.0','CC BY 4.0','CC BY-SA 3.0','CC BY-SA 4.0','CC0','Public domain']);
const plain=x=>String(x||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,140);
const safe=(url,hosts)=>{try{const u=new URL(url);return u.protocol==='https:'&&hosts.includes(u.hostname)?u.href:null}catch{return null}};
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','application/json;charset=utf-8');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'method_not_allowed'});
 const src=String(req.query?.file||'');if(src.length>950)return res.status(400).json({ok:false,error:'too_long'});
 let u;try{u=new URL(src)}catch{return res.status(400).json({ok:false,error:'Нужна ссылка Wikimedia Commons'})}
 if(u.protocol!=='https:'||u.hostname!=='commons.wikimedia.org'||!u.pathname.startsWith('/wiki/File:'))return res.status(400).json({ok:false,error:'Нужна страница Wikimedia Commons /wiki/File:...' });
 let name;try{name=decodeURIComponent(u.pathname.slice('/wiki/File:'.length)).replace(/_/g,' ')}catch{return res.status(400).json({ok:false,error:'Неверное имя файла'})}
 if(!name||name.length>300)return res.status(400).json({ok:false,error:'Неверное имя файла'});
 const url=new URL('https://commons.wikimedia.org/w/api.php');
 con���q�^