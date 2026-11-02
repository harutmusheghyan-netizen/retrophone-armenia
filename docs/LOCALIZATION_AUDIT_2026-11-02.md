# RetroPhone Armenia — RU/HY/EN localization baseline (2026-11-02)

This audit is based **only on checked-in public GitHub snapshots**, not on a live browser test or a current Supabase export. It does not certify production.

## Public catalog snapshot — 2026-10-30

Source: `data/public-catalog/2026-10-30/models-001.json` through `models-009.json` (all nine files inspected).

| Check | Models |
| --- | ---: |
| Unique catalog entries in snapshot | 870 |
| Nonempty `translations.ru.description` | 719 |
| Nonempty `translations.hy.description` | 3 |
| Nonempty `translations.en.description` | 3 |
| Nonempty description in **all three** translation objects | 3 |

The 3 entries with all three snapshot descriptions are Nokia 2610, Nokia 2600, and Nokia 2300. These counts concern the snapshot description fields only: they do **not** imply that every technical specification, button, heading, or live page has been translated. Other 151 entries lack a nonempty `translations.ru.description` field in the snapshot; some have a separate top-level description.

**Nokia 101**: snapshot entry `id=95`, in `models-001.json`, has only the `ru` key in its `translations` object. The top-level description is 188 characters. This directly explains why a complete HY/EN detail page cannot be reconstructed from this snapshot alone.

## Separately published editorial snapshot — 2026-10-31

`data/public-catalog/2026-10-31/model-editorials.json` contains 4 entries with substantial `description_ru`, `description_hy`, and `description_en`: Nokia 3100, 2610, 2600, 2300. This is a **separate** editorial data source, not evidence that all 870 catalog entries are translated.

## Code/deployment boundary

- Draft PR #2 (`fix/trilingual-no-russian-fallback-20261102`) removes two Russian-language fallback paths in `catalog-proxy/retro-i18n.js`. It does not translate existing Russian-only catalog data.
- `catalog-proxy/retro-i18n.js` also contains a small UI-label dictionary and a text-node translator. Unmapped text returns unchanged; therefore it cannot provide complete HY/EN translation of arbitrary long Russian paragraphs.
- The Vercel project `retrophone-armenia` is separate from `retrophone-armenia-catalog`. The full upstream catalog and site sources are not present in this repository, so this branch must not be merged/deployed as a complete site fix.

## Next acceptance gates

1. Recover and review full current upstream catalog source and its live data mapping; do not overwrite the existing design or owner edits.
2. Supply verified full HY and EN descriptions, specification labels and text values, notices, navigation and related-model copy for Nokia 101; then expand to all models.
3. Check each model's RU/HY/EN source fields for completeness and script mismatches; keep proper names and units intact.
4. Test Nokia 101 and other models in a real browser across RU/HY/EN, including URL reload, navigation, mobile layout, and absence of untranslated Russian paragraphs.
5. Only after preview acceptance, consider a production deployment. Preserve rollback and the approved visual design.
