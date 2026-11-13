-- STAGING CANDIDATE ONLY. This is NOT installed on production.
-- Requires independent backup + restore test, production schema review and final migration.
-- Only server-to-server service_role may execute this RPC.
CREATE OR REPLACE FUNCTION public.retrophone_news_publish_checked(p_post jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
DECLARE
  v_day date;
  v_now timestamptz;
  v_slug text;
  v_source text;
  v_old_slug text;
  v_old_source text;
  v_id bigint;
BEGIN
  IF jsonb_typeof(p_post) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  v_slug := nullif(p_post->>'slug','');
  v_source := nullif(p_post->>'source_url','');
  IF v_slug IS NULL OR v_source IS NULL THEN
    RAISE EXCEPTION 'missing_slug_or_source';
  END IF;
  v_now := clock_timestamp();
  v_day := (v_now AT TIME ZONE 'Asia/Yerevan')::date;
  PERFORM pg_advisory_xact_lock(hashtextextended('retrophone-news:' || v_day::text,0));

  -- Retry of the exact same article is idempotent even on a full day.
  SELECT id,slug,source_url INTO v_id,v_old_slug,v_old_source
  FROM public.retro_news_posts
  WHERE slug=v_slug OR source_url=v_source
  ORDER BY id LIMIT 1;
  IF FOUND THEN
    IF v_old_slug=v_slug AND v_old_source=v_source THEN
      RETURN jsonb_build_object('status','already_exists','id',v_id,'day',v_day);
    END IF;
    RETURN jsonb_build_object('status','conflict','id',null,'day',v_day);
  END IF;

  IF (SELECT count(*) FROM public.retro_news_posts
      WHERE status='published'
        AND (published_at AT TIME ZONE 'Asia/Yerevan')::date=v_day) >= 3
  THEN
    RETURN jsonb_build_object('status','daily_limit_reached','id',null,'day',v_day);
  END IF;

  INSERT INTO public.retro_news_posts(
    slug,title_ru,title_hy,title_en,excerpt_ru,excerpt_hy,excerpt_en,
    body_ru,body_hy,body_en,category,source_url,source_name,source_published_at,
    image_url,image_source_url,image_author,image_license,image_license_url,
    image_caption_ru,image_caption_hy,image_caption_en,
    extra_images,status,published_at,verified_at)
  VALUES (
    v_slug,p_post->>'title_ru',p_post->>'title_hy',p_post->>'title_en',
    p_post->>'excerpt_ru',p_post->>'excerpt_hy',p_post->>'excerpt_en',
    p_post->>'body_ru',p_post->>'body_hy',p_post->>'body_en',
    p_post->>'category',v_source,p_post->>'source_name',
    (p_post->>'source_published_at')::timestamptz,
    nullif(p_post->>'image_url',''),nullif(p_post->>'image_source_url',''),
    nullif(p_post->>'image_author',''),nullif(p_post->>'image_license',''),
    nullif(p_post->>'image_license_url',''),
    nullif(p_post->>'image_caption_ru',''),nullif(p_post->>'image_caption_hy',''),
    nullif(p_post->>'image_caption_en',''),
    '[]'::jsonb,'published',v_now,v_now
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('status','published','id',v_id,'day',v_day);
END;
$fn$;

REVOKE ALL ON FUNCTION public.retrophone_news_publish_checked(jsonb)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.retrophone_news_publish_checked(jsonb)
TO service_role;
