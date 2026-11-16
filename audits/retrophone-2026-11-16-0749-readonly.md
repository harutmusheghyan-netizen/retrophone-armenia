# RetroPhone read-only audit — 2026-11-16 07:49 Asia/Yerevan

Scope: production Supabase read-only, GitHub safe branch read, Vercel production deployment read. No production writes.

## SQL observations
- phone_model_translations: RU 870 rows / 754 nonempty; HY 754 / 754; EN 754 / 754.
- agent_research_runs statuses: sources_only 961, completed 1.
- Latest started_at: 2026-11-13 01:37:44.097+00 (05:37:44 Yerevan).
- No evidence of new research run after that timestamp in this table.

## Source observations
- GitHub safe branch catalog-proxy/api/proxy.js blob ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce read completely.
- getEditorial() reads agent_published_model_editorials only, not phone_model_translations.
- Model path lookup replaces every hyphen with space, which can change actual model names.
- localized() requires 160+ characters and matches one Russian <section><h2>История модели</h2> HTML pattern; no fallback for other markup.
- Production Vercel Researcher deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY; deployment file tree returned 23/23 entries.
- src/api/cron.js content response is explicitly truncated (188 characters omitted); do not restore this as complete source. Other core source files also need integrity validation.

## Required safe next actions
1. Recover full source from canonical repository, artifact, or an untruncated transfer, validate byte counts and hashes.
2. In Preview, map translations using phone_model_id and language_code; never treat is_published as evidence of visible content.
3. Test actual HTML on RU/HY/EN for representative models and all ten brand histories; compare text against SQL.
4. Diagnose Researcher schedule invocation and source quality gate, distinguishing valid text from unverified images.
5. Publish only verified text in small protected batches after successful Preview and SQL/HTML before-after checks. Do not change design, prices, photos, licenses, or admin Etalon #4.

Production publications: none performed. Source restoration: incomplete. Preview test: not performed.