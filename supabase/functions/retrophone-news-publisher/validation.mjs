// Pure input validator, shared by Deno Edge Function and Node test runner.
// Validating declarations is not independent verification of source claims or media rights.
const categories = new Set(["phones","tablets","software","ai","history","technology"]);
const licenses = new Set(["CC BY 2.0","CC BY 3.0","CC BY 4.0","CC BY-SA 3.0","CC BY-SA 4.0","CC0","Public domain"]);
const mandatory = {
  title_ru: [14,260], title_hy:[10,260], title_en:[10,260],
  excerpt_ru:[55,900], excerpt_hy:[30,900], excerpt_en:[30,900],
  body_ru:[120,12000], body_hy:[120,12000], body_en:[120,12000],
  source_name:[4,180]
};
const httpsUrl = (raw) => {
  try {
    const value=new URL(raw);
    if(value.protocol!=="https:" || value.username || value.password || !value.hostname || /(?:^|\.)localhost$/.test(value.hostname)) return null;
    return value;
  } catch { return null; }
};
export function validateNewsPayload(input, now=new Date()) {
  const errors=[];
  if(!input || typeof input!=="object" || Array.isArray(input)) return {ok:false,errors:["invalid_payload"]};
  const article=input.article;
  if(!article || typeof article!=="object" || Array.isArray(article)) return {ok:false,errors:["article_required"]};
  if(JSON.stringify(input).length>65000) errors.push("payload_too_large");
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug||"") || article.slug.length>180) errors.push("invalid_slug");
  if(!categories.has(article.category)) errors.push("invalid_category");
  for (const [field,[min,max]] of Object.entries(mandatory)){
    const value=article[field];
    if(typeof value!=="string" || value.trim().length<min || value.trim().length>max) errors.push("invalid_"+field);
  }
  const source=httpsUrl(article.source_url);
  if(!source) errors.push("invalid_source_url");
  const sourceTime=new Date(article.source_published_at);
  if(!article.source_published_at || !Number.isFinite(sourceTime.getTime()) || sourceTime.getTime()>now.getTime()+12*3600000 || sourceTime.getTime()<Date.UTC(1995,0,1)) errors.push("invalid_source_date");
  const evidence=input.verification;
  // Only a separately authenticated and audited editorial producer may make these attestations.
  if(!evidence || evidence.source_checked!==true || evidence.facts_checked!==true || evidence.license_checked!==true
     || typeof evidence.reviewer!=="string" || evidence.reviewer.trim().length<3 || evidence.reviewer.length>160)
    errors.push("editorial_attestation_required");
  const image=article.image_url;
  if(image!==undefined && image!==null && image!==""){
    const media=httpsUrl(image),mediaSource=httpsUrl(article.image_source_url),licenseUrl=httpsUrl(article.image_license_url);
    if(!media || media.hostname!=="commons.wikimedia.org" || !media.pathname.startsWith("/wiki/Special:FilePath/")) errors.push("image_must_be_commons");
    if(!mediaSource || mediaSource.hostname!=="commons.wikimedia.org" || !mediaSource.pathname.startsWith("/wiki/File:")) errors.push("invalid_image_source");
    if(!licenses.has(article.image_license)) errors.push("invalid_image_license");
    if(!licenseUrl || !["creativecommons.org","commons.wikimedia.org"].includes(licenseUrl.hostname)) errors.push("invalid_image_license_url");
    if(typeof article.image_author!=="string" || article.image_author.trim().length<2) errors.push("invalid_image_author");
    for(const lang of ["ru","hy","en"]) {
      if(typeof article["image_caption_"+lang]!=="string" || article["image_caption_"+lang].trim().length<8) errors.push("invalid_image_caption_"+lang);
    }
  } else if(["image_source_url","image_author","image_license","image_license_url"].some(k=>article[k])) {
    errors.push("orphaned_image_attribution");
  }
  const allowed = [
    "slug","title_ru","title_hy","title_en",
    "excerpt_ru","excerpt_hy","excerpt_en",
    "body_ru","body_hy","body_en","category",
    "source_url","source_name","source_published_at",
    "image_url","image_source_url","image_author","image_license","image_license_url",
    "image_caption_ru","image_caption_hy","image_caption_en"
  ];
  const sanitized={};
  for(const field of allowed)if(article[field]!==undefined)sanitized[field]=article[field];
  return {ok:errors.length===0,errors,article:sanitized};
}
