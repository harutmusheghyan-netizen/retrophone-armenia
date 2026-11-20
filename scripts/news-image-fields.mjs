import { decideNewsImage, validateNewsImageForPublication } from "./news-image-fallback.mjs";
// Adapter for the existing retro_news_posts image columns. Pure function: no DB writes.
export function prepareNewsImageFields(input) {
  const image = decideNewsImage(input);
  if (!validateNewsImageForPublication(image)) return {ok:false,state:image.state,reason:image.reason ?? "image_not_ready"};
  const fields = {
    image_url:image.image_url,
    image_source_url:image.image_url,
    image_author:image.image_author,
    image_license:image.image_license,
    image_caption_ru:image.captions?.ru ?? "",
    image_caption_hy:image.captions?.hy ?? "",
    image_caption_en:image.captions?.en ?? "",
  };
  return {ok:true,kind:image.kind,fields};
}
