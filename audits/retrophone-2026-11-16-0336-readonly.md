# RetroPhone Armenia — read-only audit 2026-11-16 03:36 Asia/Yerevan

## Verified directly in this run
- Supabase project aikxbgixitaaatkmcols: phone_model_translations filled descriptions: ru 754/870, hy 754/754, en 754/754.
- public.brands: 10 rows, 10 is_published, 10 nonblank short_history. This does NOT verify three-language brand histories or visible HTML.
- Table schemas: phone_model_translations has phone_model_id, language_code, description, specifications, updated_at. agent_published_model_editorials has phone_model_id, three description columns, published_at.
- Safe-branch catalog-proxy/api/proxy.js reads agent_published_model_editorials only; it does not fetch phone_model_translations. This is a source-path limitation, not proof that every live page uses the proxy.
- Vercel production deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw is READY; complete file tree returned (23 items), including src/api/cron.js, publication.js, research-v3.js.
- get_deployment_file_contents for cron.js returned truncated base64 (188 omitted characters); do NOT restore truncated bytes as source. GitHub safe branch researcher/src/api/cron.js not found.
- READY is not evidence of scheduled research success.

## Safe next implementation
1. Recover complete source through untruncated API/export, verify hashes before committing to safe branch.
2. Identify actual live catalog URLs and compare HTML for RU/HY/EN; inspect brand history routes similarly.
3. Implement Preview-only model lookup by phone_model_id, preserving approved editorials precedence and source validation. Test unknown model, hy/en fallback, short descriptions, special model names.
4. Before publishing: SQL snapshot, protected publication test, actual HTML check, SQL after, rollback plan. Do not alter prices, images, licenses, CSS, production admin.
5. Diagnose Researcher runtime logs and queue behavior before altering cron.

No production writes or publications were made in this audit.
