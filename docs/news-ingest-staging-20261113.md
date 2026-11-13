# RetroPhone news: staging-only protected publisher — 2026-11-13

Status: NOT DEPLOYED. All changes are on test/news-postgres17-concurrency-20261112.
The production site, Supabase, existing Cron, and Etalon 4 admin are unchanged.

## Implemented
- supabase/functions/retrophone-news-publisher/index.ts: authenticated POST-only endpoint, disabled by default, uses guarded database RPC, verifies resulting row.
- validation.mjs: RU/HY/EN fields, source date, required editorial attestation and Wikimedia Commons rights metadata; strips client-controlled status/id/published_at.
- tests/news-guard-production-shape/guarded-publisher-candidate.sql: proposed service-role-only atomic SQL RPC with advisory day lock and idempotency.
- docs/news-daily-limit-rollout-20261112.md: proposed DB trigger for direct INSERT / status or publication timestamp transitions.
- GitHub Actions run 43376905901: PostgreSQL 17 and validator tests passed, including three accepted / five limited concurrent RPC calls, duplicate retry and restricted permissions.

## Required production go/no-go gates
1. Create a fresh independent backup of production DB, code, site assets and relevant storage; perform an isolated restoration test. Supabase site_backups metadata refers to October 2026 and does not establish a current complete backup.
2. Stage schema, privileges, grants, trigger and RPC before any live DDL. Deploy guard and RPC as one reviewed migration only after independent backup is verified; validate RLS/security advisors.
3. Store SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a random 32+ character RETROPHONE_NEWS_INGEST_TOKEN in protected server environment secrets; never expose or print secrets.
4. Keep RETROPHONE_NEWS_PUBLISH_ENABLED unset/false until safeguards are installed and proven.
5. Connect a trusted editorial producer that retrieves verifiable recent source stories, independently checks the facts and dates, prepares all three languages, checks photo rights and makes an authenticated submission. A boolean verification declaration is not independently verified by the endpoint.
6. Test one real vetted story in isolated Preview, then check database, read-only API and rendered site. Validate retries and collisions before real publication.
7. Connect a periodic schedule only after verified producer + backend work end to end. Recheck Yerevan-day published count each time; top up to three if valid distinct stories exist; report shortage rather than invent content.
8. Monitor outcomes, failures, retries and public visibility. Exact-source and slug uniqueness is covered, but semantic duplicates across distinct sources require additional editorial screening.

## Server-to-server input
Authorization: Bearer RETROPHONE_NEWS_INGEST_TOKEN
Request JSON has article with slug, titles/excerpts/bodies RU/HY/EN, source_url, source_name, source_published_at, category, plus properly credited Commons image metadata if used.
Verification has source_checked=true, facts_checked=true, license_checked=true, reviewer=trusted-editor-worker.
Server sets publication status, id, timestamps; client-supplied values cannot override them.

## Limitations
A cron dispatch does not itself research, verify, translate, or publish news. The editor and publishing system are separate dependencies; avoid implying the scheduler is restored merely because isolated tests pass.
