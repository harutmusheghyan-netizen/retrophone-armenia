-- Safe, single-model, source-verified publication pilot for RetroPhone Armenia.
-- Writes only a public historical editorial and the research task status.
-- Existing product stock, prices, photos, design and translations are not changed.
CREATE OR REPLACE FUNCTION retrophone_internal.publish_verified_editorial_pilot(
  p_model_id bigint,
  p_dry_run boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'retrophone_internal', 'pg_temp'
AS $pilot$
DECLARE
 v record;
 v_ru text;
 v_hy text;
 v_en text;
 v_current_ru text;
 v_current_hy text;
 v_current_en text;
 v_source_domains integer;
 v_year_domains integer;
 v_waive_photo boolean;
 v_has_photo boolean;
 v_sources jsonb;
 v_inserted bigint;
BEGIN
 IF p_model_id IS NULL OR p_model_id < 1 THEN
   RETURN jsonb_build_object('ok',false,'error','invalid_model_id');
 END IF;
 SELECT t.id AS task_id,t.model_label,t.status AS task_status,
        m.id AS model_id,m.model_name,m.release_year,m.year_type,m.is_published,
        b.name AS brand,
        r.id AS run_id,r.structured_draft,r.technical_checks,
        q.score,q.status AS quality_status,q.blockers
 INTO v
 FROM public.agent_research_tasks t
 JOIN public.phone_models m ON m.id=t.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id
 JOIN public.agent_research_runs r ON r.task_id=t.id
 JOIN public.agent_quality_gate_results q ON q.task_id=t.id AND q.run_id=r.id
 WHERE m.id=p_model_id
   AND r.id=(SELECT max(rr.id) FROM public.agent_research_runs rr WHERE rr.task_id=t.id)
 FOR UPDATE OF t;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','latest_quality_gate_missing'); END IF;
 IF EXISTS (SELECT 1 FROM public.agent_published_model_editorials e WHERE e.phone_model_id=p_model_id)
 THEN RETURN jsonb_build_object('ok',true,'already_published',true,'model_id',p_model_id,'published',0); END IF;
 IF NOT v.is_published OR lower(v.brand||' '||v.model_name)<>lower(v.model_label)
 THEN RETURN jsonb_build_object('ok',false,'error','model_identity_or_visibility_mismatch'); END IF;
 IF v.score<90 OR v.quality_status NOT IN ('needs_editor_review','draft_approved')
    OR NOT (COALESCE(v.blockers,'{}'::text[]) <@ ARRAY['needs_human_editor_approval']::text[])
 THEN RETURN jsonb_build_object('ok',false,'error','quality_gate_blocked','score',v.score,'blockers',v.blockers); END IF;
 IF v.release_year IS NULL OR v.year_type NOT IN ('released','announced')
 THEN RETURN jsonb_build_object('ok',false,'error','release_year_not_recorded'); END IF;
 SELECT count(DISTINCT lower(split_part(s.url,'/',3))),
        count(DISTINCT lower(split_part(s.url,'/',3))) FILTER (
          WHERE (coalesce(s.title,'')||' '||coalesce(s.evidence,'')) LIKE '%'||v.release_year::text||'%'),
        coalesce(jsonb_agg(jsonb_build_object('url',s.url,'title',s.title,'kind',s.source_kind)
                   ORDER BY s.id),'[]'::jsonb)
 INTO v_source_domains,v_year_domains,v_sources
 FROM public.agent_research_sources s
 WHERE s.task_id=v.task_id
   AND s.verification_status='verified'
   AND s.source_kind IN ('museum','official')
   AND s.url LIKE 'https://%';
 IF v_source_domains<2 OR v_year_domains<2
 THEN RETURN jsonb_build_object('ok',false,'error','two_independent_year_evidenced_sources_required',
   'verified_domains',v_source_domains,'year_evidenced_domains',v_year_domains); END IF;
 -- Museum-based annual dating is valid only for already researched historic models;
 -- do not require an impossible manufacturer press release for an early GSM model.
 IF NOT (
   v.technical_checks->>'release_year_verified'='true' OR
   (v.year_type='released' AND v_year_domains>=2)
 ) THEN RETURN jsonb_build_object('ok',false,'error','release_year_proof_missing'); END IF;
 SELECT EXISTS(SELECT 1 FROM public.agent_photo_search_state ps
                 WHERE ps.phone_model_id=p_model_id
                 AND ps.attempts=3 AND ps.status='no_photo_after_3')
 INTO v_waive_photo;
 SELECT EXISTS(SELECT 1 FROM public.agent_research_sources s
                 WHERE s.task_id=v.task_id AND s.source_kind='photo'
                 AND s.verification_status='verified'
                 AND s.url LIKE 'https://commons.wikimedia.org/wiki/File:%'
                 AND length(btrim(coalesce(s.author,'')))>=2
                 AND lower(btrim(coalesce(s.license,''))) ~ '^(cc by(-sa)? [234][.]0|cc0|public domain)$')
 INTO v_has_photo;
 IF NOT (v_waive_photo OR v_has_photo)
 THEN RETURN jsonb_build_object('ok',false,'error','verified_photo_or_three_attempt_waiver_required'); END IF;
 v_ru:=v.structured_draft#>>'{multilingual_drafts,ru,description}';
 v_hy:=v.structured_draft#>>'{multilingual_drafts,hy,description}';
 v_en:=v.structured_draft#>>'{multilingual_drafts,en,description}';
 SELECT max(CASE WHEN language_code='ru' THEN description END),
        max(CASE WHEN language_code='hy' THEN description END),
        max(CASE WHEN language_code='en' THEN description END)
 INTO v_current_ru,v_current_hy,v_current_en
 FROM public.phone_model_translations
 WHERE phone_model_id=p_model_id;
 IF length(btrim(coalesce(v_ru,'')))<160
    OR length(btrim(coalesce(v_hy,'')))<160
    OR length(btrim(coalesce(v_en,'')))<160
    OR v_ru !~ '[А-Яа-яЁё]'
    OR v_hy !~ '[Ա-Ֆա-ֆ]'
    OR v_en ~ '[А-Яа-яЁёԱ-Ֆա-ֆ]'
    OR v_ru IS DISTINCT FROM v_current_ru
    OR v_hy IS DISTINCT FROM v_current_hy
    OR v_en IS DISTINCT FROM v_current_en
 THEN RETURN jsonb_build_object('ok',false,'error','trilingual_verified_draft_mismatch'); END IF;
 IF p_dry_run THEN
   RETURN jsonb_build_object('ok',true,'ready',true,'dry_run',true,
     'model',v.brand||' '||v.model_name,'model_id',p_model_id,
     'source_domains',v_source_domains,'photo_waived',v_waive_photo,
     'languages',jsonb_build_array('ru','hy','en'),'publication',false);
 END IF;
 INSERT INTO public.agent_published_model_editorials(
   phone_model_id,brand,model_name,announced_year,release_year,
   description_ru,description_hy,description_en,
   photo_url,photo_credit,photo_license,verified_sources,
   approved_batch_id,publication_method,research_run_id
 ) SELECT p_model_id,v.brand,v.model_name,m.display_year,v.release_year,
   v_ru,v_hy,v_en,
   m.hero_image_url,m.image_credit,m.image_license,v_sources,
   NULL,'verified_source_pilot_20261107',v.run_id
 FROM public.phone_models m WHERE m.id=p_model_id
 ON CONFLICT (phone_model_id) DO NOTHING
 RETURNING phone_model_id INTO v_inserted;
 IF v_inserted IS NULL THEN
   RETURN jsonb_build_object('ok',true,'already_published',true,'published',0);
 END IF;
 UPDATE public.agent_research_tasks SET status='approved',lease_until=NULL,updated_at=now()
 WHERE id=v.task_id;
 RETURN jsonb_build_object('ok',true,'published',1,'model_id',p_model_id,
   'run_id',v.run_id,'source_domains',v_source_domains,'languages',jsonb_build_array('ru','hy','en'),
   'catalog_design_unchanged',true,'inventory_unchanged',true);
END
$pilot$;
REVOKE ALL ON FUNCTION retrophone_internal.publish_verified_editorial_pilot(bigint,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION retrophone_internal.publish_verified_editorial_pilot(bigint,boolean)
  TO service_role;
