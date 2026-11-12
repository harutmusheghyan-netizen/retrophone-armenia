'use strict';
/* Preview-only pure helper. No DB writes, no UI/CSS changes. */
(function(root){
  const languages=['ru','hy','en'];
  function pickApprovedTranslation(editorial, translations, lang, modelId){
    if(!languages.includes(lang)) return null;
    if(!editorial || !editorial.published_at || Number(editorial.phone_model_id)!==Number(modelId)) return null;
    const rows=Array.isArray(translations)?translations:[];
    const row=rows.find(t=>Number(t.phone_model_id)===Number(modelId)&&t.language_code===lang);
    if(!row || typeof row.description!=='string' || !row.description.trim()) return null;
    // Only show the main-table text if editorial explicitly approved the exact text.
    // A different editorial revision must go through publication verification first.
    const approved=editorial['description_'+lang];
    if(typeof approved!=='string' || approved!==row.description) return null;
    return row.description;
  }
  const api={pickApprovedTranslation};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.RetroPhoneApprovedTranslations=api;
})(typeof window!=='undefined'?window:null);
