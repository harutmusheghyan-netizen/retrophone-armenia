# RetroPhone audit — 2026-11-15 22:50 Asia/Yerevan

## Fresh read-only checks
Supabase project aikxbgixitaaatkmcols: phone_model_translations ru 870 rows / 754 nonblank; hy 754/754; en 754/754. No production writes.
information_schema confirms phone_model_translations(phone_model_id bigint, language_code text, description text); agent_published_model_editorials(phone_model_id bigint, brand text, model_name text, published_at timestamptz). phone_models(id bigint,model_name text,is_published boolean). Brands has name, slug, short_history, is_published.
Vercel: retrophone-research-agent production dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY. retrophone-armenia latest returned deployment dpl_BKQnN1npZ4DijPD51349Cysh99Wt READY but target null (not production).
GitHub safe branch catalog-proxy/api/proxy.js blob ddbd08357a3aa850ea25fdc0b013fe4c3 inspected in full. Its getEditorial only reads agent_published_model_editorials, not phone_model_translations. It matches URL model slug by replacing all hyphens with spaces, which can lose actual hyphenated model names. localized() requires at least 160 characters and exact Russian HTML section. Do not assume this proxy serves every public page.

## Next controlled work
1. Recover Researcher source files byte-for-byte and verify hashes before modifying cron/publication/research-v3.
2. Resolve canonical live catalog route and compare HTTP rendered RU/HY/EN with database values for named IDs; check ten brand histories.
3. Implement a Preview-only adapter using phone_model_id and language_code, with published verified editorials taking precedence and safe escaping. Confirm RLS/anon API exposure before fetching. Do not bypass source verification.
4. Run protected write test on isolated staging and verify SQL and public HTML before any production batch.
5. Investigate Researcher execution logs; READY alone does not prove runs.
Deferred 10 model IDs remain untouched. No photos, prices, licenses, CSS, production data, or admin panel changes.
