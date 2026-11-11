'use strict';
/* Preview-only pure helper. No DB writes, no UI/CSS changes. */
(function(root){
  const languages=['ru','hy','en'];
  function pickApprovedTranslation(editorial, translations, lang, modelId){
    if(!languages.includes(lang) || !Number.isSafeInteger(modelId) || modelId<=0) return null;
    if(!editorial || !editorial.published_at || !Number.isSafeInteger(editorial.phone_model_id) || editorial.phone_model_id!==modelId) return null;
    if(!Array.isArray(translations)) return null;
    // Ambiguous/duplicate rows must fail closed, even if the first row looks approved.
    const matches=translations.filter(t=>t && t.phone_model_id===modelId && t.language_code===lang);
    if(matches.length!==1) return null;
    const row=matches[0];
    if(typeof row.description!=='string' || !row.description.trim()) return null;
    const approved=editorial['description_'+lang];
    if(typeof approved!=='string' || approved!==row.description) return null;
    return row.description;
  }
  const api={pickApprovedTranslation};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RetroPhoneApprovedTranslations=api;
})(typeof window!=='undefined'?window:null);
