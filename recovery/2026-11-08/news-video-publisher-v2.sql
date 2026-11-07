CREATE OR REPLACE FUNCTION public.retro_news_publish_draft_v2(p_draft_id bigint, p_expected_revision integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare d public.retro_news_edit_drafts%rowtype;
declare new_id bigint;
declare v_img text;
declare v_photo_owned boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_users where user_id=auth.uid())
 then raise exception 'not_news_admin'; end if;
 select * into d from public.retro_news_edit_drafts where id=p_draft_id for update;
 if not found then raise exception 'draft_not_found'; end if;
 if d.revision<>p_expected_revision or d.previewed_revision is distinct from d.revision or d.previewed_at is null
 then raise exception 'preview_current_revision_before_publishing'; end if;
 if d.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(btrim(d.title_ru)) not between 14 and 260
    or length(btrim(d.excerpt_ru)) not between 55 and 900 or length(btrim(d.body_ru)) not between 120 and 12000
    or d.category not in ('phones','tablets','software','ai','history','technology')
    or d.source_url !~ '^https://[^[:space:]]+$' or length(btrim(d.source_name))<4
    or d.source_published_at is null or d.source_published_at>clock_timestamp()+interval '12 hours'
 then raise exception 'check_required_fields_and_source_date'; end if;
 if length(btrim(coalesce(d.title_hy,'')))<10 or length(btrim(coalesce(d.title_en,'')))<10
 or length(btrim(coalesce(d.excerpt_hy,'')))<30 or length(btrim(coalesce(d.excerpt_en,'')))<30
 or length(btrim(coalesce(d.body_hy,'')))<120 or length(btrim(coalesce(d.body_en,'')))<120
 then raise exception 'full_armenian_and_english_translations_required'; end if;
 if d.image_url is not null and (
    d.image_source_url is null or d.image_author is null or d.image_license is null
 ) then raise exception 'image_source_license_and_author_required'; end if;
 if d.image_url is not null and (length(btrim(coalesce(d.image_caption_hy,'')))<8 or length(btrim(coalesce(d.image_caption_en,'')))<8)
 then raise exception 'translate_photo_caption_into_three_languages'; end if;
 if d.image_url like '%/retrophone-news-images/%' then
    if d.image_license<>'Owned by RetroPhone Armenia' then raise exception 'uploaded_photo_requires_owner_rights'; end if;
    if not exists(select 1 from storage.objects
       where bucket_id='retrophone-news-images'
         and 'https://aikxbgixitaaatkmcols.supabase.co/storage/v1/object/public/retrophone-news-images/'||name=d.image_url)
    then raise exception 'photo_not_found_in_news_storage'; end if;
 end if;
 if not public.retro_news_gallery_valid(d.extra_images) then raise exception 'invalid_photo_gallery'; end if;
 if d.video_url is not null and (
   d.video_url !~ '^https://(www[.]youtube[.]com/watch[?]v=|youtu[.]be/|www[.]youtube[.]com/embed/)[A-Za-z0-9_-]{11}([&?][A-Za-z0-9_=&-]+)?   insert into public.retro_news_posts(slug,title_ru,title_hy,title_en,excerpt_ru,excerpt_hy,excerpt_en,body_ru,body_hy,body_en,
      category,source_url,source_name,source_published_at,image_url,image_source_url,image_author,image_license,
      image_license_url,image_caption_ru,image_caption_hy,image_caption_en,extra_images,video_url,video_caption_ru,video_caption_hy,video_caption_en,status,published_at,verified_at)
   values(d.slug,d.title_ru,d.title_hy,d.title_en,d.excerpt_ru,d.excerpt_hy,d.excerpt_en,d.body_ru,d.body_hy,d.body_en,
      d.category,d.source_url,d.source_name,d.source_published_at,d.image_url,d.image_source_url,d.image_author,
      d.image_license,d.image_license_url,d.image_caption_ru,d.image_caption_hy,d.image_caption_en,d.extra_images,d.video_url,d.video_caption_ru,d.video_caption_hy,d.video_caption_en,'published',clock_timestamp(),clock_timestamp())
   returning id into new_id;
 else
   update public.retro_news_posts set slug=d.slug,title_ru=d.title_ru,title_hy=d.title_hy,title_en=d.title_en,
     excerpt_ru=d.excerpt_ru,excerpt_hy=d.excerpt_hy,excerpt_en=d.excerpt_en,body_ru=d.body_ru,body_hy=d.body_hy,body_en=d.body_en,
     category=d.category,source_url=d.source_url,source_name=d.source_name,source_published_at=d.source_published_at,
     image_url=d.image_url,image_source_url=d.image_source_url,image_author=d.image_author,
     image_license=d.image_license,image_license_url=d.image_license_url,image_caption_ru=d.image_caption_ru,image_caption_hy=d.image_caption_hy,image_caption_en=d.image_caption_en,extra_images=d.extra_images,
     video_url=d.video_url,video_caption_ru=d.video_caption_ru,video_caption_hy=d.video_caption_hy,video_caption_en=d.video_caption_en,
     status='published',updated_at=clock_timestamp()
   where id=d.post_id returning id into new_id;
   if new_id is null then raise exception 'original_post_not_found'; end if;
 end if;
 delete from public.retro_news_edit_drafts where id=d.id;
 return jsonb_build_object('ok',true,'published_id',new_id,'slug',d.slug,'edited_existing',d.post_id is not null);
