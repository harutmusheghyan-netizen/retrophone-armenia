\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 only. Run after pilot-claim-postgres17-isolated.sql.
CREATE TABLE public.agent_retry_authorizations(task_id bigint,cycle int CHECK(cycle=1),reason text NOT NULL,actor text NOT NULL,PRIMARY KEY(task_id,cycle));
CREATE TABLE public.agent_retry_state(task_id bigint PRIMARY KEY,cycle int CHECK(cycle=1),attempts int NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5));
CREATE FUNCTION public.authorize_pilot_retry(p_task bigint,p_reason text,p_actor text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE t record;
BEGIN
 SELECT * INTO t FROM public.agent_research_tasks WHERE id=p_task FOR UPDATE;
 IF NOT FOUND OR t.dispatch_count<>5 OR t.status NOT IN ('needs_sources','revision_needed') OR t.lease_until>now()
 OR length(trim(coalesce(p_reason,'')))<10 OR length(trim(coalesce(p_actor,'')))=0 THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.agent_published_model_editorials WHERE phone_model_id=t.phone_model_id)
 OR EXISTS(SELECT 1 FROM public.agent_quality_gate_results WHERE task_id=t.id AND publication_allowed)
 OR NOT EXISTS(SELECT 1 FROM public.agent_pilot_batch_items i JOIN public.agent_pilot_batches b ON b.id=i.batch_id
 WHERE i.phone_model_id=t.phone_model_id AND b.code='nokia-20-quality-v1' AND b.status='in_progress')
 OR EXISTS(SELECT 1 FROM public.agent_retry_authorizations WHERE task_id=p_task) THEN RETURN false; END IF;
 INSERT INTO public.agent_retry_authorizations VALUES(p_task,1,p_reason,p_actor);
 INSERT INTO public.agent_retry_state VALUES(p_task,1,0);
 RETURN true;
END $$;
CREATE FUNCTION public.claim_authorized_retry(p_limit int DEFAULT 4) RETURNS TABLE(task_id bigint) LANGUAGE plpgsql AS $$
BEGIN
 IF p_limit<1 OR p_limit>4 THEN RAISE EXCEPTION 'invalid_queue_limits'; END IF;
 RETURN QUERY WITH selected AS (
 SELECT t.id FROM public.agent_research_tasks t JOIN public.agent_retry_state s ON s.task_id=t.id
 JOIN public.agent_retry_authorizations a ON a.task_id=t.id AND a.cycle=s.cycle
 WHERE s.cycle=1 AND s.attempts<5 AND t.status IN ('needs_sources','revision_needed')
 AND (t.lease_until IS NULL OR t.lease_until<=now())
 AND NOT EXISTS(SELECT 1 FROM public.agent_published_model_editorials e WHERE e.phone_model_id=t.phone_model_id)
 AND NOT EXISTS(SELECT 1 FROM public.agent_quality_gate_results q WHERE q.task_id=t.id AND q.publication_allowed)
 ORDER BY t.id FOR UPDATE OF t SKIP LOCKED LIMIT p_limit
 ), claimed AS (
 UPDATE public.agent_research_tasks t SET lease_until=now()+interval '12 minutes',updated_at=now()
 FROM selected s WHERE s.id=t.id RETURNING t.id
 ), counted AS (
 UPDATE public.agent_retry_state s SET attempts=s.attempts+1 FROM claimed c WHERE c.id=s.task_id RETURNING s.task_id
 ) SELECT c.task_id FROM counted c;
END $$;
DO $$ BEGIN
 IF NOT public.authorize_pilot_retry(1,'Documented failed research, manual review','reviewer') THEN RAISE EXCEPTION 'authorization'; END IF;
 IF public.authorize_pilot_retry(1,'Documented failed research, manual review','reviewer') THEN RAISE EXCEPTION 'duplicate authorization'; END IF;
 IF (SELECT count(*) FROM public.claim_authorized_retry(4))<>1 THEN RAISE EXCEPTION 'claim'; END IF;
 IF (SELECT count(*) FROM public.claim_authorized_retry(4))<>0 THEN RAISE EXCEPTION 'duplicate lease'; END IF;
END $$;
UPDATE public.agent_research_tasks SET lease_until=NULL WHERE id=1;
UPDATE public.agent_retry_state SET attempts=5 WHERE task_id=1;
DO $$ BEGIN IF (SELECT count(*) FROM public.claim_authorized_retry(4))<>0 THEN RAISE EXCEPTION 'sixth attempt'; END IF; END $$;
INSERT INTO public.agent_published_model_editorials VALUES(2);
DO $$ BEGIN
 IF public.authorize_pilot_retry(2,'Documented failed research, manual review','reviewer') THEN RAISE EXCEPTION 'published authorized'; END IF;
END $$;
SELECT 'retry assertions passed' AS result;