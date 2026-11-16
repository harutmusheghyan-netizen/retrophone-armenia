-- RetroPhone Armenia: read-only translation coverage audit (2026-11-16).
-- Run in Supabase SQL editor; no data modifications.
WITH coverage AS (
 SELECT pm.id, pm.model_name,
        max(CASE WHEN t.language_code='ru' AND nullif(btrim(t.description),'') IS NOT NULL THEN 1 ELSE 0 END) AS ru,
        max(CASE WHEN t.language_code='hy' AND nullif(btrim(t.description),'') IS NOT NULL THEN 1 ELSE 0 END) AS hy,
        max(CASE WHEN t.language_code='en' AND nullif(btrim(t.description),'') IS NOT NULL THEN 1 ELSE 0 END) AS en
 FROM public.phone_models pm
 LEFT JOIN public.phone_model_translations t ON t.phone_model_id=pm.id
 GROUP BY pm.id,pm.model_name
)
SELECT count(*) AS total_models, sum(ru) AS ru_filled, sum(hy) AS hy_filled,
       sum(en) AS en_filled, count(*)-sum(ru) AS ru_missing,
       count(*)-sum(hy) AS hy_missing, count(*)-sum(en) AS en_missing
FROM coverage;

-- Missing model IDs, independent of is_published. Compare these with actual rendered HTML.
WITH langs AS (SELECT unnest(ARRAY['ru','hy','en']) AS language_code)
SELECT pm.id AS phone_model_id, pm.model_name, l.language_code
FROM public.phone_models pm CROSS JOIN langs l
LEFT JOIN public.phone_model_translations t
 ON t.phone_model_id=pm.id AND t.language_code=l.language_code
WHERE nullif(btrim(t.description),'') IS NULL
ORDER BY pm.id,l.language_code;
