# RetroPhone audit — 2026-11-16 00:45 Asia/Yerevan

## Live read-only checks
Supabase project aikxbgixitaaatkmcols: phone_model_translations totals RU 870 (754 nonempty), HY 754 (754 nonempty), EN 754 (754 nonempty). These counts do NOT establish live HTML display.

GitHub safe/catalog-i18n-audit-20261115 catalog-proxy/api/proxy.js SHA ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce. Its getEditorial() reads agent_published_model_editorials, not phone_model_translations. It matches model name reconstructed by replacing URL hyphens with spaces, requires >=160 chars, and replaces only a Russian-language section regex. Production routing to this proxy remains unverified.

Vercel production Researcher deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw READY. Source tree lists src/api/cron.js, publication.js, research-v3.js. Fetching these source files returns base64 data truncated by connector (188, 664, 6932 omitted characters respectively). Do not commit incomplete source.

The visible prefix of cron.js decodes to a queue() request using action queue_next and model '2300'. Whether the backend uses this as a fixed model or an ignored hint must be checked before changing logic.

## Safeguards and next actions
Recover exact full source through a non-truncating transport; verify byte counts and hashes. Inspect routing and live HTML for representative RU/HY/EN model pages and all 10 brand histories; compare SQL before/after. Test a phone_model_id keyed translation fallback in isolated Preview while retaining verified editorial precedence. Check Researcher logs and queue behavior. No production writes or publishing performed in this audit; no deployment or approved design change.
