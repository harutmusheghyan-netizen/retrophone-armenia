# RetroPhone Armenia — audit 2026-11-15 23:48 Asia/Yerevan

## Read-only checks
- Supabase project aikxbgixitaaatkmcols: phone_model_translations grouped by language: en 754/754 nonempty; hy 754/754; ru 754/870.
- agent_published_model_editorials: 6 rows, 6 distinct phone_model_id, all 6 published_at not null.
- GitHub safe/catalog-i18n-audit-20261115 catalog-proxy/api/proxy.js read in full (blob ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce). Its getEditorial reads only agent_published_model_editorials, not phone_model_translations; URL slug matching replaces hyphens with spaces; localized() requires >=160 characters and matches a Russian-language section literal.
- Vercel retrophone-research-agent deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw is READY/production. Source tree includes src/api/cron.js, publication.js and research-v3.js.
- Fetch of src/api/cron.js (file id fa5cdbf6b13f1eed2db35dc2b4fa3032d10a35c7) returned truncated=true with 188 omitted characters. The returned partial base64 is NOT a complete source file; do not commit it as recovered.
- No successful HTML validation, preview deployment, agent execution, protected publish, or source recovery in this run.

## Next safe steps
1. Obtain complete deployment source files by an untruncated method and verify byte lengths and hashes before committing to a safe branch.
2. Check live route HTML for a sample of models and all 10 brand pages in ru/hy/en.
3. Implement and test translation lookup keyed by phone_model_id in isolated Preview; preserve published verified editorial priority and original design/media.
4. Capture SQL before/after and real HTML before protected batch publishing.
5. Investigate Researcher queue behavior and logs. READY does not establish job success.

Production writes: none. New publications: zero. Deferred model IDs 233,243,337,423,432,433,434,436,438,444 untouched.
