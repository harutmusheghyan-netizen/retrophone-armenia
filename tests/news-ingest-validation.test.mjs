import test from "node:test";
import assert from "node:assert/strict";
import { validateNewsPayload } from "../supabase/functions/retrophone-news-publisher/validation.mjs";

const ru="Техническая новость о технологиях и мобильных устройствах в текущем отраслевом обзоре.";
const hy="Նորություններ բջջային տեխնոլոգիաների զարգացումների և արդիական սարքերի վերաբերյալ։";
const en="A technology industry update about mobile devices and their new features in the current market.";
function valid(){
 return {
  article:{
   slug:"example-test-news-2026",title_ru:"Тестовая новость о мобильных технологиях",
   title_hy:"Տեխնոլոգիաների մասին փորձնական նորություն",
   title_en:"Test article about mobile technology",
   excerpt_ru:ru,excerpt_hy:hy,excerpt_en:en,
   body_ru:ru.repeat(4),body_hy:hy.repeat(4),body_en:en.repeat(4),
   category:"technology",source_url:"https://example.org/articles/abc",
   source_name:"Example Editorial",source_published_at:"2026-11-12T07:00:00Z",
   image_url:"https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg",
   image_source_url:"https://commons.wikimedia.org/wiki/File:Example.jpg",
   image_author:"Example Photographer",
   image_license:"CC BY-SA 4.0",
   image_license_url:"https://creativecommons.org/licenses/by-sa/4.0/",
   image_caption_ru:"Иллюстрация к технологии",
   image_caption_hy:"Նկարի նկարագրություն",
   image_caption_en:"Illustration of a technology"
  },
  verification:{source_checked:true,facts_checked:true,license_checked:true,reviewer:"editorial-worker"}
 };
}
const now=new Date("2026-11-13T06:00:00Z");
test("accepts complete trilingual reviewed material",()=>{
 const r=validateNewsPayload(valid(),now);
 assert.equal(r.ok,true,JSON.stringify(r.errors));
 assert.equal(r.article.source_url,"https://example.org/articles/abc");
});
test("rejects missing Armenian body",()=>{
 let p=valid();p.article.body_hy="";
 assert.ok(validateNewsPayload(p,now).errors.includes("invalid_body_hy"));
});
test("rejects unchecked editorial claims",()=>{
 let p=valid();p.verification.license_checked=false;
 assert.ok(validateNewsPayload(p,now).errors.includes("editorial_attestation_required"));
});
test("rejects non-commons image without independently verified rights",()=>{
 let p=valid();p.article.image_url="https://untrusted.test/stock.jpg";
 assert.ok(validateNewsPayload(p,now).errors.includes("image_must_be_commons"));
});
test("rejects incomplete credits",()=>{
 let p=valid();p.article.image_author="";
 assert.ok(validateNewsPayload(p,now).errors.includes("invalid_image_author"));
});
test("rejects future source publication date",()=>{
 let p=valid();p.article.source_published_at="2026-11-20T07:00:00Z";
 assert.ok(validateNewsPayload(p,now).errors.includes("invalid_source_date"));
});
test("rejects invalid slug and unsupported category",()=>{
 let p=valid();p.article.slug="../news";p.article.category="politics";
 let e=validateNewsPayload(p,now).errors;
 assert.ok(e.includes("invalid_slug")&&e.includes("invalid_category"));
});
test("strips client-supplied status, publication date and id",()=>{
 let p=valid();p.article.id=999;p.article.status="published";p.article.published_at="2020-01-01";
 let r=validateNewsPayload(p,now);
 assert.equal(r.ok,true);
 for(let k of ["id","status","published_at"])assert.equal(k in r.article,false);
});
test("accepts licensed text-only fallback without misleading image fields",()=>{
 let p=valid();for(let k of ["image_url","image_source_url","image_author","image_license","image_license_url","image_caption_ru","image_caption_hy","image_caption_en"])delete p.article[k];
 assert.equal(validateNewsPayload(p,now).ok,true);
});
