-- RetroPhone Armenia: read-only verification before any Preview rollout
-- 2026-11-17; no production mutations.
WITH languages(code) AS (VALUES ('ru'),('hy'),('en')),
model_ids AS (SELECT DISTINCT phone_model_id FROM phone_model_translations),
coverage AS (
 SELECT l.code, count(m.phone_model_id) AS models_seen,
 count(t.phone_model_id) FILTER (WHERE nullif(btrim(t.description),'') IS NOT NULL) AS filled,
 count(t.phone_model_id) FILTER (WHERE t.phone_model_id IS NULL) AS missing_rows,
 count(t.phone_model_id) FILTER (WHERE t.phone_model_id IS NOT NULL AND nullif(btrim(t.description),'') IS NULL) AS empty_rows
 FROM languages l CROSS JOIN model_ids m
 LEFT JOIN phone_model_translations t ON t.phone_model_id=m.phone_model_id AND t.language_code=l.code
 GROUP BY l.code
)
SELECT * FROM coverage ORDER BY code;
-- Editorial gate diagnostic (not evidence of rendered HTML)
SELECT count(*) AS published_editorials,
       count(DISTINCT phone_model_id) AS editorial_model_ids
FROM agent_published_model_editorials WHERE published_at IS NOT NULL;
-- Agent liveness diagnostic
SELECT id,started_at,finished_at,status
FROM agent_research_runs ORDER BY started_at DESC LIMIT 10;
-- Brand count only: not evidence of language coverage or rendered pages
SELECT count(*) AS brand_count FROM brands;
-- After deploying to Preview, independently request RU/HY/EN HTML for sample and all routes.
-- Compare visible description, lang, status code, canonical and hreflang to source rows.
