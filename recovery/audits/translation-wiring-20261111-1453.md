# Catalog translation wiring audit — 2026-11-11 14:53 Asia/Yerevan

Read-only source and SQL review. No production changes.

## Confirmed source behavior
- `recovery/catalog/index.html` includes `/approved-translations.js`, `/retro-i18n.js`, `/retro-live.js`, and `/catalog-data.js`.
- The HTML does **not** call `RetroPhoneApprovedTranslations` or `pickApprovedTranslation`; merely loading the helper does not render translations.
- The HTML does **not** reference `phone_model_translations` or its REST endpoint. Its only observed Supabase REST request is to `products` for stock quantities.
- `retro-live.js` polls `/api/content-revision` and reloads the page on revision changes; it does not fetch translations.
- `approved-translations.js` explicitly requires a matching published editorial record and exact text equality before returning a translation. Do not bypass this gate.

## Database read-only results
- `phone_model_translations`: RU 870 rows / 754 descriptions >=80 chars; HY 754/754; EN 754/754.
- `brands`: 10 rows; short_history <80 chars for Alcatel (71) and Siemens (70). This is a length heuristic, not a determination of publication readiness.
- `agent_research_runs`: 958 sources_only, 1 completed.

## Next safe implementation
1. Locate the actual deployed catalog entrypoint and editorial publication table/schema.
2. Add a server-side read-only endpoint returning only editorial-approved, published, exact-match translations, without exposing service-role credentials.
3. In a separate Preview build, invoke that endpoint on model detail views; render text via textContent (not innerHTML); preserve static fallback, design, photos and prices.
4. Verify API response and DOM text on three languages for sampled model IDs, then compare to SQL and perform one authorized publication test with before/after snapshots.
5. Keep batch publication blocked until successful Preview verification and no regression.

Deployment READY alone is not evidence of browser rendering. No protected publication was attempted.
