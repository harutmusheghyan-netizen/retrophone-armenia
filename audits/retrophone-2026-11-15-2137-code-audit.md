# RetroPhone audit — 2026-11-15 21:37 Asia/Yerevan

## Verified live reads
- Supabase project aikxbgixitaaatkmcols: phone_model_translations RU 870 rows / 754 nonempty; HY 754/754; EN 754/754. Read-only SQL.
- GitHub safe/catalog-i18n-audit-20261115: full catalog-proxy/api/proxy.js retrieved, SHA ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce.
- Vercel retrophone-research-agent production dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY; deployment source tree enumerated, including src/api/cron.js, publication.js, research-v3.js. Tree presence does not establish source restoration or job execution.

## Confirmed code limitations
1. getEditorial queries only agent_published_model_editorials; no lookup of phone_model_translations.
2. HTML replacement requires exact Russian section markup and description length >=160; no replacement otherwise.
3. Route model slug converts every hyphen into a space, potentially breaking exact model_name comparison for hyphenated models.
4. retro-i18n.js dictionary translates interface text nodes, not arbitrary stored descriptions; it cannot substitute for retrieving HY/EN model descriptions.
5. READY is deployment health only; no publication/run success established.

## Safe next implementation
- Restore full Researcher source through per-file download and integrity checks before edits.
- In isolated Preview, map route to phone_model_id, query translations for language_code, and preserve published verified editorials as higher priority.
- Avoid replacing sections by a Russian-only regex; test real upstream HTML for Nokia 2010, Samsung GT-S3650 and 10 brand histories in RU/HY/EN.
- Compare SQL and rendered page content before/after; publish only after authentication, source verification and regression tests.
- No production writes or deployments performed in this audit.
