# RetroPhone Armenia — Unified Administration v1 (2026-11-08)

## Scope / safety

A protected **preview**, separate from the approved main website and original admin release.

- Main: `retrophone-armenia.vercel.app` → pinned `dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu`.
- Existing standalone admin: `retrophone-armenia-admin.vercel.app` → pinned `dpl_EjxMB8H3LiyNeHk86uqDtnovCfzm`.
- Unified five-tab admin preview: `dpl_Cq6cbJHzb7oyp74G5pyy8s6V53sA` (READY, preview, **no production aliases**).
- GitHub branch: `feature/unified-admin-20261108`; PR #13 remains DRAFT.
- Saved approved mobile appearance `backup/mobile-1-20261108` kept unchanged.

## Delivered

| Section | UI / draft / preview | Server-protected write | Live public page |
|---|---|---|---|
| News | Existing full editor with three languages, licensed photos/gallery and new YouTube URL + RU/HY/EN captions | Isolated `retro_news_publish_draft_v2` validates admin, preview, translations, photo licensing and video. Original v1 is untouched. | Existing news page may **not render video** yet: frozen `/news/index.html` has no `video_url` or YouTube/iframe support |
| Catalog | Select/search 870 models, RU/HY/EN descriptions, model name/year, optional licensed photo | `cms_save_admin_draft` / `cms_preview_admin_draft` / `cms_publish_admin_draft`; model and translations update in DB after preview. Product prices, stocks, visible listing are changed **only with explicit inventory toggle**. | Existing catalog DB consumer may show new text; public live card must be independently verified after first authorized publication |
| Brand histories | All 10 brands, three histories, licensed photo metadata | Publishes RU short history to `brands`; multilingual document to `cms_published_blocks`, with audit | Standalone history pages are currently static external Vercel pages — adapter not yet connected |
| About | Title/body in RU, HY, EN, optional licensed image | Protected drafts, preview, publish to `cms_published_blocks` with audit | Approved homepage About section is static, not yet connected |
| Homepage | Only named text blocks `hero,about_excerpt,news_heading,catalog_heading,footer_note`; no arbitrary CSS, HTML or layout changes | Protected drafts, preview and publication to CMS DB | Frozen homepage static HTML not yet connected; **no changes to approved design** |

## Implemented SQL

- `recovery/2026-11-08/unified-admin-v1.sql` — three new isolated tables, strict RLS grants/policies, three checked admin RPCs.
- `recovery/2026-11-08/unified-admin-v1-hotfix-01.sql` — fixes duplicate PL/pgSQL alias from first transaction test.
- `recovery/2026-11-08/unified-admin-v1-hotfix-02.sql` — product availability (is_published) changes only under explicit price/stock edit.
- `recovery/2026-11-08/news-video-publisher-v2.sql` — adds an opt-in guarded video-enabled news RPC; the first migration attempt was rejected for SQL syntax, corrected and then applied; original RPC unchanged.

## Verified tests

1. SQL synthetic-admin transactions: protected save → preview → publish for About, Catalog (including temporary price/stock), Brand, Homepage; premature publish denied. **All changes ROLLBACK**, no real model/news/stock changed.
2. News video v2: test draft with YouTube URL and three captions, preview, protected publish then **ROLLBACK**; video fields persisted within transaction, no live news published.
3. Public RPCs, drafts and audit: HTTP 401 for anonymous `cms_save_admin_draft`, `cms_preview_admin_draft`, `cms_publish_admin_draft`, `retro_news_publish_draft_v2`, and SELECT draft/audit.
4. Desktop/mobile Chrome: five tabs render; at 390/980 px one column; at 1300 px two columns; JavaScript syntax and original login code checked.
5. Vercel protected fetch: preview HTML and `admin-unified.js` both HTTP 200, preview asset/logo and Commons lookup proxy HTTP 200.
6. Post-test DB counts: 870 models, 26 published news, 0 products, 0 news drafts, 0 CMS drafts, 0 CMS published blocks.
7. Main and original admin Vercel deployment aliases unchanged.

**CI:** https://github.com/harutmusheghyan-netizen/retrophone-armenia/actions/runs/42421255609

## Still not verified / release gates

- **Real administrator login, edit, preview and publication through the new browser UI:** requires the user's authorized session, not a simulated SQL claim. Do not treat backend rollback test as real sign-in.
- **Static page integration:** Main, About, and external brand history Vercel pages must read CMS blocks through a tested adapter without any CSS/layout change. Until then the interface explicitly reports `awaiting_site_integration` and `live_site_verified=false`.
- **News videos on frontend:** Protected database v2 can store YouTube video and captions, but current frozen News page does not display video yet. Needs a separate verified news renderer update.
- **Photo upload on new catalog/brand/about editor:** For now, it accepts licensed Commons URLs and credits, not new binary file uploads. Existing News editor still supports upload.
- **Password reset:** Integrated editor redirects to old standalone admin; reset callback not yet verified.
- **Complete original Vercel production source and tested independent restore:** still prerequisites before promoting a new main site release.
- **No automatic promotion** of new admin preview to production.

## Release instructions

Keep `№1 Mobile` reference untouched. Do not merge this reference branch to `main`. First test the preview with a real admin session (save a draft, read it back, preview; only a controlled protected publish after checking values), then separately develop/review static-site content adapters in staging, and only then promote verified deployment. The working production homepage remains the rollback target.
