# Catalog translation display audit — 2026-11-11 13:49 Asia/Yerevan

Scope: read-only Supabase + GitHub source audit; no production writes.

## Verified SQL counts
- phone_models: 870; brands: 10
- phone_model_translations descriptions >=80 characters: ru 754, hy 754, en 754
- agent_published_model_editorials rows: 6 (not proof of display)
- brands.short_history >=80 characters: 8 of 10
- agent_research_runs latest id 962, sources_only, 2026-11-11 01:37:42 UTC; quality_gate.publicationAllowed=false

## Source-level findings
- recovery/catalog/index.html loads /catalog-data.js, /approved-translations.js, /retro-i18n.js, /retro-live.js.
- The index.html contains no reference to phone_model_translations, no call to pickApprovedTranslation, and its direct Supabase REST fetches target products stock only.
- recovery/catalog/retro-i18n.js contains interface text dictionaries and DOM text translation, not a confirmed lookup of phone_model_translations.description.
- recovery/catalog/retro-live.js polls /api/content-revision for reloads; it does not fetch descriptions.
- Thus database translation completeness is not evidence of rendered descriptions. Confirm the actual served JS, browser DOM, and authenticated API before any publishing.
- Vercel Preview dpl_9mGihYDoSuubVWbXXNZcvELPZYqj READY at commit 641b940e; real HTTP fetch failed in this execution environment, so rendering is UNVERIFIED.
- GitHub comparison with fix/catalog-verified-pilot-20261107: branch diverged (ahead 2, behind 1); do not merge blindly.

## Next safe steps
1. Obtain successful HTTP and DOM capture for representative model pages in ru/hy/en and all brand histories, including source provenance.
2. Identify current catalog's authoritative read endpoint and implement an allowlisted, read-only translation fetch in Preview, preserving layout and assets.
3. Check authorization, idempotency, and source/license gates of publication handler; compare SQL before/after plus actual DOM before batch publication.
4. Researcher quality gate id 962 has only one source and requires human review; never bypass validation merely to force publication.

No claims of deployed fixes or newly published models.
