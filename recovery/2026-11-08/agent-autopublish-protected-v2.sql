-- RetroPhone Armenia: safely connect existing cron/agent controller to the
-- source-verified, one-model guarded publisher installed in the pilot.
-- Original SQL backed up at recovery/2026-11-08/agent-autopublish-v1-backup.sql.
-- Preserve the existing function signature and current cron (every 10 min).
-- Never interpret "auto_publish=true" as permission to skip quality gates.
CREATE OR REPLACE FUNCTION public.agent_autopublish_verified_research(
  p_limit integer DEFAULT 6
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $publication$
DECLARE
  rec record;
  outcome jsonb;
  inspected integer := 0;
  succeeded integer := 0;
  rejected integer := 0;
  failures jsonb := '[]'::jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 10 THEN
    RAISE EXCEPTION 'invalid_publication_limit';
  END IF;
  -- Fail closed: locked, fresh quality gates only; batches capped at 3.
  -- The private final gate independently checks facts, bilingual/multilingual
  -- drafts, source provenance, photo license / 3-attempt waiver, and duplication.
  FOR rec IN
    SELECT t.phone_model_id, t.id AS task_id
    FROM public.agent_research_tasks t
    JOIN public.agent_quality_gate_results q ON q.task_id=t.id
    JOIN public.agent_research_runs r ON r.id=q.run_id AND r.task_id=t.id
    WHERE q.score>=90
      AND q.status IN ('draft_approved','needs_editor_review')
      AND coalesce(q.blockers,'{}'::text[])
          <@ ARRAY['needs_human_editor_approval']::text[]
      AND r.id=(
        SELECT max(r2.id) FROM public.agent_research_runs r2
        WHERE r2.task_id=t.id
      )
      AND NOT EXISTS(
        SELECT 1 FROM public.agent_published_model_editorials e
        WHERE e.phone_model_id=t.phone_model_id
      )
    ORDER BY q.score DESC,t.id
    LIMIT LEAST(p_limit,3)
    FOR UPDATE OF t SKIP LOCKED
  LOOP
    inspected := inspected+1;
    BEGIN
      outcome:=retrophone_internal.publish_verified_editorial_pilot(
        rec.phone_model_id,false
      );
      IF outcome->>'ok'='true' AND outcome->>'published'='1' THEN
        succeeded:=succeeded+1;
      ELSE
        rejected:=rejected+1;
        failures:=failures||jsonb_build_array(jsonb_build_object(
          'model_id',rec.phone_model_id,
          'reason',coalesce(outcome->>'error', 'not_eligible_or_already_published')
        ));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Isolate each record and protect the other eligible models in the batch.
      rejected:=rejected+1;
      failures:=failures||jsonb_build_array(jsonb_build_object(
        'model_id',rec.phone_model_id, 'reason','guarded_publication_error',
        'sqlstate',SQLSTATE
      ));
    END;
  END LOOP;
  RETURN jsonb_build_object(
    'ok',true,
    'mode','protected_auto_publication_v2',
    'attempted',inspected,
    'published',succeeded,
    'skipped',rejected,
    'errors',failures,
    'max_batch',3,
    'inventory_unchanged',true,
    'stock_unchanged',true,
    'design_unchanged',true,
    'approval_impersonated',false
  );
END;
$publication$;
REVOKE ALL ON FUNCTION public.agent_autopublish_verified_research(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_autopublish_verified_research(integer)
  TO service_role;
