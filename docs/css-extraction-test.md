# CSS extraction: offline test only

Run from the repository root with Node.js 20+:

```sh
node scripts/extract-inline-css.cjs recovery/2026-10-26/site-index.html css-preview
```

The script copies the inline CSS **byte-for-byte** into `css-preview/main.css` and replaces only the original style element in a preview HTML file. It verifies that putting the original element back reproduces the original HTML exactly. The generated `css-preview/` is **not a deployment**.

**Do not merge or deploy this preview as the live site.** The recovered October 26 HTML has not been proven identical to the deployed Vercel homepage. The Vercel file-content connector returned a truncated base64 response when retrieving the live homepage, so exact recovery is currently blocked.

Before integration, obtain the complete deployment source (e.g. from the original Vercel CLI upload/build archive), compare hashes, and visually regression-test RU/HY/EN at mobile and desktop widths. Do not change approved imagery, layout, colors, or navigation. Keep `retro-locale-layout.css` opt-in until screenshot review.
