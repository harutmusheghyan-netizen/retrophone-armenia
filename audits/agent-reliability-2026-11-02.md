# RetroPhone agent reliability — verified audit (2026-11-02)

## Read-only baseline from Supabase
- 870 workplan rows: 20 pilot_active, 850 planned.
- 870 research tasks: 5 approved, 865 needs_sources.
- Quality gate: 864 needs_sources, 1 needs_translation, 5 needs_editor_review.
- Enrichment: 371 photo_found, 499 no_licensed_photo. Do not infer these photos are approved for publication without license checks.
- 5 rows with published_at in agent_published_model_editorials; public-site visibility NOT verified.
- In last 24h agent_worker_events: 1 queue_claimed, 3 save_duplicate. Event logging coverage may be incomplete.
- Six Supabase Edge Functions report ACTIVE; runtime success NOT established.
- Supabase security advisors flag privileged RPC grants; audit before changing any policy.

## Safety-first implementation checklist
1. Inspect source-discovery and source-verifier logs and their contract: task IDs, claim/lease expiration, attempts, errors and durable source evidence.
2. Add idempotent work claims, unique publication identity, bounded retry with backoff, and dead-letter state. Do not silently retry duplicates.
3. Implement deterministic quality gates: exact brand/model match, independent credible sources, RU/HY/EN completeness, licensed photo attribution when photo exists. Allow a card without a photo after three documented searches.
4. Separate 'verified in DB' from 'visible on website'; verify a public URL after publish and record result.
5. Provide an hourly dashboard with claimed/completed/blocked/published counts, last successful worker run and oldest stale lease.
6. Test on isolated branch/staging with a small pilot. Do not alter production or existing records without verified rollback.

## Blocking conditions
- Full live website source is not yet confirmed in GitHub, so end-to-end publishing cannot be validated safely.
- No production changes authorized by this audit. No database mutations performed.
