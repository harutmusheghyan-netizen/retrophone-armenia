-- Nokia 2010 pilot preparation: independently read and corroborated on 2026-11-07.
-- Source 1 pre-existing: https://www.nokiamuseum.net/nokia-2010---1994
-- Source 2 checked: https://www.mobilephonemuseum.com/phone-detail/nokia-2010
-- Existing long RU/HY/EN catalog translations are preserved verbatim.
DO $prep$
DECLARE
  v_id bigint;
  v_task_id bigint;
  v_run_id bigint;
  v_drafts jsonb;
  v_lang_count integer;
BEGIN
  SELECT m.id,t.id,(
      SELECT max(r.id) FROM public.agent_research_runs r WHERE r.task_id=t.id)
  INTO v_id,v_task_id,v_run_id
  FROM public.phone_models m
  JOIN public.brands b ON b.id=m.brand_id
  JOIN public.agent_research_tasks t ON t.phone_model_id=m.id
  WHERE b.name='Nokia' AND m.model_name='2010';
  IF v_id IS NULL OR v_run_id IS NULL THEN RAISE EXCEPTION 'pilot_nokia_2010_not_found'; END IF;
  IF EXISTS(SELECT 1 FROM public.agent_published_model_editorials WHERE phone_model_id=v_id)
  THEN RAISE EXCEPTION 'pilot_model_already_has_verified_editorial'; END IF;
  SELECT jsonb_object_agg(language_code,jsonb_build_object('description',description)),count(*)
    INTO v_drafts,v_lang_count
  FROM public.phone_model_translations
  WHERE phone_model_id=v_id
  AND language_code IN ('ru','hy','en') AND length(btrim(description))>=160;
  IF v_lang_count<>3 THEN RAISE EXCEPTION 'three_complete_existing_translations_required'; END IF;
  -- This second museum independently lists the exact model, announcement year,
  -- type number NHE-3DN and weight. The page was inspected before this write.
  INSERT INTO public.agent_research_sources(
    task_id,source_kind,url,title,evidence,verification_status,reviewer_note)
  SELECT v_task_id,'museum','https://www.mobilephonemuseum.com/phone-detail/nokia-2010',
    'Nokia 2010 — Mobile Phone Museum',
    'Independently checked Nokia 2010 historical museum page: announced January 1994; NHE-3DN; 275 grams.',
    'verified',
    'Independent page inspection 2026-11-07. Verified exact Nokia 2010 identity and 1994 year; other individual facts need source-specific checking.'
  WHERE NOT EXISTS(
    SELECT 1 FROM public.agent_research_sources s
    WHERE s.task_id=v_task_id AND s.url='https://www.mobilephonemuseum.com/phone-detail/nokia-2010'
  );
  UPDATE public.agent_research_runs r
  SET structured_draft=jsonb_set(coalesce(r.structured_draft,'{}'::jsonb),
      '{multilingual_drafts}',v_drafts,true),
      technical_checks=jsonb_set(
        jsonb_set(
          jsonb_set(coalesce(r.technical_checks,'{}'::jsonb),
            '{release_year_verified}','true'::jsonb,true),
          '{release_year_evidence_url}',
          to_jsonb('https://www.mobilephonemuseum.com/phone-detail/nokia-2010'::text),true),
        '{year_verification_method}',
        to_jsonb('two_independent_museum_pages_confirm_1994'::text),true)
  WHERE r.id=v_run_id AND r.task_id=v_task_id;
  PERFORM public.agent_refresh_quality_gate(v_id);
END
$prep$;