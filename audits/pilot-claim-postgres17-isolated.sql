\set ON_ERROR_STOP on
CREATE SCHEMA public;
CREATE TABLE public.brands(id bigint primary key,name text);
CREATE TABLE public.phone_models(id bigint primary key,brand_id bigint,model_name text);
CREATE TABLE public.agent_pilot_batches(id bigint primary key,code text,status text);
CREATE TABLE public.agent_pilot_batch_items(batch_id bigint,phone_model_id bigint);
CREATE TABLE public.agent_research_tasks(id bigint primary key,phone_model_id bigint,status text,dispatch_count integer,priority integer,lease_until timestamptz,last_dispatched_at timestamptz,updated_at timestamptz);
CREATE TABLE public.agent_quality_gate_results(task_id bigint,status text,publication_allowed boolean);
CREATE TABLE public.agent_research_runs(task_id bigint,mode text,started_at timestamptz);
CREATE TABLE public.agent_worker_events(id bigint,task_id bigint,event_type text,created_at timestamptz);
CREATE TABLE public.agent_published_model_editorials(phone_model_id bigint);
INSERT INTO public.brands VALUES(1,'Nokia'),(2,'Samsung');
INSERT INTO public.agent_pilot_batches VALUES(1,'nokia-20-quality-v1','in_progress');
INSERT INTO public.phone_models SELECT i,1,'Nokia '||i FROM generate_series(1,8) i;
INSERT INTO public.agent_pilot_batch_items SELECT 1,i FROM generate_series(1,8) i;
INSERT INTO public.agent_research_tasks SELECT i,i,'needs_sources',0,10,NULL,NULL,now() FROM generate_series(1,8) i;
CREATE OR REPLACE FUNCTION public.agent_claim_pilot_jobs(p_limit integer DEFAULT 4,p_cooldown_hours integer DEFAULT 18)
RETURNS TABLE(model text,task_id bigint,is_new boolean)
LANGUAGE plpgsql SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
 IF p_limit<1 OR p_limit>4 OR p_cooldown_hours<1 OR p_cooldown_hours>168 THEN RAISE EXCEPTION 'invalid_queue_limits'; END IF;
 RETURN QUERY
 WITH eligible AS (
 SELECT t.id,m.model_name,t.dispatch_count,t.priority,t.status,t.last_dispatched_at,
  lr.last_run_at,
  CASE
   WHEN ev.event_type='save_duplicate' THEN greatest(p_cooldown_hours,48)
   WHEN ev.event_type IN ('research_failed','queue_claim_failed','source_save_failed') THEN 4
   WHEN q.status IN ('needs_sources','needs_photo','needs_translation','blocked') AND lr.last_run_at IS NOT NULL THEN 24
   WHEN lr.last_run_at IS NULL THEN 1
   ELSE p_cooldown_hours
  END wait_hours
 FROM public.agent_research_tasks t
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id
 JOIN public.agent_pilot_batch_items i ON i.phone_model_id=m.id
 JOIN public.agent_pilot_batches pb ON pb.id=i.batch_id
 LEFT JOIN public.agent_quality_gate_results q ON q.task_id=t.id
 LEFT JOIN LATERAL (SELECT max(r.started_at) last_run_at FROM public.agent_research_runs r WHERE r.task_id=t.id AND r.mode='autonomous_queue_v3') lr ON true
 LEFT JOIN LATERAL (SELECT e.event_type FROM public.agent_worker_events e WHERE e.task_id=t.id AND e.event_type IN ('save_duplicate','research_failed','queue_claim_failed','source_save_failed','research_saved') ORDER BY e.created_at DESC,e.id DESC LIMIT 1) ev ON true
 WHERE pb.code='nokia-20-quality-v1' AND pb.status='in_progress' AND b.name='Nokia'
 AND t.status NOT IN ('approved','rejected') AND t.dispatch_count<5
 AND NOT EXISTS (SELECT 1 FROM public.agent_published_model_editorials e WHERE e.phone_model_id=t.phone_model_id)
 AND (t.lease_until IS NULL OR t.lease_until<=now())
 AND (t.status<>'under_review' OR coalesce(q.status,'needs_sources') IN ('needs_sources','needs_photo','needs_translation','blocked'))
 AND coalesce(q.publication_allowed,false)=false
 ),selected AS (
 SELECT t.id,e.model_name,e.last_run_at FROM eligible e
 JOIN public.agent_research_tasks t ON t.id=e.id
 WHERE (e.last_run_at IS NULL OR e.last_run_at<=now()-make_interval(hours=>e.wait_hours))
 AND (e.last_dispatched_at IS NULL OR e.last_dispatched_at<=now()-make_interval(hours=>e.wait_hours))
 ORDER BY (e.last_run_at IS NOT NULL),e.dispatch_count,e.priority DESC,e.id
 FOR UPDATE OF t SKIP LOCKED LIMIT p_limit
 ),claimed AS (
 UPDATE public.agent_research_tasks t SET lease_until=now()+interval '12 minutes',last_dispatched_at=now(),dispatch_count=t.dispatch_count+1,updated_at=now()
 FROM selected s WHERE t.id=s.id RETURNING t.id
 )
 SELECT s.model_name::text,s.id::bigint,(s.last_run_at IS NULL)::boolean FROM selected s JOIN claimed c ON c.id=s.id;
END $function$;
-- Assertions abort the job if any invariant fails.
DO $$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM public.agent_claim_pilot_jobs(4,18);
 IF n<>4 THEN RAISE EXCEPTION 'expected first four, got %',n; END IF;
 SELECT count(*) INTO n FROM public.agent_claim_pilot_jobs(4,18);
 IF n<>4 THEN RAISE EXCEPTION 'expected next four, got %',n; END IF;
 SELECT count(*) INTO n FROM public.agent_claim_pilot_jobs(4,18);
 IF n<>0 THEN RAISE EXCEPTION 'duplicate claim %',n; END IF;
 IF (SELECT count(*) FROM public.agent_research_tasks WHERE dispatch_count=1)<>8 THEN RAISE EXCEPTION 'dispatch mismatch'; END IF;
END $$;
UPDATE public.agent_research_tasks SET dispatch_count=5,lease_until=NULL,last_dispatched_at=now()-interval '7 days';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.agent_claim_pilot_jobs(4,18))<>0 THEN RAISE EXCEPTION 'max dispatch bypass'; END IF;
END $$;
-- A second-cycle proposal must NOT be silently enabled by this test.
SELECT 'isolated SQL assertions passed' AS result;
