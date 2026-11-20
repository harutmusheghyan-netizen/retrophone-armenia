-- RetroPhone Researcher queue: read-only reproducible blocker check
-- Verified 2026-11-20 (Asia/Yerevan). Run on production only as SELECT.
-- IMPORTANT: do not call agent_claim_catalog_research_jobs here: it leases and mutates tasks.
WITH eligible AS (
 SELECT t.id
 FROM public.agent_research_tasks t
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.agent_catalog_workplan w ON w.phone_model_id=m.id
 WHERE w.status='planned'
 AND t.status IN ('queued','needs_sources','revision_needed')
 AND (t.lease_until IS NULL OR t.lease_until<=now())
 AND NOT EXISTS (SELECT 1 FROM public.agent_published_model_editorials ed
                 WHERE ed.phone_model_id=t.phone_model_id)
 AND t.dispatch_count<5
)
SELECT count(*) AS eligible_before_mode_filter,
 count(*) FILTER (WHERE EXISTS (
   SELECT 1 FROM public.agent_research_runs r
   WHERE r.task_id=e.id AND r.mode='multi_brand_archival_intake_v1'
 )) AS excluded_by_mode,
 count(*) FILTER (WHERE NOT EXISTS (
   SELECT 1 FROM public.agent_research_runs r
   WHERE r.task_id=e.id AND r.mode='multi_brand_archival_intake_v1'
 )) AS eligible_after_mode_filter
FROM eligible e;

-- Distinguish run rows from distinct tasks. A sources_only run does not
-- by itself establish publication readiness or safe retry eligibility.
SELECT r.mode,r.status,count(*) AS runs,count(DISTINCT r.task_id) AS distinct_tasks
FROM public.agent_research_runs r
WHERE r.mode='multi_brand_archival_intake_v1'
GROUP BY r.mode,r.status ORDER BY runs DESC;

-- No production fix until: verify queue_next call path, backup+restore,
-- isolated retry/lease/concurrency/max-dispatch tests, and real RU/HY/EN HTML.