end;
$function$

   or length(btrim(coalesce(d.video_caption_ru,'')))<5
   or length(btrim(coalesce(d.video_caption_hy,'')))<5
   or length(btrim(coalesce(d.video_caption_en,'')))<5
 ) then raise exception 'cms_video_url_and_three_captions_required'; end if;
 if d.post_id is null then
   insert into public.retro_news_posts(slug,title_ru,title_hy,title_en,excerpt_ru,excerpt_hy,excerpt_en,body_ru,body_hy,body_en,
      category,source_url,source_name,source_published_at,image_url,image_source_url,image_author,image_license,
      image_license_url,image_caption_ru,image_caption_hy,image_caption_en,extra_images,status,published_at,verified_at)
   values(d.slug,d.title_ru,d.title_hy,d.title_en,d.excerpt_ru,d.excerpt_hy,d.excerpt_en,d.body_ru,d.body_hy,d.body_en,
      d.category,d.source_url,d.source_name,d.source_published_at,d.image_url,d.image_source_url,d.image_author,
      d.image_license,d.image_license_url,d.image_caption_ru,d.image_caption_hy,d.image_caption_en,d.extra_images,'published',clock_timestamp(),clock_timestamp())
   returning id into new_id;
 else
   update public.retro_news_posts set slug=d.slug,title_ru=d.title_ru,title_hy=d.title_hy,title_en=d.title_en,
     excerpt_ru=d.excerpt_ru,excerpt_hy=d.excerpt_hy,excerpt_en=d.excerpt_en,body_ru=d.body_ru,body_hy=d.body_hy,body_en=d.body_en,
     category=d.category,source_url=d.source_url,source_name=d.source_name,source_published_at=d.source_published_at,
     image_url=d.image_url,image_source_url=d.image_source_url,image_author=d.image_author,
     image_license=d.image_license,image_license_url=d.image_license_url,image_caption_ru=d.image_caption_ru,image_caption_hy=d.image_caption_hy,image_caption_en=d.image_caption_en,extra_images=d.extra_images,
     status='published',updated_at=clock_timestamp()
   where id=d.post_id returning id into new_id;
   if new_id is null then raise exception 'original_post_not_found'; end if;
 end if;
 delete from public.retro_news_edit_drafts where id=d.id;
 return jsonb_build_object('ok',true,'published_id',new_id,'slug',d.slug,'edited_existing',d.post_id is not null);
end;
$function$
;
REVOKE ALL ON FUNCTION public.retro_news_publish_draft_v2(bigint,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retro_news_publish_draft_v2(bigint,integer) TO authenticated;
