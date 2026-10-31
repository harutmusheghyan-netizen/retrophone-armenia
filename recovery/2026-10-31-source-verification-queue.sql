-- RetroPhone Armenia — guarded independent source verification, 31 October 2026
-- Recovery reference. No tokens or credentials; review against migration ledger before applying.
CREATE TABLE IF NOT EXISTS retrophone_internal.source_verification_queue(
 source_id bigint PRIMARY KEY REFERENCES public.agent_research_sources(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','processing','retry','verified','needs_human_review')),
 attempts smallint NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
 next_attempt_at timestamptz,
 claimed_at timestamptz,finished_at timestamptz,
 http_status integer,page_title text,evidence_excerpt text,last_error text
);
REVOKE ALL ON retrophone_internal.source_verification_queue FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.agent_claim_source_verification_jobs(p_limit integer DEFAULT 2)
 RETURNS TABLE(source_id bigint, task_id bigint, model_id bigint, source_url text, kind text, brand text, model_name text, year_label integer, attempt integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $function$
BEGIN
 IF p_limit<1 OR p_limit>3 THEN RAISE EXCEPTION 'invalid_verification_batch';END IF;
 INSERT INTO retrophone_internal.source_verification_queue(source_id)
 SELECT s.id FROM public.agent_research_sources s
 WHERE s.verification_status='candidate' AND s.source_kind IN ('official','museum')
   AND s.url LIKE 'https://%'
 ON CONFLICT ON CONSTRAINT source_verification_queue_pkey DO NOTHING;
 RETURN QUERY
 WITH selected AS (
  SELECT q.source_id FROM retrophone_internal.source_verification_queue q
  JOIN public.agent_research_sources s ON s.id=q.source_id
  WHERE s.verification_status='candidate'
   AND (q.status='pending' OR
       (q.status='retry' AND q.next_attempt_at<=now()) OR
       (q.status='processing' AND q.claimed_at<now()-interval '30 minutes'))
   AND q.attempts<2
  ORDER BY q.attempts,q.source_id FOR UPDATE OF q SKIP LOCKED LIMIT p_limit
 ), claimed AS (
  UPDATE retrophone_internal.source_verification_queue q
  SET status='processing',claimed_at=now(),attempts=q.attempts+1
  FROM selected s WHERE s.source_id=q.source_id
  RETURNING q.source_id,q.attempts
 )
 SELECT c.source_id,s.task_id,t.phone_model_id,s.url,s.source_kind,
  b.name::text,m.model_name::text,coalesce(m.display_year,m.release_year)::integer,c.attempts::integer
 FROM claimed c JOIN public.agent_research_sources s ON s.id=c.source_id
 JOIN public.agent_research_tasks t ON t.id=s.task_id
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id
 ORDER BY c.source_id;
END $function$;

CREATE OR REPLACE FUNCTION public.agent_finish_source_verification_job(p_source_id bigint, p_outcome text, p_http_status integer DEFAULT NULL::integer, p_page_title text DEFAULT NULL::text, p_excerpt text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $function$
DECLARE j retrophone_internal.source_verification_queue%rowtype; final_status text;
BEGIN
 IF p_outcome NOT IN ('verified','retry','needs_human_review') THEN RAISE EXCEPTION 'invalid_verification_outcome';END IF;
 SELECT * INTO j FROM retrophone_internal.source_verification_queue
 WHERE source_id=p_source_id FOR UPDATE;
 IF NOT FOUND OR j.status<>'processing' THEN RAISE EXCEPTION 'job_not_processing'; END IF;
 final_status:=CASE WHEN p_outcome='verified' THEN 'verified'
    WHEN p_outcome='needs_human_review' OR j.attempts>=2 THEN 'needs_human_review'
    ELSE 'retry' END;
 UPDATE retrophone_internal.source_verification_queue SET
 status=final_status,http_status=p_http_status,page_title=left(p_page_title,300),
 evidence_excerpt=left(p_excerpt,300),last_error=left(p_error,200),
 next_attempt_at=CASE WHEN final_status='retry' THEN now()+interval '6 hours' ELSE NULL END,
 finished_at=now()
 WHERE source_id=p_source_id;
 IF final_status='verified' THEN
  UPDATE public.agent_research_sources SET
   verification_status='verified',
   evidence='Checked HTTPS page, exact brand and model identified, relevant historical year found: '||coalesce(left(p_excerpt,240),''),
   reviewer_note='Automated source-identity verification: page title '||coalesce(left(p_page_title,120),'')||
      '; verifies source relevance only; individual facts, release year, and translations retain separate quality gates.'
  WHERE id=p_source_id AND verification_status='candidate'
    AND source_kind IN ('official','museum');
 END IF;
 RETURN jsonb_build_object('source_id',p_source_id,'outcome',final_status,'attempt',j.attempts);
END $function$;

CREATE OR REPLACE FUNCTION retrophone_internal.dispatch_source_verification()
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO 'retrophone_internal', 'public', 'pg_temp'
AS $function$
DECLARE tok text; request_id bigint;
BEGIN
 SELECT token INTO tok FROM retrophone_internal.agent_cron_tokens
 WHERE name='photo-worker';
 IF tok IS NULL OR length(tok)<>64
 THEN RAISE EXCEPTION 'worker_token_missing'; END IF;
 SELECT net.http_post(
 url:='https://aikxbgixitaaatkmcols.supabase.co/functions/v1/retrophone-source-verifier',
 body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json',
 'x-retrophone-cron-token',tok),
 timeout_milliseconds:=60000
 ) INTO request_id;
 RETURN request_id;
END $function$;

REVOKE ALL ON FUNCTION public.agent_claim_source_verification_jobs(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_finish_source_verification_job(bigint,text,integer,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION retrophone_internal.dispatch_source_verification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_claim_source_verification_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_finish_source_verification_job(bigint,text,integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION retrophone_internal.dispatch_source_verification() TO service_role;
-- Only enable schedule after stored internal credential, Edge Function and queue are configured.
SELECT cron.schedule('retrophone_source_verification','*/10 * * * *',
                    'SELECT retrophone_internal.dispatch_source_verification();');
