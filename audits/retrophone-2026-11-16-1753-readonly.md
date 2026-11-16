# RetroPhone audit — 2026-11-16 17:53 Asia/Yerevan

Read-only checks executed against Supabase project `aikxbgixitaaatkmcols`, GitHub safe branch, and Vercel Researcher deployment. No production writes.

## SQL results
- `phone_model_translations`: RU 870 records / 754 nonempty descriptions; HY 754 / 754; EN 754 / 754.
- Independent anti-join against `phone_models`: 870 models; 116 lack a nonempty HY description and 116 lack a nonempty EN description.
- First missing HY model IDs: 243, 448, 454, 459, 460, 478, 479, 480, 491, 498, 501, 503. **ID 243 is in the user's explicitly deferred batch; do not edit.**
- These are database counts, **not proof of rendered page correctness**.

## Code inspection
`catalog-proxy/api/proxy.js` SHA `ddbd08357a3aa850ea25fdc0b013fe4c3a7719ce` still queries `agent_published_model_editorials` only. It never queries `phone_model_translations`. Model lookup changes slug hyphens to spaces and requires an exact case-insensitive name match. `localized()` refuses text under 160 characters and matches only a Russian HTML heading. Errors in `getEditorial()` silently return null. These conditions can suppress verified translations; they do not establish which public URLs fail.

## Researcher recovery
Vercel deployment `dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw` returned a complete 23-entry **file tree** (not complete file contents), including `src/api/cron.js`, `src/api/publication.js`, `src/api/research-v3.js`. Previous content responses were truncated. Do not claim full source recovery until exact content is verified.

## Next safe change gate
1. Recover complete file bytes (compare length/hash); keep the snapshot in a separate safe branch.
2. Resolve model identity via stable `phone_model_id`, not guessed slug; preserve editorial verification and published state.
3. Test translations on Preview across RU/HY/EN and all ten brand histories, comparing real HTTP HTML and SQL before/after.
4. Only then publish verified batches, preserving design, prices, images and licensing; do not change deferred model IDs.
5. Diagnose Researcher run transitions and cron logs before changing scheduling or publication protection.

No code fix, Preview deployment, or production publication was performed in this audit.
