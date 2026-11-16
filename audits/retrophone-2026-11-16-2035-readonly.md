# RetroPhone Armenia — read-only audit, 2026-11-16 20:35 Asia/Yerevan

## Live evidence
Supabase project aikxbgixitaaatkmcols:
- phone_model_translations: ru 870 rows / 754 nonblank descriptions; hy 754/754; en 754/754.
- agent_research_runs: sources_only 961, completed 1.
- This is database coverage, **not** evidence of HTML rendering.

GitHub safe/catalog-i18n-audit-20261115:
- catalog-proxy/api/proxy.js blob ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce retrieved completely.
- catalog-proxy/retro-i18n.js blob 706b3cab9103773d003cfc4a07c707e9a760092b retrieved completely.
- Server proxy reads agent_published_model_editorials only, not phone_model_translations.
- Client enrichment code uses editorial['description_'+lang] || editorial.description_ru: **RU fallback on HY/EN** when editorial translations are missing.
- Server substitution only matches Russian `<section><h2>История модели</h2>` and requires >=160 characters, so it can silently leave original HTML unchanged.
- The client enrichment fetch uses model_name ilike name; no phone_model_id join. Both matching and locale need isolated regression tests.
- The client enrichment can insert media into gallery; **do not deploy this change** without checking photo/license invariants.

Vercel:
- Researcher production deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY.
- Source tree lists 23 entries; src/api/cron.js, publication.js, research-v3.js identified.
- Source content API truncates base64 data for cron.js (188 omitted characters) and publication.js (664 omitted characters); never treat these as complete originals.
- READY does not prove a successful research job.

## Next safe work
1. Obtain exact Researcher source via Git-backed source or alternative full-byte retrieval; verify file size/hash.
2. In Preview, make phone_model_translations canonical for description by phone_model_id and language_code, without changing layout, prices, media, licenses.
3. Remove silent RU fallback for HY/EN content; display explicit translation-unavailable state rather than mislabel Russian as Armenian/English.
4. Test sample model pages and all ten brand histories in RU/HY/EN; record HTTP status, rendered text, SQL before/after, and actual publication result.
5. Keep production, admin Etalon #4 and excluded ten-model translation batch unchanged until tests pass.

No production writes, publication, or confirmed HTML verification in this run.
