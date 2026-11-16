# Researcher quality-gate diagnostic — 2026-11-16 05:29 Asia/Yerevan

Read-only SQL against Supabase project aikxbgixitaaatkmcols.

- agent_research_runs statuses: sources_only=961, completed=1.
- Latest run: id=965, task_id=17, 2026-11-13 01:37:44 UTC, Nokia 2720 fold.
- Latest run technical_checks.quality_gate: sourceCount=0, verifiedPhotoCount=0, readyForEditor=false, publicationAllowed=false, needsHumanReview=true.
- Previous run id=964 Nokia 1100: sourceCount=1, verifiedPhotoCount=0, publicationAllowed=false.
- Previous run id=963 Nokia 2700 classic: photoCandidates=6 but verifiedPhotoCount=0, publicationAllowed=false.
- Among sources_only runs, 56 explicitly record publicationAllowed=false; 49 explicitly record verifiedPhotoCount=0; 16 explicitly record sourceCount>0. Many older rows lack these JSON keys: do not interpret these counts as exhaustive.
- Latest recorded run is 2026-11-13; Vercel READY is not evidence that scheduling or publishing works.

Finding: the quality gate is explicitly rejecting recent research runs, including runs with a source or candidate photos. This does NOT prove that the photo requirement is the sole blocker: sources, factual review and license verification may also be missing.

Next safe engineering step: inspect full src/api/research-v3.js, publication.js, cron.js and queue contract; separate verified text-only publication from optional image replacement while keeping existing photo/license rules. Test in Preview with SQL before/after and real HTML RU/HY/EN. No production write authorized by this diagnostic.

No production data, prices, images, licenses, design or admin Etalon 4 changed.
