# Research agent cron audit — 2026-11-07 14:48 Asia/Yerevan

## Verified sources
- Vercel production deployment `dpl_DrZdvQj1E9f7ADKDiidrc5NXGDTw` of `retrophone-research-agent` is READY and has production aliases.
- Its source tree includes `src/api/cron.js`, `research-v3.js`, `publication.js`, `handoff.js`, `operations.js`.
- Vercel's file-content response for `src/api/cron.js` is **truncated** (188 base64 characters omitted). This is an audit of the visible prefix, **not** a complete source restoration.
- Previously recovered `vercel.json` schedules `/api/cron` at `0 1 * * *` and sets `maxDuration: 60` on cron/research endpoints.

## Observed behavior in decoded visible cron.js prefix
- Cron calls `RESEARCH_SYNC_URL` with `action: 'queue_next'` and `model: '2300'` (hard-coded).
- It takes at most four returned model labels via `.slice(0,4)`.
- It calls the research-v3 handler for those labels using `Promise.all`.
- The response marks a model saved only when `out.sync?.ok` is truthy.
- The visible cron code does not invoke the separate publication endpoint. The missing suffix and downstream handler logic must be checked before concluding that publication is impossible.

## Database snapshot
Read-only SQL on project `aikxbgixitaaatkmcols`: `agent_research_tasks` has 865 `needs_sources` and 5 `approved` (870 total). No status changes performed.

## Suspected blockers requiring verification
1. Hard-coded model 2300 may restrict queue selection rather than cover all 870 models; inspect queue API semantics.
2. Four jobs per daily cron and 60-second function limits may constrain throughput; inspect actual duration and error logs.
3. Research and publication appear to be distinct workflows; trace authorization and handoff before any write.
4. Confirm published translations against public RU/HY/EN pages, not `is_published` alone.

## Safe next actions
Retrieve complete source bytes with integrity checks, reconstruct in the audit branch, run static checks and staging tests, compare read-only SQL before/after, and only then consider verified small-batch publication. Preserve production design, prices, images and licenses.
