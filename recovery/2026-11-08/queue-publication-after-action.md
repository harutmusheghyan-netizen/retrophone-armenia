# RetroPhone Armenia — status after protected catalog queue repair
**Checkpoint:** 2026-11-08, approximately 00:55 Yerevan time (UTC+04:00).
**Scope:** Catalog research/quality/publish queue, not news and not inventory.

## Verified before / after

| Test | Prior state | Current verification |
|---|---|---|
| Nokia 2010 RU/HY/EN live HTTP | GitHub Actions failed all 3 because matcher searched for literal `\\b` | GitHub run [42412739359](https://github.com/harutmusheghyan-netizen/retrophone-armenia/actions/runs/42412739359) SUCCESS; all 3 pages HTTP 200, proper HTML `lang`, localized title, history section, model identity, source links |
| Auto publisher DB entrypoint | `public.agent_autopublish_verified_research(integer)` blocked early models when the year was supported by two museums but not by an official manufacturer URL | Replaced with guarded handoff to `retrophone_internal.publish_verified_editorial_pilot`; each candidate rechecked individually, MAX 3 models per call |
| Authentication | Existing publisher service_role-only | Retained `SECURITY DEFINER` wrapper (owned by postgres), `EXECUTE` revoked for `PUBLIC`, `anon`, `authenticated`; `service_role` granted. Service role intentionally has no USAGE on the private schema, so this privileged wrapper is necessary and narrowly scoped |
| Idempotence | Single-model pilot not previously exercised against live HTML | Nokia 2010 editorials: exactly one row; subsequent pilot invocation reports `already_published:true`, `published:0` |
| Rejection of poor evidence | Not demonstrated in this test | Nokia 6103 with quality score 40: `quality_gate_blocked`, reports missing year/source/license checks, no publication |
| Cron | Existing jobs #3 (publisher) and #10 (source verifier), every 10 minutes | Both ACTIVE; latest reviewed run details `succeeded`; new publisher called as `service_role` returned `ok:true`, `attempted:0`, `published:0` |
| Research sources | Pending independent verification | One manual protected dispatch `net.http_post` request #3433 returned HTTP 200 and evaluated exactly 2 sources: Nokia 6103, Sony Ericsson Cedar. Both correctly flagged `needs_human_review` because the year could not be corroborated in model context. No unverifiable claim promoted |
| Source restoration | Three deployed JS modules not committed to GitHub | `src/api/handoff.js` recovered completely (1101 bytes) from Vercel deployment `dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw` and backed up in this branch. Retrieval of `research-v3.js` and `publication.js` has `truncated:true`, so **neither is a verified complete source**. Deployed Vercel agent files were **not replaced**. |
| Verified editorial entries | 5 before Nokia 2010 pilot | 6 after pilot; 870 catalog models, 744 non-empty RU descriptions, 385 hero images (snapshot) |

## Changes committed

- `recovery/2026-11-07/verified-catalog-pilot.sql` — single-model protected publisher (previous milestone).
- `recovery/2026-11-07/verified-nokia-2010-pilot-data.sql` — Nokia 2010 source + RU/HY/EN preparation (previous milestone).
- `recovery/2026-11-08/agent-autopublish-v1-backup.sql` — **exact prior production publication function**; rollback reference.
- `recovery/2026-11-08/agent-autopublish-protected-v2.sql` — **applied** on production Supabase, original RPC signature and existing cron kept.
- `recovery/2026-11-08/agent/src/api/handoff.js` — complete recovered handler from active Vercel deployment.
- `scripts/check-nokia-2010-live.mjs` — corrected live 3-language checker (GitHub CI green).

## Strict guarantees / limitations

- No stock, pricing, gallery or CSS updates in this round.
- A successful cron query with zero eligible candidates is a **protected empty-queue test**, **not** evidence that three new models published.
- Source HTTP 200 is not year verification. Pending review sources remain unverified.
- `auto_publish` does not mean bypassing model identity, year, two museum/manufacturer source domains, 3 language descriptions, and photo license/3-attempt fallback.
- The full Vercel route code for `research-v3.js` and `publication.js` remains unrecovered due to connector response truncation; do not deploy reconstructed fragments over them.

## Next gate before larger batches

1. Obtain *complete original files* for the two Vercel endpoints by a source export not subject to 2 KB connector truncation, and back them up with exact byte lengths/checksums.
2. Improve candidate research quality and independent year verification; source-verifier currently leaves 210 queued, and most model quality gates still report `needs_sources`.
3. Only when at least one new model is fully eligible, run guarded publisher (batch max 3), verify source URLs, each translation, RLS public row, live HTML RU/HY/EN, and idempotence; then gradually expand.
4. Keep GitHub PR #8 as a **draft** until sources/recovery and review gates are complete. Production DB SQL functions were changed as documented, Vercel production JS was not.

## Existing unrelated security warnings

Supabase advisor still reports pre-existing `SECURITY DEFINER` grants on some admin/statistics functions and disabled leaked password protection. This update did **not** widen those grants; they need a separate audit before broader release.

## Additional CI verification

GitHub Actions [run #42413622841](https://github.com/harutmusheghyan-netizen/retrophone-armenia/actions/runs/42413622841) completed successfully with both: `node --check recovery/2026-11-08/agent/src/api/handoff.js` and all three HTTP smoke tests. This confirms the recovered handoff file parses as JavaScript; it does not verify the two Vercel files whose source responses were truncated.
