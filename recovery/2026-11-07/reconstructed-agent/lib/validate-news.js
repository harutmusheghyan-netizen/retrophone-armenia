'use strict';
// Validate a news item before it can be handed to a protected publisher.
// Deliberately no direct database write or scheduling.
const LANGS=['ru','hy','en'];
function validateNews(item) {
  const errors=[];
  if(!item || typeof item!=='object' || Array.isArray(item)) return {ok:false,errors:['invalid_item']};
  for(const field of ['title','excerpt','body']) for(const lang of LANGS) {
    const value=item[field+'_'+lang];
    if(typeof value!=='string' || value.trim().length<(field==='body'?80:field==='excerpt'?25:10))
      errors.push(field+'_'+lang+'_missing_or_short');
  }
  for(const field of ['source_url','source_name','source_published_at','verified_at']) {
    if(!item[field]) errors.push(field+'_missing');
  }
  for(const field of ['source_url','image_url']) {
    if(item[field]) {try{if(new URL(item[field]).protocol!=='https:')errors.push(field+'_not_https');}
      catch {errors.push(field+'_invalid');}}
  }
  if(item.image_url && !(item.image_source_url && item.image_author && item.image_license))
    errors.push('image_attribution_incomplete');
  if(!item.image_url && !item.company_logo_url) errors.push('image_or_company_logo_missing');
  if(item.company_logo_url) {try{if(new URL(item.company_logo_url).protocol!=='https:')errors.push('logo_not_https');}catch{errors.push('logo_invalid');}}
  if(!item.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug))errors.push('invalid_slug');
  if(item.source_published_at && !Number.isFinite(Date.parse(item.source_published_at)))errors.push('invalid_source_date');
  if(item.verified_at && !Number.isFinite(Date.parse(item.verified_at)))errors.push('invalid_verification_date');
  return {ok:errors.length===0,errors};
}
module.exports={validateNews};
