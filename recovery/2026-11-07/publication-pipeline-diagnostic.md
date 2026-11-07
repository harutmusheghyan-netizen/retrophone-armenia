# RetroPhone Armenia — publication pipeline diagnostic, 2026-11-07

## Confirmed root causes

1. Vercel research-agent `src/api/archives.js` intentionally runs with `archiveOnly: true` and `publication: false`. It must not be converted to a publisher by changing response flags.
2. Supabase `retrophone-agent-sync` v16 contains `auto_publish:false`, `publishingDisabled:true`, `ready_for_publication:false` for archive/review/handoff paths despite `agent_research_settings.auto_publish=true`. Its `save` action always labels discovered sources as `candidate`. The owner-approved batch publication path is separate.
3. `agent_refresh_quality_gate` allows released-year verification with multiple museum sources, while the original `agent_autopublish_verified_research` separately insists on an official year-evidence URL. This blocks fully researched early models without a surviving press release.
4. Existing `multiagent-controller` records unverified source/translation drafts and calls the old publisher; it does not verify every historical claim. Do not promote candidate sources simply because they returned HTTP 200.
5. The initial pilot insert failed SQL check constraint `agent_published_model_editorials_publication_method_check`: only `owner_approved` and `autonomous_source_verified` are permitted. Fixed by using the existing allowed value; no schema constraint was weakened.

## Changes applied

- Installed `retrophone_internal.publish_verified_editorial_pilot(bigint,boolean)` via Supabase migration. Runs as SECURITY INVOKER, executable only by `service_role`, not `anon` or `authenticated`.
- Strict one-model checks: latest research run & quality score >=90, exact model identity, two independent verified museum/manufacturer domains with matching year evidence, photo evidence or three failed searches, verbatim existing reviewed RU/HY/EN translations, and idempotent insert into public editorial overlay.
- Prepared Nokia 2010 (phone_model_id=89, task_id=606, run_id=666) using two independent museum references and existing complete catalog translations. Existing photographs, prices, stock, layout and `phone_models.description` were not altered.
- Dry run returned `ready:true`.
- Actual insert returned `published:1`, then repeat returned `already_published:true`. Existing `agent_published_model_editorials` entries: 5 -> 6.
- Read-only public-role (`anon`) database SELECT returned three text fields for model 89 (RU 1798, HY 1879, EN 1703 chars); confirms RLS public exposure.
- 870 phone models remain, 385 already have hero images. The Nokia 2010 editorial references both museums and retains the existing licensed photo.

## Follow-up gates before mass publishing

- The actual public model-page HTTP body could not be fetched from the test environment, despite Vercel indicating `retrophone-armenia-catalog` production deployment READY. **Do not equate READY/RLS SELECT with a verified live rendered page.**
- Verify all three HTML pages (and proper localized headers/body) at:
  - https://retrophone-armenia-catalog.vercel.app/phones/nokia/2010?lang=ru
  - https://retrophone-armenia-catalog.vercel.app/phones/nokia/2010?lang=hy
  - https://retrophone-armenia-catalog.vercel.app/phones/nokia/2010?lang=en
- Recover complete deployed `src/api/research-v3.js`, `handoff.js`, and `publication.js` before rewriting them. The available Vercel file-content response truncates the source. Do not replace working routes from partial files.
- Once live pages verified, integrate an authenticated service_role-only call to the guarded publisher after source/fact/media/translation checks; start with a batch of at most 5 **eligible** models. Keep a dry-run, error log, idempotency, strict per-model quality gates, and rollback path.
- The remaining archive tasks are **not** publishable merely by turning on a boolean: 864 quality gates `needs_sources`, 5 `needs_editor_review`, 1 `needs_translation` at last check. Route through source verification and translation QA before publishing.
- No mass batch launched in this session.

## Relevant SQL
- `recovery/2026-11-07/verified-catalog-pilot.sql` — guarded publisher
- `recovery/2026-11-07/verified-nokia-2010-pilot-data.sql` — source and existing translation preparation

No credentials, secret values, private inventory records or personal data are stored in this note.
