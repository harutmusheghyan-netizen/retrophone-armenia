'use strict';
// Read-only regression checks for the editorial approval gate.
// Run: node recovery/catalog/tests/approved-translations.test.js
const assert = require('node:assert/strict');
const { pickApprovedTranslation } = require('../approved-translations.js');
const id = 68;
const approved = {phone_model_id:id,published_at:'2026-11-11T00:00:00Z',description_ru:'Verified Russian description',description_hy:'Verified Armenian description',description_en:'Verified English description'};
const rows = [
 {phone_model_id:id,language_code:'ru',description:approved.description_ru},
 {phone_model_id:id,language_code:'hy',description:approved.description_hy},
 {phone_model_id:id,language_code:'en',description:approved.description_en}
];
for (const [lang,field] of [['ru','description_ru'],['hy','description_hy'],['en','description_en']]) {
 assert.equal(pickApprovedTranslation(approved,rows,lang,id),approved[field]);
}
assert.equal(pickApprovedTranslation(approved,rows,'fr',id),null,'unsupported language must fail closed');
assert.equal(pickApprovedTranslation({...approved,published_at:null},rows,'ru',id),null,'draft must not render');
assert.equal(pickApprovedTranslation({...approved,phone_model_id:80},rows,'ru',id),null,'wrong model must not render');
assert.equal(pickApprovedTranslation(approved,rows,'ru',80),null,'wrong requested model must not render');
assert.equal(pickApprovedTranslation(approved,rows.filter(x=>x.language_code!=='ru'),'ru',id),null,'missing translation must not render');
assert.equal(pickApprovedTranslation(approved,rows.map(x=>x.language_code==='ru'?{...x,description:x.description+' changed'}:x),'ru',id),null,'mismatched revision must not render');
assert.equal(pickApprovedTranslation(approved,[{phone_model_id:id,language_code:'ru',description:'   '}],'ru',id),null,'blank description must not render');
console.log('Editorial approval gate: 10 checks passed; no database writes.');
