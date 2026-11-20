import test from "node:test";
import assert from "node:assert/strict";
import {prepareNewsImageFields} from "./news-image-fields.mjs";
const ai={generated:true,reviewed:true,depictsRealEvent:false,misleading:false,storageUrl:"https://aikxbgixitaaatkmcols.supabase.co/storage/v1/object/public/retrophone-news-images/news/test.png"};
test("AI image maps to all three existing caption columns",()=>{
 const r=prepareNewsImageFields({aiResult:ai});assert.equal(r.ok,true);
 assert.equal(r.fields.image_caption_ru,"Иллюстрация создана ИИ");
 assert.equal(r.fields.image_caption_hy,"Նկարազարդումը ստեղծվել է արհեստական բանականության միջոցով");
 assert.equal(r.fields.image_caption_en,"AI-generated illustration");
 assert.equal(r.kind,"ai_illustration");
});
test("missing image cannot be inserted as ready",()=>assert.equal(prepareNewsImageFields({}).ok,false));
test("unverified AI image cannot be inserted",()=>assert.equal(prepareNewsImageFields({aiResult:{...ai,reviewed:false}}).ok,false));
test("licensed photo retains credit without false AI labels",()=>{
 const r=prepareNewsImageFields({licensedPhoto:{url:"https://example.org/photo.png",author:"Photographer",license:"CC BY 4.0",rightsVerified:true,matchesArticle:true}});
 assert.equal(r.ok,true);assert.equal(r.fields.image_caption_ru,"");assert.equal(r.fields.image_author,"Photographer");
});
