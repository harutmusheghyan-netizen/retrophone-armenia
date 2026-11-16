# RetroPhone Armenia — read-only verification, 2026-11-16 09:25 Asia/Yerevan

## SQL snapshot (production project aikxbgixitaaatkmcols)
phone_model_translations: ru 870 rows / 754 nonblank, hy 754 / 754, en 754 / 754.
agent_research_runs: 962 total, 961 sources_only, 1 completed; last started 2026-11-13 01:37:44.097+00 (05:37:44 Yerevan).
No SQL mutations performed.

## Code audit
Read complete catalog-proxy/api/proxy.js from safe/catalog-i18n-audit-20261115, blob ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce.
Confirmed:
- reads agent_published_model_editorials, not phone_model_translations;
- identifies model by replacing URL hyphens with spaces and case-insensitive name, not phone_model_id;
- replacement regex only matches Russian heading <section><h2>История модели</h2>, and skips descriptions under 160 characters;
- localized history replacement only occurs if an editorial is returned;
- on editorial lookup failure returns upstream HTML without surfacing failure to user.
These are code findings, not proof of a specific production-page defect.

## Vercel
Latest listed retrophone-armenia deployment dpl_9znbY4uYEASG12J67gDtBQCvum96 READY, target null, commit fc7bba36 on safe branch.
Researcher production dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY; READY does not establish successful scheduled execution.

## Required before protected publication
Recover full Researcher source without truncation, compare with GitHub and deployment; map stable phone_model_id to URL; add language-specific text from phone_model_translations without touching existing CSS/images/prices; verify Preview rendered HTML for sample models and 10 brand histories in RU/HY/EN; SQL snapshots before/after; validate publication authorization and duplicate safeguards.
No code fix, deployment, publication or live HTML verification claimed in this run. Deferred 10 IDs remain untouched.
