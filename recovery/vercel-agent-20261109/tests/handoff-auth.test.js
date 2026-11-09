'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const handler = require('../src/api/handoff.js');
function invoke(method, token, model='2300') {
  const req={method,headers:token===undefined?{}:{'x-retrophone-handoff-token':token},query:{model}};
  const res={statusCode:200,body:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this}};
  return Promise.resolve(handler(req,res)).then(()=>res);
}
test('fail closed without configured caller credential',async()=>{
  const old=process.env.RESEARCH_HANDOFF_TOKEN;delete process.env.RESEARCH_HANDOFF_TOKEN;
  try{const r=await invoke('GET','anything');assert.equal(r.statusCode,503);assert.equal(r.body.error,'handoff_auth_not_configured')}
  finally{if(old!==undefined)process.env.RESEARCH_HANDOFF_TOKEN=old}
});
test('reject missing or invalid caller credentials',async()=>{
  const old=process.env.RESEARCH_HANDOFF_TOKEN;process.env.RESEARCH_HANDOFF_TOKEN='test-only-token';
  try{
    for(const token of [undefined,'bad','test-only-token-extra']){
      const r=await invoke('GET',token);assert.equal(r.statusCode,401);assert.equal(r.body.error,'unauthorized');
    }
  }finally{if(old===undefined)delete process.env.RESEARCH_HANDOFF_TOKEN;else process.env.RESEARCH_HANDOFF_TOKEN=old}
});
test('reject out-of-queue model before calling upstream',async()=>{
  const old=process.env.RESEARCH_HANDOFF_TOKEN;process.env.RESEARCH_HANDOFF_TOKEN='test-only-token';
  try{const r=await invoke('GET','test-only-token','2010');assert.equal(r.statusCode,400);assert.equal(r.body.error,'model_outside_research_queue')}
  finally{if(old===undefined)delete process.env.RESEARCH_HANDOFF_TOKEN;else process.env.RESEARCH_HANDOFF_TOKEN=old}
});
test('reject methods other than GET',async()=>{
  const r=await invoke('POST');assert.equal(r.statusCode,405);assert.equal(r.body.error,'method_not_allowed')
});
