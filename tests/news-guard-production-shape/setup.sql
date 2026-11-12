-- Standalone PostgreSQL 17 fixture mirroring publication-relevant retro_news_posts fields.
-- Never run this file against production. It creates only an isolated test schema.
\set ON_ERROR_STOP on
CREATE SCHEMA isolated_news_live_shape;
CREATE TABLE isolated_news_live_shape.posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  source_url text NOT NULL UNIQUE,
  title_ru text NOT NULL,
  title_hy text,
  title_en text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  CONSTRAINT publication_check CHECK (
    status <> 'published'
    OR (published_at IS NOT NULL
      AND length(btrim(coalesce(title_hy,''))) >= 10
      AND length(btrim(coalesce(title_en,''))) >= 10)
  )
);
-- Emulate the seven previously published stories of 2026-10-27
-- before enabling the new guard; historical records must remain editable.
INSERT INTO isolated_news_live_shape.posts
  (slug,source_url,title_ru,title_hy,title_en,status,published_at)
SELECT
  'legacy-' || n,
  'https://example.org/legacy/' || n,
  'Историческая новость',
  'Պատմական նորություն',
  'Historical news',
  'published','2026-10-27 12:00:00+04'::timestamptz
FROM generate_series(1,7) AS n;

CREATE FUNCTION isolated_news_live_shape.guard_daily_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $guard$
DECLARE v_day date;
BEGIN
  -- Non-public drafts/archives do not consume a publishing slot.
  IF NEW.status <> 'published' OR NEW.published_at IS NULL THEN RETURN NEW; END IF;

  -- Re-editing an already published article must not be blocked, including
  -- historic dates with more than three posts.
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'published'
     AND NEW.status = 'published'
     AND OLD.published_at IS NOT DISTINCT FROM NEW.published_at
  THEN RETURN NEW; END IF;

  v_day := (NEW.published_at AT TIME ZONE 'Asia/Yerevan')::date;
  PERFORM pg_advisory_xact_lock(hashtextextended('retrophone-news:' || v_day::text, 0));
  IF (
    SELECT count(*)
    FROM isolated_news_live_shape.posts p
    WHERE p.status = 'published'
      AND (p.published_at AT TIME ZONE 'Asia/Yerevan')::date = v_day
      AND (TG_OP <> 'UPDATE' OR p.id <> NEW.id)
  ) >= 3 THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;
  RETURN NEW;
END;
$guard$;

CREATE TRIGGER guard_daily_limit
BEFORE INSERT OR UPDATE OF status, published_at
ON isolated_news_live_shape.posts
FOR EACH ROW EXECUTE FUNCTION isolated_news_live_shape.guard_daily_limit();
