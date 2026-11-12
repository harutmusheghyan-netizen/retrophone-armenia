# News daily publication limit: staged production rollout

**Status: proposal only — not deployed.** Test branch: test/news-postgres17-concurrency-20261112.

## Read-only production findings, Nov 12, 2026
- PostgreSQL 17, default isolation READ COMMITTED.
- public.retro_news_posts: 26 published items, latest dated Nov 7.
- Status values draft/published/archived; published_at nullable for drafts.
- UNIQUE source_url plus separate checks for published translations and image attribution.
- Historic Oct 27 has 7 published posts; previously published content must stay editable.
- No daily-limit trigger on live news and no Supabase Cron news-publisher job.
- Existing GitHub news-publication-smoke workflow reads HTTP pages but does not publish.

## Proposed SQL (DO NOT APPLY before backup, restore test, staging verification)
This is a candidate, not an applied migration.

```sql
CREATE OR REPLACE FUNCTION retrophone_internal.retro_news_daily_limit_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $guard$
DECLARE v_day date;
BEGIN
  IF NEW.status <> 'published' OR NEW.published_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published'
     AND NEW.status = 'published'
     AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
  THEN
    RETURN NEW;
  END IF;

  v_day := (NEW.published_at AT TIME ZONE 'Asia/Yerevan')::date;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('retrophone-news:' || v_day::text, 0)
  );
  IF (
    SELECT count(*)
    FROM public.retro_news_posts AS p
    WHERE p.status = 'published'
      AND (p.published_at AT TIME ZONE 'Asia/Yerevan')::date = v_day
      AND (TG_OP <> 'UPDATE' OR p.id <> NEW.id)
  ) >= 3 THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;
  RETURN NEW;
END;
$guard$;

CREATE TRIGGER retro_news_daily_limit_guard
BEFORE INSERT OR UPDATE OF status, published_at
ON public.retro_news_posts
FOR EACH ROW EXECUTE FUNCTION retrophone_internal.retro_news_daily_limit_guard();
```

Rollback, only if manually applied:

```sql
DROP TRIGGER IF EXISTS retro_news_daily_limit_guard ON public.retro_news_posts;
DROP FUNCTION IF EXISTS retrophone_internal.retro_news_daily_limit_guard();
```

## Rollout gates
1. Verify independent backup and test restoration.
2. Match full production DDL on staging; validate grants and RLS, no test inserts on production.
3. Use isolated GitHub Actions suite run 43188525966; under READ COMMITTED it passed eight concurrent requests, day limit, updates, drafts, historical edits, source dedup and Yerevan dates.
4. Evaluate any nondefault transaction isolation use separately; this advisory-lock/count approach is not proved for every isolation level.
5. Apply only after deployment review; preserve existing content, admin Etalon 4, design, licenses and Cron schedules.
6. Existing news edit drafts have no queued rows; secure news publisher and verified article intake are prerequisites for scheduler activation.
7. Once an authenticated idempotent publisher exists, use Supabase Cron + protected Edge Function and Vault-managed secret; verify end-to-end publication and monitor actual public posts.
