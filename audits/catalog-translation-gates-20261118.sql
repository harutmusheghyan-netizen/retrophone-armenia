-- RetroPhone Armenia: read-only translation gate diagnostic, 2026-11-18
-- Does not assert that a DB row is visible in rendered HTML.
-- Compare this output against browser/HTTP tests in Preview before publication.
BEGIN READ ONLY;
SELECT language_code,
       count(*) AS total_rows,
       count(*) FILTER (WHERE nullif(btrim(description),'') IS NOT NULL) AS nonempty,
       count(*) FILTER (WHERE length(btrim(coalesce(description,''))) >= 160) AS meets_proxy_length,
       count(*) FILTER (WHERE length(btrim(coalesce(description,''))) BETWEEN 1 AND 159) AS blocked_by_proxy_length,
       count(*) FILTER (WHERE nullif(btrim(description),'') IS NULL) AS empty
FROM public.phone_model_translations GROUP BY language_code ORDER BY language_code;
SELECT count(*) AS published_editorials,
       count(DISTINCT phone_model_id) AS models_with_published_editorials
FROM public.agent_published_model_editorials WHERE published_at IS NOT NULL;
SELECT t.language_code,
       count(*) FILTER (WHERE e.phone_model_id IS NOT NULL) AS translations_with_published_editorial,
       count(*) FILTER (WHERE e.phone_model_id IS NULL) AS translations_without_published_editorial
FROM public.phone_model_translations t
LEFT JOIN (SELECT DISTINCT phone_model_id FROM public.agent_published_model_editorials
           WHERE published_at IS NOT NULL) e ON e.phone_model_id=t.phone_model_id
WHERE nullif(btrim(t.description),'') IS NOT NULL
GROUP BY t.language_code ORDER BY t.language_code;
SELECT id,status,started_at,finished_at FROM public.agent_research_runs ORDER BY id DESC LIMIT 10;
COMMIT;
