# RetroPhone verification — 2026-11-07 17:02 Asia/Yerevan

Read-only Supabase SQL verification for project aikxbgixitaaatkmcols:
- phone_models: 870; all 870 have is_published=true (not evidence of public rendering).
- brands: 10; phone_model_translations: 2358.
- en: 744 rows, 744 nonempty descriptions; hy: 744 rows, 744 nonempty descriptions; ru: 870 rows, 744 nonempty descriptions. Therefore 126 models lack a complete set.
- agent_research_tasks: 865 needs_sources, 5 approved.
- latest agent_research_runs row: id 955, autonomous_queue_v3, sources_only, 2026-11-07 01:37:43 UTC.
- brands table has only a single short_history text field (70–124 characters per brand) and history_url pointing to retrophone-armenia-history.vercel.app/*.html; this table by itself does not establish three localized brand histories. Verify the linked pages and their language switching.
- Vercel research-agent production deployment dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw contains source tree including api/cron.js, api/manage.js, api/publication.js, api/research-v3.js, but contents API responses for larger files appear truncated by connector display; do not commit incomplete recovered files.
- Existing recovered api/handoff.js explicitly hardcodes 10 model names; its GET handler rejects other models with model_outside_research_queue. Do not remove the allowlist without validating the downstream bridge and authentication.

No database writes, production deployment changes, or catalog publication were made in this verification. Next: restore complete source through alternate retrieval, test protected publication in preview, compare SQL before/after and live RU/HY/EN pages, then publish verified batches.
