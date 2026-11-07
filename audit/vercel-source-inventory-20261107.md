# Verified Vercel source recovery inventory — 2026-11-07

This is an evidence inventory, NOT a claim that the complete application was restored. Do not deploy these historical files over production without visual and database tests.

## Confirmed deployment sources
- Production deployment `dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu` (READY): Vercel source tree available under `src/`. Contains `index.html`, `admin/index.html`, `api/{ixbt-news,news-image,retro-commons,retro-news}.js`, `news/index.html`, `news/archive/index.html`, `assets/retrophone-logo.avif`, 15 Nokia HTML pages, `robots.txt`, `sitemap.xml`, and `sitemap/index.html`.
- Production deployment `dpl_2DHA1zBs8ja3yNr58PvWjnLjDFYV` (READY): similar source tree, plus `verified/index.html`; its sitemap files differ.
- Newer deployment `dpl_AynfUZeS7Uip3oKdYoJA2ZPEP4zg` (READY, target null) has GitHub commit `7bb19fe9c0937f0ee3a8d52c5bed662b96d1351c`; it is not proven to be the public production version.

## Content verification
- Vercel file-content API successfully returned base64 contents for `src/robots.txt` from `dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu`, SHA-like file uid `dbb69706059d7569baf04f04a3d4ab51f2bb92bb`.
- Decoded text:
```txt
User-agent: *
Allow: /
Sitemap: https://retrophone-armenia.vercel.app/sitemap.xml
```
- Vercel also returned source content for `src/api/retro-news.js`, but output was truncated. It is NOT archived or verified in full.

## Safe recovery procedure
1. Fetch each source file without truncation; verify bytes and record checksums.
2. Recover into this audit branch, preserving directory structure and historical provenance.
3. Compare recovered files against current production HTML, API routes and screenshot baselines; never overwrite approved design.
4. Confirm SQL translations and actual rendered pages in RU/HY/EN before protected batch publication.
5. Keep credentials and secrets out of GitHub.

No production deployment, database write, image, license, price or CSS change is authorized by this inventory.
