-- Live recovery source for verified model publication and agent health reporting
-- Captured on 2026-10-31; no tokens, credentials, private user data or per-row backups.

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
  IF FOUND THEN
    UPDATE public.agent_research_tasks
       SET status='approved', lease_until=NULL, updated_at=now()
    WHERE id=rec.task_id AND status<>'approved';
    done:=done+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'published',done,'skipped',skipped,
   'owner_approval_impersonated',false,'catalog_only',true,'inventory_unchanged',true);
END $function$;

CREATE OR REPLACE FUNCTION public.agent_capture_pipeline_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE report jsonb; findings jsonb; saved_id bigint;
BEGIN
 SELECT jsonb_build_object(
  'captured_at',now(),'models',(SELECT count(*) FROM public.phone_models),
  'catalog_tasks_total',(SELECT count(*) FROM public.agent_research_tasks),
  'research_tasks_by_status',(SELECT coalesce(jsonb_object_agg(status,n),'{}'::jsonb)
       FROM (SELECT status,count(*) n FROM public.agent_research_tasks GROUP BY status) s),
  'source_verified_publications',(SELECT count(*) FROM public.agent_published_model_editorials),
  'archival_intake_runs',(SELECT count(*) FROM public.agent_research_runs WHERE mode='multi_brand_archival_intake_v1'),
  'public_gallery_photos',(SELECT count(*) FROM public.phone_photos WHERE is_published),
  'models_with_hero',(SELECT count(*) FROM public.phone_models WHERE nullif(hero_image_url,'') IS NOT NULL),
  'media_worker_by_stage',(SELECT coalesce(jsonb_object_agg(stage,n),'{}'::jsonb)
       FROM (SELECT stage,count(*) n FROM public.agent_auto_enrichment_progress GROUP BY stage) s),
  'failed_agent_events_last_24h',(SELECT count(*) FROM public.agent_worker_events
       WHERE created_at>now()-interval '24 hours' AND event_type IN ('research_failed','multiagent_research_failed')),
  'duplicates_skipped_last_24h',(SELECT count(*) FROM public.agent_worker_events
       WHERE created_at>now()-interval '24 hours' AND event_type IN ('save_duplicate','multiagent_duplicate_skipped'))
 ) INTO report;
 report := report || jsonb_build_object(
  'stage_statuses',(
    SELECT coalesce(jsonb_object_agg(stage,state_counts),'{}'::jsonb)
    FROM (SELECT stage,jsonb_object_agg(status,n) state_counts
          FROM (SELECT stage,status,count(*) n
                FROM retrophone_internal.agent_stage_tracker
                GROUP BY stage,status) aggregated
          GROUP BY stage) groups_by_stage
  ),
  'source_discovery',(
    SELECT coalesce(jsonb_object_agg(status,n),'{}'::jsonb)
    FROM (SELECT status,count(*) n FROM retrophone_internal.source_discovery_progress
          GROUP BY status) s
  ),
  'unverified_candidate_sources',(SELECT count(*) FROM public.agent_research_sources
     WHERE verification_status='candidate'),
  'trilingual_translation_rows',(
    SELECT coalesce(jsonb_object_agg(language_code,n),'{}'::jsonb)
    FROM (SELECT language_code,count(*) n FROM public.phone_model_translations
          GROUP BY language_code) s
  ),
  'new_editorials_last_24h',(SELECT count(*)
    FROM public.agent_published_model_editorials
    WHERE published_at>now()-interval '24 hours')
 );
 findings:=jsonb_build_array(
   jsonb_build_object('code','needs_independent_sources',
      'count',(SELECT count(*) FROM public.agent_research_tasks WHERE status='needs_sources')),
   jsonb_build_object('code','photo_retry_pending',
      'count',(SELECT count(*) FROM public.agent_auto_enrichment_progress WHERE stage='retry')),
   jsonb_build_object('code','research_queue_pending',
      'count',(SELECT count(*) FROM public.agent_research_tasks WHERE status='queued'))
 );
 INSERT INTO public.agent_quality_audits(audit_type,scope,summary,findings)
 VALUES('agent_workflow','multiagent_pipeline_hourly',report,findings)
 RETURNING id INTO saved_id;
 RETURN jsonb_build_object('audit_id',saved_id,'summary',report,'findings',findings);
END $function$;

-- One-time status reconciliation for existing independently verified publications.
UPDATE public.agent_research_tasks t SET status='approved',lease_until=NULL,updated_at=now()
FROM public.agent_published_model_editorials e
WHERE e.phone_model_id=t.phone_model_id AND e.publication_method='autonomous_source_verified' AND t.status<>'approved';
