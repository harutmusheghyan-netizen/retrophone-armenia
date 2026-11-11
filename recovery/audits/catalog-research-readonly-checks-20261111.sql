-- RetroPhone Armenia: read-only catalog/research verification
-- Safe to run in SQL editor. Does not publish or modify production.
-- Baseline observed 2026-11-11: 870 models; 754 substantive descriptions per language.
SELECT language_code,
       count(*) AS translation_rows,
       count(*) FILTER (WHERE length(btrim(coalesce(description,''))) >= 80) AS substantive_descriptions,
       count(DISTINCT phone_model_id) AS distinct_models
FROM public.phone_model_translations
GROUP BY language_code ORDER BY language_code;

-- Model IDs lacking any substantive RU/HY/EN translation.
SELECT m.id, m.model_name,
       coalesce(bool_or(t.language_code='ru' AND length(btrim(coalesce(t.description,'')))>=80),false) AS ru_ready,
       coalesce(bool_or(t.language_code='hy' AND length(btrim(coalesce(t.description,'')))>=80),false) AS hy_ready,
       coalesce(bool_or(t.language_code='en' AND length(btrim(coalesce(t.description,'')))>=80),false) AS en_ready
FROM public.phone_models m
LEFT JOIN public.phone_model_translations t ON t.phone_model_id=m.id
GROUP BY m.id,m.model_name
HAVING NOT (
  coalesce(bool_or(t.language_code='ru' AND length(btrim(coalesce(t.description,'')))>=80),false)
  AND coalesce(bool_or(t.language_code='hy' AND length(btrim(coalesce(t.description,'')))>=80),false)
  AND coalesce(bool_or(t.language_code='en' AND length(btrim(coalesce(t.description,'')))>=80),false)
)
ORDER BY m.id;

-- Researcher execution and publication gate. READY deployment is not proof of completed work.
SELECT status,count(*) AS runs,max(started_at) AS latest_start
FROM public.agent_research_runs GROUP BY status ORDER BY status;
SELECT id,task_id,status,mode,started_at,finished_at,technical_checks->'quality_gate' AS quality_gate
FROM public.agent_research_runs ORDER BY started_at DESC LIMIT 10;

-- After any separately authorized pilot publication, compare before/after SQL snapshots
-- AND verify rendered page content for ru/hy/en. is_published is not proof of rendering.
