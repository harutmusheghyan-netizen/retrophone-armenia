# RetroPhone Armenia — safe CSS integration (draft)
This branch is **not production**. The approved visual design is frozen.

## Verified source situation
- The GitHub main branch has a recovered homepage at `recovery/2026-10-26/site-index.html` with a single embedded `<style>` block.
- The current Vercel deployment includes `src/index.html`, `src/admin/index.html`, news and individual Nokia pages. Those exact deployed sources are **not confirmed** to be identical to the recovered homepage.
- `catalog-proxy/retro-locale-layout.css` is an opt-in draft; it is not currently linked into deployed HTML.

## Integration procedure
1. Recover the **exact current deployed source** of each page and compare its SHA-256 hash with the checked-in source. Do not substitute the October 26 recovered page for the current production homepage.
2. Make a byte-for-byte baseline copy of each page and record screenshot baselines at desktop (1440px) and mobile (390px), for RU/HY/EN.
3. Extract the embedded CSS into `assets/css/main.css` **without changing any declaration or its order**. Replace the old style block with a stylesheet link only after testing. Keep original HTML as backup.
4. Load `assets/css/locale.css` only after verifying the selectors do not change the approved design. Start with typography and wrapping fixes only. Do not change hero, logos, image positioning, colors, or desktop layout.
5. Test navigation, catalog search, Nokia 101, another Nokia model, news, admin, and brand histories in all three languages. Verify that the `<html lang>` attribute changes with the selected language and the text is actually translated.
6. Compare screenshots for regressions; check console errors, CSS requests, keyboard focus, and responsive widths 320/360/390/768/1440px.
7. Keep production untouched until tests pass and the owner approves the reviewed deployment.

## Release gates
- No missing CSS (HTTP 200).
- No layout changes on approved RU design.
- No clipped text on HY/EN mobile layouts.
- No accidental Russian fallback for untranslated content.
- Admin authentication and authorization unaffected.
- Rollback available from a verified independent backup.

**Important:** CSS alone cannot supply missing Armenian or English translations. The separate localization PR and database content must be validated independently.
