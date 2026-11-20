-- DESIGN DRAFT ONLY — DO NOT APPLY TO PRODUCTION.
-- Separate retry authorization and cycle counters for the Nokia pilot.
-- Requires validated backup/restore, security review, and Preview tests.
BEGIN;
CREATE TABLE IF NOT EXISTS public.agent_pilot_retry_authorizations (
  task_id bigint NOT NULL REFERENCES public.agent_research_tasks(id),
  cycle smallint NOT NULL CHECK (cycle = 1),
  reason text NOT NULL CHECK (length(btrim(reason)) >= 10),
  authorized_by text NOT NULL CHECK (length(btrim(authorized_by)) > 0),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, cycle)
);
CREATE TABLE IF NOT EXISTS public.agent_pilot_retry_state (
  task_id bigint PRIMARY KEY REFERENCES public.agent_research_tasks(id),
  cycle smallint NOT NULL CHECK (cycle = 1),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (task_id,cycle) REFERENCES public.agent_pilot_retry_authorizations(task_id,cycle)
);
-- Explicitly prohibit access from Data API roles until privileged RPCs are reviewed.
REVOKE ALL ON public.agent_pilot_retry_authorizations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.agent_pilot_retry_state FROM PUBLIC, anon, authenticated;
ALTER TABLE public.agent_pilot_retry_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pilot_retry_state ENABLE ROW LEVEL SECURITY;
COMMIT;
-- No automatic reset of agent_research_tasks.dispatch_count.
-- No automatic grant of retry authorization.
-- Existing agent_claim_pilot_jobs remains unchanged.
