// Pure, side-effect-free decision gate for the EXISTING news publisher.
// Does not call an image model, Storage, database, or publication endpoint.
export const AI_CAPTIONS = Object.freeze({
  ru: "Иллюстрация создана ИИ",
  hy: "Նկարազարդումը ստեղծվել է արհեստական բանականության միջոցով",
  en: "AI-generated illustration",
});
const safeUrl = value => {
  try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname; }
  catch { return false; }
};
export function decideNewsImage({ licensedPhoto = null, aiResult = null } = {}) {
  const licensed = licensedPhoto &&
    safeUrl(licensedPhoto.url) &&
    typeof licensedPhoto.author === "string" && licensedPhoto.author.trim().length > 1 &&
    typeof licensedPhoto.license === "string" && licensedPhoto.license.trim().length > 1 &&
    licensedPhoto.rightsVerified === true &&
    licensedPhoto.matchesArticle === true;
  if (licensed) return {
    state: "ready", kind: "licensed_photo", image_url: licensedPhoto.url,
    image_author: licensedPhoto.author, image_license: licensedPhoto.license,
    captions: null, requiresAiGeneration: false,
  };
  // Caller may generate an ORIGINAL illustration only after this decision.
  if (!aiResult) return { state: "needs_ai", requiresAiGeneration: true };
  const aiReady = aiResult.generated === true && aiResult.reviewed === true &&
    aiResult.depictsRealEvent !== true && aiResult.misleading === false &&
    safeUrl(aiResult.storageUrl) &&
    new URL(aiResult.storageUrl).pathname.includes("/storage/v1/object/public/retrophone-news-images/");
  if (!aiReady) return { state: "blocked", reason: "ai_asset_not_verified" };
  return {
    state: "ready", kind: "ai_illustration", image_url: aiResult.storageUrl,
    image_author: "AI-generated illustration", image_license: "AI-generated",
    captions: { ...AI_CAPTIONS }, requiresAiGeneration: false,
  };
}
export function validateNewsImageForPublication(image) {
  if (!image || image.state !== "ready" || !safeUrl(image.image_url)) return false;
  if (image.kind === "licensed_photo") return !!image.image_author && !!image.image_license;
  return image.kind === "ai_illustration" &&
    Object.keys(AI_CAPTIONS).every(lang => image.captions?.[lang] === AI_CAPTIONS[lang]);
}
