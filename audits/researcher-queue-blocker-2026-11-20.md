# Researcher queue blocker — read-only audit (2026-11-20)

Project: Supabase aikxbgixitaaatkmcols. Production function: public.agent_claim_catalog_research_jobs(integer).

Verified from pg_get_functiondef: the function excludes any task having an agent_research_runs row with mode='multi_brand_archival_intake_v1', regardless of run status. Other guards: workplan planned, task status queued/needs_sources/revision_needed, expired/no lease, no published editorial, dispatch_count < 5, SKIP LOCKED, 9-minute lease, p_limit 1..8.

Read-only GROUP BY status,mode on agent_research_runs returned 882 rows with status=sources_only and mode=multi_brand_archival_intake_v1, plus 41 free_supervised_v2, 29 autonomous_queue_v3, and one completed source_verified_editorial_v1. These are run counts, not unique task counts. Earlier audit identified 849 candidate tasks excluded by the mode condition; rerun counts before making changes.

Do not simply remove the NOT EXISTS predicate: sources_only is not proof of failed execution or publish readiness. Before any migration, inspect unique task_id, outcome, latest run, retry counts, source quality, and relation between HTTP queue_next and this SQL function. Test in isolated PostgreSQL with duplicate, lease, concurrency, and max-attempt cases; snapshot database and verify restoration. Production unchanged.

Read-only diagnostic SQL:

SELECT r.mode, r.status, count(*) AS runs, count(DISTINCT r.task_id) AS distinct_tasks
FROM public.agent_research_runs r
WHERE r.mode='multi_brand_archival_intake_v1'
GROUP BY r.mode,r.status ORDER BY runs DESC;

SELECT t.status, count(*) AS tasks
FROM public.agent_research_tasks t
WHERE EXISTS (SELECT 1 FROM public.agent_research_runs r WHERE r.task_id=t.id AND r.mode='multi_brand_archival_intake_v1')
GROUP BY t.status;
