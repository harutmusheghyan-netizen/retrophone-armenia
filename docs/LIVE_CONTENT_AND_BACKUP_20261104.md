# RetroPhone Armenia — live content and verified cloud snapshot (2026-11-04)

## Deployment status
- Current published catalog proxy (Vercel): `dpl_B97naGxZgETaDyitPrL9Mp3FjqPp`, production, READY.
- Prior catalog release retained for rollback: `dpl_GYjdRcQHSzmtAuaQDYUJeVcArS99`.
- Canonical catalog: https://retrophone-armenia-catalog.vercel.app
- Scope: **catalog proxy only**. Main homepage/admin are independently deployed and require full source reconciliation before any edit.
- Database: Supabase `aikxbgixitaaatkmcols`. No secrets committed.

## Live content changes
- SQL migrations recorded in Supabase as `retrophone_content_revision_live_phone_20261104` and `retrophone_live_phone_image_credit_20261104`.
- Read-only `public.site_content_revision` holds `catalog` / `news` revision numbers.
- Statement triggers bump those revisions when their content tables change; anonymous clients can SELECT revision numbers but cannot write.
- `public.retrophone_live_phone` is `SECURITY INVOKER` and constrained by the existing model/brand/translation row-level security.
- The catalog proxy fetches published RU/HY/EN descriptions and license-attributed model images without rewriting the original design. Five manually verified editorial histories still override generic descriptions.
- `/api/content-revision` is a no-store read-only JSON endpoint. `/retro-live.js` checks the revision every ~30 seconds while the tab is visible; it reloads when safe, without interrupting form editing.
- Server-rendered trilingual meta descriptions and schema.org `inLanguage` now match the selected language.

## Acceptance checks
- Production API `/api/content-revision`: HTTP 200, `Cache-Control: no-store`.
- RU/HY/EN page `/phones/nokia/n85`: HTTP 200, translated history from Supabase, valid photo license/source.
- `/phones/nokia/5610-xpressmusic?lang=en`: HTTP 200, author Sageo, CC BY-SA 4.0.
- `/phones/nokia/2323-classic?lang=ru`: HTTP 200, preserved independently approved editorial.
- Catalog root: HTTP 200. Site CSS/layout passed through unchanged.

## Independent content snapshot
Created 2026-11-04 in the owner's private Google Drive backup folder, with read-back verification:
10 brands, 870 phone models, 2358 translation rows, 401 photo metadata rows, 25 news posts, 5 agent-published editorials, and a separately captured 330,685-byte homepage HTML.
A private manifest lists file IDs, checks and restoration limitations.

**Not a complete disaster-recovery backup**: external image bytes, Supabase Storage, auth/roles, orders, internal tables, complete Vercel source/config/secrets and full PostgreSQL logical dump were not captured, and isolated restore has not been tested. Do not promote site-wide recovery work until those gaps are closed.
