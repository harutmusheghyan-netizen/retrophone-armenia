\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 only. Never run against production.
-- Requires audits/pilot-claim-postgres17-isolated.sql fixtures.
DO $ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $;
\i audits/pilot-retry-migration-DRAFT-DO-NOT-APPLY.sql
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='agent_pilot_retry_authorizations') THEN RAISE EXCEPTION 'authorization table missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='agent_pilot_retry_state') THEN RAISE EXCEPTION 'state table missing'; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('agent_pilot_retry_authorizations','agent_pilot_retry_state') AND grantee IN ('anon','authenticated','PUBLIC')) THEN RAISE EXCEPTION 'unwanted table grant'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('agent_pilot_retry_authorizations','agent_pilot_retry_state') AND c.relrowsecurity)<>2 THEN RAISE EXCEPTION 'RLS not enabled'; END IF;
END $$;
INSERT INTO public.agent_pilot_retry_authorizations(task_id,cycle,reason,authorized_by)
VALUES(1,1,'Manually documented pilot research failure','isolated-reviewer');
INSERT INTO public.agent_pilot_retry_state(task_id,cycle,attempts) VALUES(1,1,0);
DO $$
BEGIN
 BEGIN
  INSERT INTO public.agent_pilot_retry_authorizations(task_id,cycle,reason,authorized_by) VALUES(1,1,'Duplicate authorization attempt','isolated-reviewer');
  RAISE EXCEPTION 'duplicate authorization accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 BEGIN
  UPDATE public.agent_pilot_retry_state SET attempts=6 WHERE task_id=1;
  RAISE EXCEPTION 'sixth attempt accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO public.agent_pilot_retry_authorizations(task_id,cycle,reason,authorized_by) VALUES(2,2,'Unbounded retry cycle forbidden','isolated-reviewer');
  RAISE EXCEPTION 'second retry cycle accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;
SELECT 'draft migration constraints and RLS assertions passed' AS result;
