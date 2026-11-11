# Translation display / security gate — 2026-11-11 16:09 Asia/Yerevan

Read-only investigation, no production changes.

## Verified code path
- recovery/catalog/index.html loads /approved-translations.js, /retro-i18n.js, /retro-live.js and /catalog-data.js.
- index.html does not invoke RetroPhoneApprovedTranslations.pickApprovedTranslation.
- approved-translations.js exports a pure function requiring editorial.published_at, matching editorial.phone_model_id, and exact equality between editorial.description_<lang> and phone_model_translations.description.
- index.html includes a public Supabase products REST fetch for stock, but no confirmed phone_model_translations fetch. The fallback warning checks window.__retrophoneCatalog?.source.
- Vercel latest Preview from commit 92895986 is READY; HTTP/DOM language rendering is not yet verified.

## Database facts from read-only SQL
- phone_model_translations: ru 870 rows / 754 descriptions >=80 characters; hy 754/754; en 754/754.
- phone_model_translations columns: phone_model_id, language_code, description, specifications, updated_at.
- RLS SELECT policy for anon/authenticated: "Public can read published phone translations". phone_models has "Public read published models".
- Existing public read policy is not a substitute for editorial approval; do not expose unpublished descriptions.

## Implementation gate
1. Identify the exact editorial publication table and schema; verify the approval relation and effective RLS filtering.
2. In Preview only, retrieve published models and their approved translations with a public key, never service_role.
3. Invoke pickApprovedTranslation only when the matching editorial revision is verified. Keep existing fallback text when approval is absent.
4. Test one model on ru/hy/en, compare DB text with browser DOM and network responses, including absence of unapproved text.
5. After protected single-item publication and SQL+DOM before/after, permit a bounded batch with idempotency and rollback.
6. Do not change design, prices, photos, image licensing, production data, or Admin panel #4.

No publication or successful browser rendering is claimed by this audit.
