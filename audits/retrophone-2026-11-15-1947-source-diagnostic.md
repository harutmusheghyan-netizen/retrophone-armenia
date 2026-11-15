# Catalog localization diagnostic — 2026-11-15 19:47 Asia/Yerevan

## Verified read-only SQL
- phone_model_translations: RU 870 rows / 754 nonempty; HY 754/754; EN 754/754.
- 754 distinct model IDs have nonempty HY; 754 have nonempty EN.
- agent_published_model_editorials with published_at IS NOT NULL: 6.
- These counts are database presence only, not evidence of HTML rendering.

## Verified code on safe branch
- catalog-proxy/api/proxy.js (blob ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce) fetches only agent_published_model_editorials.
- It never queries phone_model_translations; therefore this code path cannot independently retrieve the 754 translation records.
- Replacement requires a specific Russian history section HTML regex and text length >=160.
- URL slug handling replaces every hyphen with a space, which can mismatch legitimate hyphenated model names.
- The code injects retro-i18n.js, whose dictionary translates UI labels but does not load phone_model_translations.
- Proxy applicability to current production routes remains unverified.

## Live page verification
- Attempted Nokia 2010 HY and EN catalog URLs; retrieval tool reported inaccessible. No HTML assertion possible.
- Vercel retrophone-research-agent latest production deployment READY; not proof of cron or publication success.

## Safe next implementation
1. Resolve production domain/routes and fetch actual HTML for a representative model in RU/HY/EN; capture headings, descriptions, specs, response status.
2. Resolve canonical phone_model_id from the catalog's model table, not from a hyphen-split slug alone.
3. In Preview, read phone_model_translations by phone_model_id and language_code using a least-privileged read key; preserve the verified editorial precedence and never override images/prices/licensing.
4. Test 2 models x 3 languages plus ten brand histories; compare SQL before/after, DOM/HTML content and screenshots.
5. Inspect researcher cron runtime logs and source files completely before patching; do not infer health from READY.
6. No production publication until a protected restore test and successful Preview verification.

## Changes
No production data or code changed. No publication attempted.
