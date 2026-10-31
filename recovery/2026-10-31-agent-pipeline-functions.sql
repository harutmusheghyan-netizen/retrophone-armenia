-- RetroPhone Armenia live function recovery snapshot, 2026-10-31.
-- Review before replay. No secret values or user data.
-- Legacy pilot function remains documented in the live Supabase migration history.

CREATE OR REPLACE FUNCTION public.agent_finish_auto_enrichment_job(p_model_id bigint, p_status text, p_error text DEFAULT NULL::text, p_file_page_url text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_author text DEFAULT NULL::text, p_license text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE m public.phone_models%rowtype; br text; wrote boolean:=false; n integer; actual_stage text;
BEGIN
 IF p_status NOT IN ('photo_found','no_licensed_photo','retry') THEN RAISE EXCEPTION 'invalid_status'; END IF;
 SELECT * INTO m FROM public.phone_models WHERE id=p_model_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_model'; END IF;
 SELECT attempts INTO n FROM public.agent_auto_enrichment_progress WHERE phone_model_id=p_model_id FOR UPDATE;
 IF n IS NULL THEN RAISE EXCEPTION 'job_not_claimed'; END IF;
 SELECT name INTO br FROM public.brands WHERE id=m.brand_id;
 IF p_status='photo_found' THEN
  IF p_file_page_url NOT LIKE 'https://commons.wikimedia.org/wiki/File:%'
   OR p_image_url NOT LIKE 'https://commons.wikimedia.org/wiki/Special:FilePath/%'
   OR length(trim(coalesce(p_author,'')))<2 OR length(trim(coalesce(p_license,'')))<3
   OR lower(coalesce(p_license,'')) ~ '(non.commercial|no.derivatives|unknown|not.specified)'
   OR length(p_file_page_url)>650 OR length(p_image_url)>650
  THEN RAISE EXCEPTION 'unsafe_photo_metadata'; END IF;
  INSERT INTO public.agent_catalog_verified_media
    (phone_model_id,brand,model_name,file_page_url,image_url,author,license,match_method,source_metadata,verified_at)
  VALUES(p_model_id,br,m.model_name,p_file_page_url,p_image_url,p_author,p_license,
         'strict_filename_and_commons_api_license',coalesce(p_metadata,'{}'::jsonb),now())
  ON CONFLICT(phone_model_id) DO NOTHING;
  INSERT INTO public.phone_photos
    (phone_model_id,image_url,source_url,photographer,license,sort_order,is_primary,is_published)
  SELECT p_model_id,p_image_url,p_file_page_url,p_author,p_license,0,
     NOT EXISTS(SELECT 1 FROM public.phone_photos WHERE phone_model_id=p_model_id AND is_primary),true
  WHERE NOT EXISTS (SELECT 1 FROM public.phone_photos
   WHERE phone_model_id=p_model_id AND (source_url=p_file_page_url OR split_part(image_url,'?',1)=split_part(p_image_url,'?',1)));
  UPDATE public.phone_models SET
    hero_image_url=coalesce(nullif(hero_image_url,''),p_image_url),
    image_source_url=CASE WHEN nullif(hero_image_url,'') IS NULL
       OR split_part(hero_image_url,'?',1)=split_part(p_image_url,'?',1)
       THEN coalesce(nullif(image_source_url,''),p_file_page_url) ELSE image_source_url END,
    image_credit=CASE WHEN nullif(hero_image_url,'') IS NULL
       OR split_part(hero_image_url,'?',1)=split_part(p_image_url,'?',1)
       THEN coalesce(nullif(image_credit,''),p_author) ELSE image_credit END,
    image_license=CASE WHEN nullif(hero_image_url,'') IS NULL
       OR split_part(hero_image_url,'?',1)=split_part(p_image_url,'?',1)
       THEN coalesce(nullif(image_license,''),p_license) ELSE image_license END,
    updated_at=now()
  WHERE id=p_model_id AND (nullif(hero_image_url,'') IS NULL OR
    (split_part(hero_image_url,'?',1)=split_part(p_image_url,'?',1)
     AND (nullif(image_license,'') IS NULL OR nullif(image_source_url,'') IS NULL)));
  wrote:=true;
 END IF;
 actual_stage:=CASE WHEN p_status='photo_found' THEN 'photo_found'
   WHEN n>=3 THEN 'no_licensed_photo' ELSE 'retry' END;
 UPDATE public.agent_auto_enrichment_progress
   SET stage=actual_stage,processed_at=now(),updated_at=now(),
    last_error=left(nullif(p_error,''),250),
    next_attempt_at=CASE WHEN actual_stage='retry' THEN now()+interval '40 minutes' ELSE NULL END
 WHERE phone_model_id=p_model_id;
 INSERT INTO public.agent_photo_search_state(phone_model_id,attempts,status,last_attempt_at,updated_at)
 VALUES(p_model_id,n,CASE WHEN actual_stage='photo_found' THEN 'found_verified'
                          WHEN actual_stage='no_licensed_photo' THEN 'no_photo_after_3' ELSE 'pending' END,
        now(),now())
 ON CONFLICT(phone_model_id) DO UPDATE SET
  attempts=greatest(public.agent_photo_search_state.attempts,excluded.attempts),
  status=excluded.status,last_attempt_at=now(),updated_at=now();
 RETURN jsonb_build_object('ok',true,'model_id',p_model_id,'photo_saved',wrote,
                           'status',actual_stage,'attempts',n);
END $function$


CREATE OR REPLACE FUNCTION public.agent_claim_catalog_research_jobs(p_limit integer DEFAULT 5)
 RETURNS TABLE(task_id bigint, phone_model_id bigint, brand text, model_name text, run_number integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
 IF p_limit<1 OR p_limit>8 THEN RAISE EXCEPTION 'invalid_batch_limit'; END IF;
 RETURN QUERY
 WITH ranked AS (
  SELECT t.id,
    row_number() OVER (PARTITION BY m.brand_id ORDER BY t.dispatch_count,t.priority DESC,t.id) AS brand_order
  FROM public.agent_research_tasks t
  JOIN public.phone_models m ON m.id=t.phone_model_id
  JOIN public.agent_catalog_workplan w ON w.phone_model_id=m.id
  WHERE (w.status='planned' OR
    (w.status='pilot_active' AND m.model_name NOT IN
      ('2140','2300','2323 classic','2330 classic','2600','2610','2630','2650','2652','2660')))
    AND t.status IN ('queued','needs_sources','revision_needed')
    AND t.dispatch_count<3 AND (t.lease_until IS NULL OR t.lease_until<=now())
    AND (t.last_dispatched_at IS NULL OR t.last_dispatched_at<now()-interval '4 hours')
    AND NOT EXISTS (SELECT 1 FROM public.agent_published_model_editorials ed
       WHERE ed.phone_model_id=t.phone_model_id)
 ), selected AS (
  SELECT t.id FROM ranked r JOIN public.agent_research_tasks t ON t.id=r.id
  ORDER BY r.brand_order,t.dispatch_count,t.priority DESC,t.id
  FOR UPDATE OF t SKIP LOCKED LIMIT p_limit
 ), claimed AS (
  UPDATE public.agent_research_tasks t SET
   lease_until=now()+interval '9 minutes',status='researching',
   last_dispatched_at=now(),dispatch_count=t.dispatch_count+1,updated_at=now()
  FROM selected s WHERE t.id=s.id
  RETURNING t.id,t.phone_model_id,t.dispatch_count
 )
 SELECT c.id,c.phone_model_id,b.name::text,m.model_name::text,c.dispatch_count
 FROM claimed c JOIN public.phone_models m ON m.id=c.phone_model_id
 JOIN public.brands b ON b.id=m.brand_id ORDER BY c.id;
END $function$


CREATE OR REPLACE FUNCTION public.agent_save_catalog_archival_draft_once(p_task_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE t public.agent_research_tasks%rowtype;
 m public.phone_models%rowtype;
 a public.agent_catalog_archival_summaries%rowtype;
 v public.agent_catalog_verified_media%rowtype;
 fp text;
 prev text;
 d jsonb;
 stages jsonb;
 inserted_id bigint;
 result_status text;
 BEGIN
 SELECT * INTO t FROM public.agent_research_tasks WHERE id=p_task_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'unknown_task'; END IF;
 SELECT * INTO m FROM public.phone_models WHERE id=t.phone_model_id;
 SELECT * INTO a FROM public.agent_catalog_archival_summaries WHERE phone_model_id=t.phone_model_id;
 SELECT * INTO v FROM public.agent_catalog_verified_media WHERE phone_model_id=t.phone_model_id;
 fp:=md5(concat_ws('|',t.phone_model_id,coalesce(a.generated_at::text,'missing'),
  coalesce(v.image_url,'no-verified-photo'),coalesce(m.release_year::text,'unknown')));
 SELECT input_fingerprint INTO prev FROM public.agent_research_runs
 WHERE task_id=t.id ORDER BY id DESC LIMIT 1;
 stages:=jsonb_build_object(
 'researcher',CASE WHEN a.phone_model_id IS NOT NULL THEN 'archival_draft_loaded' ELSE 'missing_archive' END,
 'source_verifier','independent_source_review_required',
 'licensed_media',CASE WHEN v.phone_model_id IS NOT NULL THEN 'already_licensed' ELSE 'photo_worker_queue' END,
 'translator',CASE WHEN nullif(a.summary_ru,'') IS NOT NULL AND nullif(a.summary_hy,'') IS NOT NULL
                       AND nullif(a.summary_en,'') IS NOT NULL THEN 'archival_trilingual_drafts' ELSE 'drafts_missing' END,
 'publisher','blocked_until_independent_quality_check');
 IF prev=fp THEN
   result_status:='duplicate_skipped';
 ELSE
   d:=jsonb_build_object(
    'model',t.model_label,'status','sources_only_needs_review',
    'historical_archive_unverified',true,
    'source_url',coalesce(a.source_url,m.source_url),
    'multilingual_drafts',CASE WHEN a.phone_model_id IS NULL THEN '{}'::jsonb ELSE
       jsonb_build_object('ru',jsonb_build_object('description',a.summary_ru),
                          'hy',jsonb_build_object('description',a.summary_hy),
                          'en',jsonb_build_object('description',a.summary_en)) END,
    'year_label',coalesce(a.year_label,m.display_year),
    'photo_on_site',coalesce(v.image_url,m.hero_image_url),
    'blockers',jsonb_build_array('need_two_independent_verified_sources','release_year_not_verified',
                                'archival_drafts_need_factual_review'));
   INSERT INTO public.agent_research_runs(task_id,status,mode,structured_draft,technical_checks,
         automation_cost_usd,started_at,finished_at,input_fingerprint)
   VALUES(t.id,'sources_only','multi_brand_archival_intake_v1',d,
          jsonb_build_object('site_edited',false,'release_year_verified',false,
                'model_identity_exact',true,'pipeline_stages',stages,'zero_paid_spend',true),
          0,now(),now(),fp)
   RETURNING id INTO inserted_id;
   result_status:='draft_saved';
 END IF;
 UPDATE public.agent_research_tasks SET status='needs_sources',lease_until=NULL,updated_at=now()
 WHERE id=t.id;
 INSERT INTO public.agent_worker_events(event_type,task_id,details)
 VALUES(CASE WHEN result_status='duplicate_skipped' THEN 'multiagent_duplicate_skipped' ELSE 'multiagent_archival_intake' END,
 t.id,jsonb_build_object('phone_model_id',t.phone_model_id,'result',result_status,
 'role_results',stages,'run_id',inserted_id,'public_catalog_changed',false));
 RETURN jsonb_build_object('ok',true,'task_id',t.id,'result',result_status,
   'run_id',inserted_id,'roles',stages);
END $function$


CREATE OR REPLACE FUNCTION public.agent_process_catalog_research_queue(p_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE r record; n integer:=0; saved integer:=0; skipped integer:=0; errors integer:=0; response jsonb;
BEGIN
 IF p_limit<1 OR p_limit>8 THEN RAISE EXCEPTION 'invalid_batch_limit';END IF;
 FOR r IN SELECT * FROM public.agent_claim_catalog_research_jobs(p_limit) LOOP
 BEGIN
  response:=public.agent_save_catalog_archival_draft_once(r.task_id);
  n:=n+1;
  IF response->>'result'='duplicate_skipped' THEN skipped:=skipped+1;
  ELSE saved:=saved+1;END IF;
 EXCEPTION WHEN OTHERS THEN
   errors:=errors+1;
   UPDATE public.agent_research_tasks SET status='needs_sources',lease_until=NULL,updated_at=now()
   WHERE id=r.task_id;
   INSERT INTO public.agent_worker_events(event_type,task_id,details)
   VALUES('multiagent_research_failed',r.task_id,jsonb_build_object('error',left(SQLERRM,180)));
 END;
 END LOOP;
 RETURN jsonb_build_object('claimed',n+errors,'drafts_saved',saved,
   'duplicates_skipped',skipped,'errors',errors,'site_modified',false);
END $function$


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
END $function$

REVOKE ALL ON FUNCTION public.agent_claim_catalog_research_jobs(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_save_catalog_archival_draft_once(bigint) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_process_catalog_research_queue(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.agent_capture_pipeline_health() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_claim_catalog_research_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_save_catalog_archival_draft_once(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_process_catalog_research_queue(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.agent_capture_pipeline_health() TO service_role;
