'use strict';
// Preview-only regression tests: never query or write production data.
const assert = require('node:assert/strict');
const {resolveApprovedHistory} = require('../approved-history-adapter.js');
const modelId=68;
const editorial={phone_model_id:modelId,published_at:'2026-11-11T00:00:00Z',description_ru:'Approved RU',description_hy:'Approved HY',description_en:'Approved EN'};
const rows=['ru','hy','en'].map(lang=>({phone_model_id:modelId,language_code:lang,description:editorial['description_'+lang]}));
const base={modelId,editorial,translations:rows,fallback:'Original history'};
for(const language of ['ru','hy','en']){
 const result=resolveApprovedHistory({...base,language});
 assert.deepEqual(result,{text:editorial['description_'+language],approved:true,reason:'exact-editorial-match'});
}
for(const [name,overrides] of [
 ['unapproved revision',{translations:[{phone_model_id:modelId,language_code:'ru',description:'Different text'}]}],
 ['unpublished editorial',{editorial:{...editorial,published_at:null}}],
 ['wrong model',{modelId:80}],
 ['missing model',{modelId:null}],
 ['ambiguous model',{modelId:'68'}],
 ['unsupported language',{language:'fr'}],
 ['missing rows',{translations:[]}],
 ['empty editorial',{editorial:null}],
]){
 const result=resolveApprovedHistory({...base,language:'ru',...overrides});
 assert.equal(result.approved,false,name);
 assert.equal(result.text,base.fallback,name);
}
assert.equal(resolveApprovedHistory({}).approved,false);
assert.equal(resolveApprovedHistory({fallback:'Safe fallback'}).text,'Safe fallback');
console.log('Approved history adapter: 13 read-only checks passed.');
