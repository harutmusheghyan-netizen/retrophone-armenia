# Editorial/translation exact-match audit — 2026-11-11 16:46 Asia/Yerevan

Read-only Supabase audit for project aikxbgixitaaatkmcols. Do not treat `is_published` as proof of browser rendering.

## Verified result
Six published editorial rows were joined by `phone_model_id` to `phone_model_translations`.
- RU: 2/6 exact matches, 4/6 different texts; no missing translation rows.
- HY: 6/6 exact matches.
- EN: 6/6 exact matches.
- RU mismatches: 68 Nokia 3100 (372 vs 509 chars), 80 Nokia 2610 (914 vs 1835), 81 Nokia 2600 (929 vs 1815), 84 Nokia 2300 (829 vs 2229). Lengths are editorial vs translation respectively.
- `approved-translations.js` requires exact text equality, so these four RU texts fail its approval gate. Do not overwrite either version automatically; investigate revision history and reapprove only after verification.
- `recovery/catalog/index.html` loads `/approved-translations.js` but contains no call to `pickApprovedTranslation`. Therefore even the 14 matching combinations are not demonstrated as rendered. The catalog page needs a tested integration path in Preview.

## Reproduce safely (SELECT only)
```sql
WITH e AS (
 SELECT phone_model_id,description_ru,description_hy,description_en
 FROM public.agent_published_model_editorials WHERE published_at IS NOT NULL
), j AS (
 SELECT e.phone_model_id,l.lang,l.approved,t.description
 FROM e CROSS JOIN LATERAL (VALUES
 ('ru',e.description_ru),('hy',e.description_hy),('en',e.description_en)
 ) l(lang,approved)
 LEFT JOIN public.phone_model_translations t
 ON t.phone_model_id=e.phone_model_id AND t.language_code=l.lang
)
SELECT lang,count(*) editorial_rows,
 count(*) FILTER (WHERE approved=description AND length(trim(coalesce(description,'')))>0) exact_matches,
 count(*) FILTER (WHERE description IS NULL) missing_translation,
 count(*) FILTER (WHERE approved IS DISTINCT FROM description) mismatches
FROM j GROUP BY lang ORDER BY lang;
```

## Gate before publishing
1. Inspect the source/revision history of four Russian differences; do not substitute unapproved text.
2. Restore complete deployable sources and test Preview HTTP + browser RU/HY/EN, including 10 brand histories.
3. Test server-side authorization and SQL before/after for one model; confirm real HTML and no changes to photos, licensing, prices, or design.
4. Only then consider small batches. Keep production and Admin Etalon #4 unchanged.
