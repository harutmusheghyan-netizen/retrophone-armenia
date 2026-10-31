-- Recovery reference for current multi-agent queue, 2026-10-31.
-- Do not replay against production without checking existing migrations and backing up.
CREATE TABLE IF NOT EXISTS retrophone_internal.agent_stage_tracker (
 task_id bigint NOT NULL REFERENCES public.agent_research_tasks(id) ON DELETE CASCADE,
 stage text NOT NULL CHECK (stage IN ('researcher','fact_verifier','licensed_photo','translator','publisher')),
 status text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 refreshed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(task_id,stage)
);
CREATE TABLE IF NOT EXISTS retrophone_internal.source_discovery_progress (
 task_id bigint PRIMARY KEY REFERENCES public.agent_research_tasks(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry','completed','no_candidate_after_2')),
 attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2),
 next_attempt_at timestamptz,claimed_at timestamptz,finished_at timestamptz,
 candidate_count integer NOT NULL DEFAULT 0,last_error text
);
REVOKE ALL ON retrophone_internal.agent_stage_tracker,retrophone_internal.source_discovery_progress FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.agent_claim_catalog_research_jobs(p_limit integer DEFAULT 5)
 RETURNS TABLE(task_id bigint, phone_model_id bigint, brand text, model_name text, run_number integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF p_limit<1 OR p_limit>8 THEN RAISE EXCEPTION 'invalid_batch_limit'; END IF;
 RETURN QUERY
 WITH ranked AS (
  SELECT t.id, row_number() OVER
    (PARTITION BY m.brand_id ORDER BY t.priority DESC,t.id) AS brand_order
  FROM public.agent_research_tasks t
  JOIN public.phone_models m ON m.id=t.phone_model_id
  JOIN public.agent_catalog_workplan w ON w.phone_model_id=m.id
  WHERE w.status='planned'
    AND t.status IN ('queued','needs_sources','revision_needed')
    AND (t.lease_until IS NULL OR t.lease_until<=now())
    AND NOT EXISTS(SELECT 1 FROM public.agent_research_runs r
       WHERE r.task_id=t.id AND r.mode='multi_brand_archival_intake_v1')
    AND NOT EXISTS(SELECT 1 FROM public.agent_published_model_editorials ed
       WHERE ed.phone_model_id=t.phone_model_id)
    AND t.dispatch_count<5
 ), selected AS (
  SELECT t.id FROM ranked r JOIN public.agent_research_tasks t ON t.id=r.id
  ORDER BY r.brand_order,t.priority DESC,t.id
  FOR UPDATE OF t SKIP LOCKED LIMIT p_limit
 ), claimed AS (
  UPDATE public.agent_research_tasks t
  SET lease_until=now()+interval '9 minutes',
      status='researching',last_dispatched_at=now(),
      dispatch_count=t.dispatch_count+1,updated_at=now()
  FROM selected s WHERE t.id=s.id
  RETURNING t.id,t.phone_model_id,t.dispatch_count
 )
 SELECT c.id,c.phone_model_id,b.name::text,m.model_name::text,c.dispatch_count
 FROM claimed c JOIN public.phone_models m ON m.id=c.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id
 ORDER BY c.id;
END $function$;

CREATE OR REPLACE FUNCTION retrophone_internal.refresh_agent_stage_tracker()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $function$
DECLARE changed integer:=0;
BEGIN
 WITH facts AS (
  SELECT t.id task_id,t.phone_model_id,t.model_label,
    EXISTS(SELECT 1 FROM public.agent_research_runs r WHERE r.task_id=t.id) has_draft,
    EXISTS(SELECT 1 FROM public.agent_catalog_archival_summaries a WHERE a.phone_model_id=t.phone_model_id) has_archive,
    EXISTS(SELECT 1 FROM public.agent_catalog_archival_summaries a
      WHERE a.phone_model_id=t.phone_model_id AND length(trim(coalesce(a.summary_ru,'')))>=160
      AND length(trim(coalesce(a.summary_hy,'')))>=160
      AND length(trim(coalesce(a.summary_en,'')))>=160) has_archive_trilingual,
    EXISTS(SELECT 1 FROM public.agent_catalog_verified_media v WHERE v.phone_model_id=t.phone_model_id) has_verified_photo,
    EXISTS(SELECT 1 FROM public.agent_photo_search_state ps
      WHERE ps.phone_model_id=t.phone_model_id AND ps.attempts>=3
       AND ps.status='no_photo_after_3') photo_waived,
    EXISTS(SELECT 1 FROM public.agent_published_model_editorials e WHERE e.phone_model_id=t.phone_model_id) has_published_editorial,
    coalesce(q.checks->>'release_year_verified','false')='true' year_verified,
    coalesce((q.checks->>'independent_historical_source_domains')::integer,0) source_count,
    coalesce(q.checks->>'draft_ru_present','false')='true'
      AND coalesce(q.checks->>'draft_hy_present','false')='true'
      AND coalesce(q.checks->>'draft_en_present','false')='true' drafts_pass,
    coalesce(q.publication_allowed,false) eligible_to_publish
  FROM public.agent_research_tasks t
  LEFT JOIN public.agent_quality_gate_results q ON q.task_id=t.id
 ), rows AS (
  SELECT task_id,'researcher'::text stage,
    CASE WHEN has_draft THEN 'draft_collected' ELSE 'pending' END status,
    jsonb_build_object('historical_archive_unverified',has_archive) details
  FROM facts
  UNION ALL
  SELECT task_id,'fact_verifier',
    CASE WHEN year_verified AND source_count>=2 THEN 'evidence_checked' ELSE 'needs_independent_sources' END,
    jsonb_build_object('source_domains_approved',source_count,'year_verified',year_verified)
  FROM facts
  UNION ALL
  SELECT task_id,'licensed_photo',
    CASE WHEN has_verified_photo THEN 'photo_verified'
         WHEN photo_waived THEN 'waived_after_three'
         ELSE 'needs_licensed_photo' END,
    jsonb_build_object('licensed_image',has_verified_photo,'three_attempt_waiver',photo_waived)
  FROM facts
  UNION ALL
  SELECT task_id,'translator',
    CASE WHEN drafts_pass AND year_verified AND source_count>=2 THEN 'editorial_drafts_checked'
         WHEN has_archive_trilingual THEN 'trilingual_archival_draft_unverified'
         ELSE 'translations_missing_or_unchecked' END,
    jsonb_build_object('three_archive_drafts_present',has_archive_trilingual,'three_editorial_checks',drafts_pass)
  FROM facts
  UNION ALL
  SELECT task_id,'publisher',
    CASE WHEN has_published_editorial THEN 'published'
         WHEN eligible_to_publish THEN 'eligible'
         ELSE 'blocked_by_quality' END,
    jsonb_build_object('editorial_published',has_published_editorial,'quality_gate_eligible',eligible_to_publish)
  FROM facts
 ), updated AS (
  INSERT INTO retrophone_internal.agent_stage_tracker(task_id,stage,status,details,refreshed_at)
  SELECT task_id,stage,status,details,now() FROM rows
  ON CONFLICT(task_id,stage) DO UPDATE SET
    status=excluded.status,details=excluded.details,refreshed_at=now()
  WHERE retrophone_internal.agent_stage_tracker.status IS DISTINCT FROM excluded.status
     OR retrophone_internal.agent_stage_tracker.details IS DISTINCT FROM excluded.details
  RETURNING 1
 )
 SELECT count(*) INTO changed FROM updated;
 RETURN jsonb_build_object('ok',true,'stage_rows_changed',changed,
   'tasks',(SELECT count(*) FROM public.agent_research_tasks),
   'status','quality_gates_not_bypassed');
END
$function$;

CREATE OR REPLACE FUNCTION public.agent_claim_source_discovery_jobs(p_limit integer DEFAULT 2)
 RETURNS TABLE(task_id bigint, phone_model_id bigint, brand text, model_name text, attempt integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $function$
BEGIN
 IF p_limit<1 OR p_limit>3 THEN RAISE EXCEPTION 'invalid_source_discovery_batch'; END IF;
 RETURN QUERY
 WITH ranked AS (
  SELECT d.task_id, d.attempts,
    row_number() OVER(PARTITION BY m.brand_id ORDER BY d.attempts,t.priority DESC,t.id) brand_position
  FROM retrophone_internal.source_discovery_progress d
  JOIN public.agent_research_tasks t ON t.id=d.task_id
  JOIN public.phone_models m ON m.id=t.phone_model_id
  JOIN retrophone_internal.agent_stage_tracker s ON s.task_id=d.task_id
    AND s.stage='fact_verifier' AND s.status='needs_independent_sources'
  WHERE (
   (d.status IN ('pending','retry') AND (d.next_attempt_at IS NULL OR d.next_attempt_at<=now()))
   OR (d.status='processing' AND d.claimed_at<now()-interval '25 minutes')
  )
  AND d.attempts<2
 ), selected AS (
  SELECT d.task_id
  FROM ranked r JOIN retrophone_internal.source_discovery_progress d ON d.task_id=r.task_id
  ORDER BY r.brand_position,r.attempts,r.task_id
  FOR UPDATE OF d SKIP LOCKED LIMIT p_limit
 ), claimed AS (
  UPDATE retrophone_internal.source_discovery_progress d
  SET status='processing',claimed_at=now(),attempts=d.attempts+1,last_error=NULL
  FROM selected s WHERE s.task_id=d.task_id
  RETURNING d.task_id,d.attempts
 )
 SELECT c.task_id,t.phone_model_id,b.name::text,m.model_name::text,c.attempts::integer
 FROM claimed c JOIN public.agent_research_tasks t ON t.id=c.task_id
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id ORDER BY c.task_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.agent_finish_source_discovery_job(p_task_id bigint, p_candidate_count integer DEFAULT 0, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $function$
DECLARE d retrophone_internal.source_discovery_progress%rowtype; s text;
BEGIN
 IF p_candidate_count<0 OR p_candidate_count>20 THEN RAISE EXCEPTION 'invalid_candidate_count';END IF;
 SELECT * INTO d FROM retrophone_internal.source_discovery_progress
 WHERE task_id=p_task_id FOR UPDATE;
 IF NOT FOUND OR d.status<>'processing' THEN RAISE EXCEPTION 'job_not_processing';END IF;
 s:=CASE WHEN p_candidate_count>0 THEN 'completed'
         WHEN d.attempts>=2 THEN 'no_candidate_after_2'
         ELSE 'retry' END;
 UPDATE retrophone_internal.source_discovery_progress SET
  status=s,
  candidate_count=candidate_count+p_candidate_count,
  last_error=left(p_error,200),
  next_attempt_at=CASE WHEN s='retry' THEN now()+interval '12 hours' ELSE NULL END,
  finished_at=now()
 WHERE task_id=p_task_id;
 RETURN jsonb_build_object('task_id',p_task_id,'status',s,
                           'attempts',d.attempts,'new_candidates',p_candidate_count);
END
$function$;

CREATE OR REPLACE FUNCTION retrophone_internal.dispatch_source_discovery()
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'retrophone_internal', 'public', 'pg_temp'
AS $function$
DECLARE job_token text; request_id bigint;
BEGIN
 SELECT token INTO job_token
 FROM retrophone_internal.agent_cron_tokens WHERE name='photo-worker';
 IF job_token IS NULL OR length(job_token)<>64
 THEN RAISE EXCEPTION 'source_worker_auth_not_configured';END IF;
 SELECT net.http_post(
  url:='https://aikxbgixitaaatkmcols.supabase.co/functions/v1/retrophone-source-discovery',
  body:='{"limit":2}'::jsonb,
  headers:=jsonb_build_object('Content-Type','application/json',
      'x-retrophone-cron-token',job_token),
  timeout_milliseconds:=60000
 ) INTO request_id;
 RETURN request_id;
END
$function$;

REVOKE ALL ON FUNCTION public.agent_claim_catalog_research_jobs(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_claim_source_discovery_jobs(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_finish_source_discovery_job(bigint,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION retrophone_internal.refresh_agent_stage_tracker() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION retrophone_internal.dispatch_source_discovery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_claim_catalog_research_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_claim_source_discovery_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_finish_source_discovery_job(bigint,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION retrophone_internal.refresh_agent_stage_tracker() TO service_role;
GRANT EXECUTE ON FUNCTION retrophone_internal.dispatch_source_discovery() TO service_role;
-- Recurring schedules; use cron.schedule() only after functions and auth token are in place.
-- The token itself is deliberately NOT stored in this recovery file.
