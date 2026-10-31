-- RetroPhone Armenia quality/publisher recovery snapshot 2026-10-31.
-- Review and apply on a restored database only after its dependencies are present.
-- Never fabricate publication eligibility; photo-less publication requires three recorded unsuccessful searches.

CREATE OR REPLACE FUNCTION public.agent_refresh_quality_gate(p_model_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_task public.agent_research_tasks%rowtype;
 v_model public.phone_models%rowtype;
 v_run public.agent_research_runs%rowtype;
 v_sources integer := 0;
 v_photos integer := 0;
 v_photo_attempts integer := 0;
 v_photo_waived boolean := false;
 v_model_match boolean := false;
 v_year_ok boolean := false;
 v_ru boolean := false;
 v_hy boolean := false;
 v_en boolean := false;
 v_manually_approved boolean := false;
 v_unresolved_corrections integer := 0;
 v_drafts jsonb := '{}'::jsonb;
 v_score integer := 0;
 v_blockers text[] := array[]::text[];
 v_status text := 'blocked';
 v_auto_eligible boolean := false;
begin
 select * into v_task from public.agent_research_tasks where phone_model_id=p_model_id limit 1;
 if not found then return; end if;
 select * into v_model from public.phone_models where id=p_model_id;
 select * into v_run from public.agent_research_runs where task_id=v_task.id order by id desc limit 1;
 
 select count(distinct lower(split_part(split_part(url,'://',2),'/',1))) into v_sources
 from public.agent_research_sources
 where task_id=v_task.id and verification_status='verified'
 and source_kind in ('official','museum') and url like 'https://%';
 
 select count(*) into v_photos from public.agent_research_sources
 where task_id=v_task.id and verification_status='verified'
 and source_kind='photo' and url like 'https://%'
 and nullif(btrim(coalesce(license,'')),'') is not null
 and lower(btrim(license)) not in ('unknown','none','n/a','unlicensed')
 and nullif(btrim(coalesce(author,'')),'') is not null;

 select attempts into v_photo_attempts from public.agent_photo_search_state where phone_model_id=p_model_id;
 v_photo_attempts:=coalesce(v_photo_attempts,0);
 v_photo_waived:=v_photos=0 and exists(
  select 1 from public.agent_photo_search_state
  where phone_model_id=p_model_id and attempts=3 and status='no_photo_after_3'
 );

 v_model_match := v_run.id is not null and lower(btrim(coalesce(v_run.structured_draft->>'model',''))) = lower(btrim(v_task.model_label));
 v_year_ok := v_model.release_year is not null and
 (v_model.year_type='released' OR (
  v_model.year_type='announced'
  AND v_model.display_year is not null AND v_model.display_year<=v_model.release_year
  AND v_run.technical_checks->>'release_year_verified'='true'
  AND exists(
    select 1 from public.agent_research_sources s
    where s.task_id=v_task.id and s.source_kind='official'
      and s.verification_status='verified'
      and s.url=v_run.technical_checks->>'release_year_evidence_url'
      and s.url ~ '^https://(www[.])?(nokia[.]com|globenewswire[.]com|sec[.]gov)/'
  )
 ));
 v_drafts := coalesce(v_run.structured_draft->'multilingual_drafts','{}'::jsonb);
 
 v_ru := length(btrim(coalesce(v_drafts #>> '{ru,description}',case when jsonb_typeof(v_drafts->'ru')='string' then v_drafts->>'ru' end,'')))>=160;
 v_hy := length(btrim(coalesce(v_drafts #>> '{hy,description}',case when jsonb_typeof(v_drafts->'hy')='string' then v_drafts->>'hy' end,'')))>=160;
 v_en := length(btrim(coalesce(v_drafts #>> '{en,description}',case when jsonb_typeof(v_drafts->'en')='string' then v_drafts->>'en' end,'')))>=160;
 
 if v_run.id is not null then
 select exists(
   select 1 from public.agent_research_reviews r
   where r.run_id=v_run.id and r.verdict='approved_draft'
   and r.checklist->>'human_checked'='true'
 ) into v_manually_approved;
 end if;
 
 select count(*) into v_unresolved_corrections
 from public.agent_editor_feedback
 where phone_model_id=p_model_id and verdict in ('rejected','corrected')
 and created_at > coalesce(v_run.started_at,'epoch'::timestamptz);

 if v_run.id is null then v_blockers:=array_append(v_blockers,'research_not_started'); end if;
 if not v_model_match then v_blockers:=array_append(v_blockers,'model_identity_unverified'); end if;
 if not v_year_ok then v_blockers:=array_append(v_blockers,'release_year_not_verified'); end if;
 if v_sources<2 then v_blockers:=array_append(v_blockers,'need_two_independent_verified_manufacturer_or_museum_sources'); end if;
 if v_photos<1 and not v_photo_waived then v_blockers:=array_append(v_blockers,'need_verified_photo_author_and_reuse_license'); end if;
 if not (v_ru and v_hy and v_en) then v_blockers:=array_append(v_blockers,'need_ru_hy_en_editorial_drafts'); end if;
 if v_unresolved_corrections>0 then v_blockers:=array_append(v_blockers,'new_editor_correction_requires_new_research'); end if;
 if not v_manually_approved then v_blockers:=array_append(v_blockers,'needs_human_editor_approval'); end if;
 
 v_score:=(case when v_model_match then 10 else 0 end)
 +(case when v_year_ok then 15 else 0 end)
 +(case when v_sources>=2 then 25 when v_sources=1 then 12 else 0 end)
 +(case when v_photos>=1 OR v_photo_waived then 15 else 0 end)
 +(case when v_ru then 10 else 0 end)+(case when v_hy then 10 else 0 end)+(case when v_en then 10 else 0 end)
 +(case when v_manually_approved then 5 else 0 end);
 
 v_auto_eligible := v_score>=90 AND v_run.id IS NOT NULL AND v_model_match
  AND v_year_ok AND v_sources>=2 AND (v_photos>=1 OR v_photo_waived)
  AND v_ru AND v_hy AND v_en AND v_unresolved_corrections=0
  AND v_run.technical_checks->>'release_year_verified'='true'
  AND EXISTS(SELECT 1 FROM public.agent_research_sources s WHERE s.task_id=v_task.id
     AND s.source_kind='official' AND s.verification_status='verified'
     AND s.url=v_run.technical_checks->>'release_year_evidence_url');

 if v_run.id is null then v_status:='blocked';
 elsif v_sources<2 then v_status:='needs_sources';
 elsif v_photos<1 and not v_photo_waived then v_status:='needs_photo';
 elsif not(v_ru and v_hy and v_en) then v_status:='needs_translation';
 elsif not(v_year_ok and v_model_match) or v_unresolved_corrections>0 or not v_manually_approved then v_status:='needs_editor_review';
 else v_status:='draft_approved'; end if;

 insert into public.agent_quality_gate_results
 (phone_model_id,task_id,run_id,score,status,checks,blockers,publication_allowed,checked_at)
 values
 (p_model_id,v_task.id,v_run.id,v_score,v_status,jsonb_build_object(
 'model_identity_exact',v_model_match,'release_year_verified',v_year_ok,
 'independent_historical_source_domains',v_sources,'licensed_photo_sources',v_photos,
 'photo_search_attempts',v_photo_attempts,'photo_waived_after_three',v_photo_waived,
 'draft_ru_present',v_ru,'draft_hy_present',v_hy,'draft_en_present',v_en,
 'human_draft_approved',v_manually_approved,
 'pending_editor_corrections',v_unresolved_corrections,
 'manual_photo_visual_review_required',not (v_photo_waived OR v_photos>0),'auto_publish',v_auto_eligible,
 'paid_generation_budget_usd',0),v_blockers,v_auto_eligible,now())
 on conflict(phone_model_id) do update set
 task_id=excluded.task_id,run_id=excluded.run_id,
 score=excluded.score,status=excluded.status,checks=excluded.checks,
 blockers=excluded.blockers,publication_allowed=excluded.publication_allowed,checked_at=now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.agent_autopublish_verified_research(p_limit integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE rec record; dr jsonb; src jsonb; photo record; d_ru text;d_hy text;d_en text;
done integer:=0; skipped integer:=0; photo_waived boolean:=false;
BEGIN
 IF p_limit<1 OR p_limit>10 THEN RAISE EXCEPTION 'invalid_limit'; END IF;
 FOR rec IN
  SELECT t.id task_id,t.phone_model_id,t.model_label,m.model_name,m.brand_id,m.display_year,m.release_year,
         b.name brand,r.id run_id,r.structured_draft,r.technical_checks,q.score,q.status,q.blockers
  FROM public.agent_research_tasks t
  JOIN public.phone_models m ON m.id=t.phone_model_id
  JOIN public.brands b ON b.id=m.brand_id
  JOIN public.agent_research_runs r ON r.task_id=t.id
  JOIN public.agent_quality_gate_results q ON q.task_id=t.id AND q.run_id=r.id
  WHERE r.id=(SELECT max(r2.id) FROM public.agent_research_runs r2 WHERE r2.task_id=t.id)
  AND q.score>=90
  AND q.status IN('draft_approved','needs_editor_review')
  AND (cardinality(q.blockers)=0 OR q.blockers=ARRAY['needs_human_editor_approval']::text[])
  AND r.technical_checks->>'release_year_verified'='true'
  AND m.release_year IS NOT NULL
  AND lower(b.name||' '||m.model_name)=lower(t.model_label)
  AND NOT EXISTS(SELECT 1 FROM public.agent_published_model_editorials e WHERE e.phone_model_id=t.phone_model_id)
  ORDER BY q.score DESC,t.id
  LIMIT p_limit
 LOOP
  -- historical source identity & release proof must be independently recorded.
  IF (SELECT count(DISTINCT lower(split_part(s.url,'/',3)))
      FROM public.agent_research_sources s WHERE s.task_id=rec.task_id
      AND s.source_kind IN ('official','museum') AND s.verification_status='verified'
      AND s.url LIKE 'https://%')<2 THEN skipped:=skipped+1;CONTINUE;END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.agent_research_sources s WHERE s.task_id=rec.task_id
    AND s.source_kind='official' AND s.verification_status='verified'
    AND s.url=rec.technical_checks->>'release_year_evidence_url'
  ) THEN skipped:=skipped+1;CONTINUE;END IF;
  SELECT s.url,s.author,s.license INTO photo
  FROM public.agent_research_sources s WHERE s.task_id=rec.task_id
  AND s.source_kind='photo' AND s.verification_status='verified'
  AND s.url~'^https://commons[.]wikimedia[.]org/wiki/File:[A-Za-z0-9%._()\\-]+$'
  AND length(trim(coalesce(s.author,'')))>=2
  AND lower(trim(coalesce(s.license,'')))~'^(cc by(-sa)? [234][.]0|cc0|public domain)$'
  ORDER BY s.id LIMIT 1;
  IF NOT FOUND THEN
    SELECT EXISTS(SELECT 1 FROM public.agent_photo_search_state ps
     WHERE ps.phone_model_id=rec.phone_model_id AND ps.attempts=3
       AND ps.status='no_photo_after_3') INTO photo_waived;
    IF NOT photo_waived THEN skipped:=skipped+1;CONTINUE;END IF;
  ELSE photo_waived:=false;
  END IF;
  dr=rec.structured_draft->'multilingual_drafts';
  d_ru=dr#>>'{ru,description}';d_hy=dr#>>'{hy,description}';d_en=dr#>>'{en,description}';
  IF length(trim(coalesce(d_ru,'')))<160 OR length(trim(coalesce(d_hy,'')))<160
     OR length(trim(coalesce(d_en,'')))<160 THEN skipped:=skipped+1;CONTINUE;END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('url',s.url,'title',s.title,'kind',s.source_kind)
                     ORDER BY s.id),'[]'::jsonb)
  INTO src FROM public.agent_research_sources s WHERE s.task_id=rec.task_id
    AND s.source_kind IN('official','museum') AND s.verification_status='verified'
    AND s.url LIKE 'https://%';
  INSERT INTO public.agent_published_model_editorials(
  phone_model_id,brand,model_name,announced_year,release_year,description_ru,description_hy,description_en,
  photo_url,photo_credit,photo_license,verified_sources,approved_batch_id,publication_method,research_run_id)
  VALUES(rec.phone_model_id,rec.brand,rec.model_name,rec.display_year,rec.release_year,
  d_ru,d_hy,d_en,
  CASE WHEN photo_waived THEN NULL ELSE 'https://commons.wikimedia.org/wiki/Special:FilePath/'||split_part(photo.url,'File:',2)||'?width=600' END,
  CASE WHEN photo_waived THEN NULL ELSE photo.author||' / Wikimedia Commons' END,
  CASE WHEN photo_waived THEN NULL ELSE photo.license END,src,NULL,'autonomous_source_verified',rec.run_id)
  ON CONFLICT(phone_model_id) DO NOTHING;
  IF FOUND THEN done:=done+1;END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'published',done,'skipped',skipped,
   'owner_approval_impersonated',false,'catalog_only',true,'inventory_unchanged',true);
END $function$
;


-- Publication_allowed is true only after the same strict checks used by the quality function.
ALTER TABLE public.agent_quality_gate_results
 DROP CONSTRAINT IF EXISTS agent_quality_gate_results_publication_allowed_check;
ALTER TABLE public.agent_quality_gate_results
 ADD CONSTRAINT agent_quality_gate_results_publication_allowed_check
 CHECK (
  publication_allowed=false OR (
   score>=90 AND status IN ('draft_approved','needs_editor_review')
   AND (cardinality(blockers)=0 OR blockers=ARRAY['needs_human_editor_approval']::text[])
   AND checks->>'auto_publish'='true' AND checks->>'model_identity_exact'='true'
   AND checks->>'release_year_verified'='true'
   AND checks->>'draft_ru_present'='true' AND checks->>'draft_hy_present'='true'
   AND checks->>'draft_en_present'='true'
   AND coalesce((checks->>'independent_historical_source_domains')::integer,0)>=2
   AND (coalesce((checks->>'licensed_photo_sources')::integer,0)>=1
      OR checks->>'photo_waived_after_three'='true')
   AND coalesce((checks->>'pending_editor_corrections')::integer,0)=0
 ));
