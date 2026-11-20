-- RetroPhone Armenia: read-only diagnosis of Researcher queue starvation.
-- Run against production only as SELECT; this script does not claim jobs or publish.
-- The claim function currently rejects every task with ANY earlier run in
-- mode multi_brand_archival_intake_v1, including failed/incomplete runs.
WITH candidates AS (
 SELECT t.id, t.phone_model_id
 FROM public.agent_research_tasks t
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.agent_catalog_workplan w ON w.phone_model_id=m.id
 WHERE w.status='planned'
   AND t.status IN ('queued','needs_sources','revision_needed')
   AND (t.lease_until IS NULL OR t.lease_until<=now())
   AND t.dispatch_count<5
   AND NOT EXISTS (
     SELECT 1 FROM public.agent_published_model_editorials ed
     WHERE ed.phone_model_id=t.phone_model_id
   )
)
SELECT now() AS checked_at,
       count(*) AS candidates_before_prior_run_filter,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM public.agent_research_runs r
         WHERE r.task_id=c.id AND r.mode='multi_brand_archival_intake_v1'
       )) AS excluded_by_any_prior_run,
       count(*) FILTER (WHERE NOT EXISTS (
         SELECT 1 FROM public.agent_research_runs r
         WHERE r.task_id=c.id AND r.mode='multi_brand_archival_intake_v1'
       )) AS eligible_after_prior_run_filter
FROM candidates c;

-- Inspect the deployed function without invoking it (invocation mutates leases).
SELECT pg_get_functiondef(p.oid) AS claim_function_definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='agent_claim_catalog_research_jobs';

-- Safety notes for a future isolated fix:
-- * Do not simply remove the NOT EXISTS: failed jobs may loop indefinitely.
-- * Define terminal versus retryable run statuses from actual schema.
-- * Preserve lease/dispatch limits, idempotency and publication guards.
-- * Test with fixture tasks in a disposable database before any production DDL.
