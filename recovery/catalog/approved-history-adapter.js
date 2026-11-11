'use strict';
/* Preview-only adapter: no network calls, no writes, no CSS/price/photo changes.
   Caller must supply the exact catalog model ID, editorial row, and translations.
   A missing or ambiguous ID always fails closed. */
(function(root){
  const languages=new Set(['ru','hy','en']);
  function resolveApprovedHistory({modelId, language, editorial, translations, fallback}={}){
    const oldText=typeof fallback==='string'?fallback:'';
    if(!languages.has(language) || !Number.isSafeInteger(modelId) || modelId<=0)
      return {text:oldText, approved:false, reason:'invalid-model-or-language'};
    const pick=root?.RetroPhoneApprovedTranslations?.pickApprovedTranslation
      || (typeof require==='function'?require('./approved-translations.js').pickApprovedTranslation:null);
    if(typeof pick!=='function') return {text:oldText,approved:false,reason:'approval-helper-missing'};
    const exact=pick(editorial,translations,language,modelId);
    if(typeof exact!=='string' || !exact.trim())
      return {text:oldText,approved:false,reason:'not-exactly-approved'};
    return {text:exact,approved:true,reason:'exact-editorial-match'};
  }
  const api={resolveApprovedHistory};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RetroPhoneHistoryAdapter=api;
})(typeof window!=='undefined'?window:null);
