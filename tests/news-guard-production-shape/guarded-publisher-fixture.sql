-- RUN ONLY IN EPHEMERAL GitHub Actions postgres:17, never against Supabase.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.retro_news_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ru text NOT NULL CHECK (length(btrim(title_ru)) BETWEEN 14 AND 260),
  title_hy text, title_en text,
  excerpt_ru text NOT NULL CHECK (length(btrim(excerpt_ru)) BETWEEN 55 AND 900),
  excerpt_hy text, excerpt_en text,
  body_ru text NOT NULL CHECK (length(btrim(body_ru)) BETWEEN 120 AND 12000),
  body_hy text, body_en text,
  category text NOT NULL CHECK (category IN ('phones','tablets','software','ai','history','technology')),
  source_url text NOT NULL UNIQUE,
  source_name text NOT NULL CHECK (length(btrim(source_name))>3),
  source_published_at timestamptz NOT NULL,
  image_url text, image_source_url text,image_author text,
  image_license text,image_license_url text,
  image_caption_ru text,image_caption_hy text,image_caption_en text,
  extra_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  verified_at timestamptz,
  CONSTRAINT publication_check CHECK (status<>'published' OR (
    published_at IS NOT NULL AND verified_at IS NOT NULL
    AND length(btrim(coalesce(title_hy,'')))>=10
    AND length(btrim(coalesce(title_en,'')))>=10
    AND length(btrim(coalesce(excerpt_hy,'')))>=30
    AND length(btrim(coalesce(excerpt_en,'')))>=30
    AND length(btrim(coalesce(body_hy,'')))>=120
    AND length(btrim(coalesce(body_en,'')))>=120
    AND (image_url IS NULL OR
        (length(btrim(coalesce(image_caption_hy,'')))>=8
         AND length(btrim(coalesce(image_caption_en,'')))>=8))
  ))
);
-- RLS and privileges are simulated for the authenticated service role.
ALTER TABLE public.retro_news_posts ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT ON TABLE public.retro_news_posts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.retro_news_posts_id_seq TO service_role;
-- This simulates Supabase service_role bypass while preserving INVOKER semantics.
ALTER ROLE service_role BYPASSRLS;
