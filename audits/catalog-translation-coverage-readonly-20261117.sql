-- RetroPhone Armenia: read-only translation coverage and editorial join audit
-- Run before/after any Preview change; no publication flags are treated as HTML proof.
-- Snapshot timestamp is supplied by the database, not by this file.
select now() as checked_at_utc, t.language_code,
       count(*) as translation_rows,
       count(*) filter (where nullif(btrim(t.description),'') is not null) as filled_rows,
       count(distinct t.phone_model_id) as distinct_models
from public.phone_model_translations t
group by t.language_code order by t.language_code;

-- Distinguish absent translation rows from present-but-empty descriptions.
select l.language_code,
       count(*) as catalog_models,
       count(*) filter (where t.phone_model_id is null) as missing_rows,
       count(*) filter (where t.phone_model_id is not null
                          and nullif(btrim(t.description),'') is null) as empty_rows,
       count(*) filter (where nullif(btrim(t.description),'') is not null) as filled_rows
from public.phone_models m
cross join (values ('ru'),('hy'),('en')) as l(language_code)
left join public.phone_model_translations t
  on t.phone_model_id=m.id and t.language_code=l.language_code
group by l.language_code order by l.language_code;

-- Editorial/translation join is keyed by model ID; name matching is not reliable.
select e.phone_model_id,e.brand,e.model_name,
       count(t.language_code) filter (where nullif(btrim(t.description),'') is not null)
         as filled_translation_languages
from public.agent_published_model_editorials e
left join public.phone_model_translations t on t.phone_model_id=e.phone_model_id
group by e.phone_model_id,e.brand,e.model_name
order by e.phone_model_id limit 30;

-- Brand publication flags are database-only, NOT proof of public HTML rendering.
select id,name,slug,is_published,history_url,
       length(coalesce(short_history,'')) as short_history_chars
from public.brands order by sort_order nulls last,name;

-- Independently fetch public HTML for RU/HY/EN after SQL checks.
-- Compare visible DOM text, canonical/alternate URLs and language attributes.
