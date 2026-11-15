# RetroPhone catalog source audit — 2026-11-15 19:07 Asia/Yerevan

## Read-only production SQL
- phone_model_translations: ru 870 rows / 754 nonempty descriptions; hy 754 / 754; en 754 / 754.
- agent_published_model_editorials: **6** rows with published_at IS NOT NULL.
- No production SQL writes performed.

## Confirmed code-path mismatch
- catalog-proxy/api/proxy.js getEditorial() fetches ONLY agent_published_model_editorials.
- localized() replaces only a literal Russian HTML section matching `<section><h2>История модели</h2>... </section>` and only when description length >=160.
- The 754 per-language descriptions in phone_model_translations are not fetched by this server proxy. Thus they cannot be assumed visible merely because they exist in DB.
- catalog-proxy/retro-i18n.js contains dictionary-based DOM translation, not a reliable replacement for model-specific translations.
- The proxy uses slug -> model_name conversion by replacing hyphens with spaces; exact matching can fail for names whose official punctuation/hyphens differ.
- This is a static code-path finding, NOT yet proof that all production catalog pages use this proxy.

## Safe next steps
1. Identify current production route and fetch actual HTML for a model with three verified translations; compare RU/HY/EN and query row by phone_model_id.
2. In Preview, implement a server-side lookup using phone_models IDs and phone_model_translations(language_code, description), with safe escaping and explicit missing-translation fallback. Preserve editorial override only for verified published editorial, with clear precedence.
3. Test 3 languages, 10 brand histories, links and metadata; no changes to CSS, photos, prices, licenses.
4. Verify production backup restore and authenticated publication before any production writes.
5. Inspect Researcher logs and recover full cron.js, publication.js, research-v3.js without truncation.

No production publication, code deployment, or claim of end-user visibility in this audit.
