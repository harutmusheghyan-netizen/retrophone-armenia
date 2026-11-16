# RetroPhone Armenia — live HTML / SQL audit

Time: 2026-11-16 22:00 Asia/Yerevan (automation window). Read-only checks.

## SQL
phone_model_translations: ru 870 rows / 754 nonempty descriptions; hy 754 / 754; en 754 / 754. These counts do not establish verified publication or live visibility.

Sample ID 1 Nokia 6555 has distinct RU/HY/EN description text in SQL; ID 2 Nokia 6500 slide also has three texts.

## Actual HTTP HTML (production catalog domain)
- /phones/nokia/2010?lang=ru: HTTP 200, html lang=ru, data-rp-verified-history=true, Cyrillic chars ~2169.
- /phones/nokia/2010?lang=hy: HTTP 200, html lang=hy, data-rp-verified=true; Armenian text in title and meta description. Full HTML retrieved.
- /phones/nokia/2010?lang=en: HTTP 200, html lang=en, data-rp-verified-history=true; ~455 Cyrillic chars remain in HTML, likely untranslated content/metadata, needs DOM-context audit.
- /phones/nokia/6555?lang=hy: HTTP 200, html lang=hy, data-rp-serverlocalized=true, ~492 Armenian and ~416 Cyrillic characters in raw HTML; data-rp-verified-history marker absent. This is NOT proof the translated model description is missing, since it uses a different server-localized path. Inspect DOM and metadata separately.

## Source inspection
catalog-proxy/api/proxy.js on safe branch reads agent_published_model_editorials, not phone_model_translations; retro-i18n.js also has separate client-side logic. Avoid claiming all catalog pages depend solely on this proxy: live 6555 page shows server-localized marker.

## Limitations
No production mutation, no publication, no claims of all 870 model pages or ten brand histories verified. Researcher runtime error aggregation unavailable without explicit Vercel team scope. Follow up: compare rendered history sections and JSON-LD on HY/EN, inspect all brand-history routes, then test a patch in isolated Preview before deployment.
