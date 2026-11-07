CREATE OR REPLACE FUNCTION public.cms_publish_admin_draft(
 p_id uuid,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp' AS $cms_publish$
DECLARE d public.cms_editor_drafts%ROWTYPE;
DECLARE doc jsonb;
DECLARE before jsonb;
DECLARE m public.phone_models%ROWTYPE;
DECLARE b public.brands%ROWTYPE;
DECLARE v_brand text;
DECLARE v_price numeric;
DECLARE v_stock integer;
DECLARE v_product bigint;
DECLARE v_out text;
DECLARE v_license text;
DECLARE v_url text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'cms_admin_access_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.cms_editor_drafts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'cms_draft_not_found'; END IF;
 IF d.revision IS DISTINCT FROM p_expected_revision OR d.previewed_revision IS DISTINCT FROM d.revision OR d.previewed_at IS NULL
 THEN RAISE EXCEPTION 'cms_preview_current_revision_required'; END IF;
 IF d.published_revision=d.revision THEN
   RETURN jsonb_build_object('ok',true,'already_published',true,'section',d.section,'record_key',d.record_key);
 END IF;
 doc:=d.document;
 IF d.section='catalog' THEN
   IF length(btrim(coalesce(doc->>'description_ru','')))<80
      OR length(btrim(coalesce(doc->>'description_hy','')))<80
      OR length(btrim(coalesce(doc->>'description_en','')))<80
   THEN RAISE EXCEPTION 'cms_full_three_language_descriptions_required'; END IF;
 ELSIF d.section='brand' THEN
   IF length(btrim(coalesce(doc->>'history_ru','')))<100
     OR length(btrim(coalesce(doc->>'history_hy','')))<100
     OR length(btrim(coalesce(doc->>'history_en','')))<100
   THEN RAISE EXCEPTION 'cms_full_three_language_histories_required'; END IF;
 ELSIF d.section='about' THEN
   IF length(btrim(coalesce(doc->>'title_ru','')))<5
      OR length(btrim(coalesce(doc->>'title_hy','')))<5
      OR length(btrim(coalesce(doc->>'title_en','')))<5
      OR length(btrim(coalesce(doc->>'body_ru','')))<60
      OR length(btrim(coalesce(doc->>'body_hy','')))<60
      OR length(btrim(coalesce(doc->>'body_en','')))<60
   THEN RAISE EXCEPTION 'cms_full_three_language_about_required'; END IF;
 ELSIF d.section='homepage' THEN
   IF length(btrim(coalesce(doc->>'text_ru','')))<5
      OR length(btrim(coalesce(doc->>'text_hy','')))<5
      OR length(btrim(coalesce(doc->>'text_en','')))<5
   THEN RAISE EXCEPTION 'cms_full_three_language_home_block_required'; END IF;
 END IF;
 v_url:=nullif(btrim(coalesce(doc->>'image_url','')),'');
 IF v_url IS NOT NULL THEN
   v_license:=nullif(btrim(coalesce(doc->>'image_license','')),'');
   IF length(btrim(coalesce(doc->>'image_credit','')))<2
     OR nullif(btrim(coalesce(doc->>'image_source_url','')),'') IS NULL
     OR v_license IS NULL OR v_license NOT IN ('CC BY 2.0','CC BY 3.0','CC BY 4.0',
       'CC BY-SA 3.0','CC BY-SA 4.0','CC0','Public domain',
       'Owned by RetroPhone Armenia')
   THEN RAISE EXCEPTION 'cms_photo_license_and_credit_required'; END IF;
   IF v_license='Owned by RetroPhone Armenia' THEN
     IF v_url !~ '^https://aikxbgixitaaatkmcols[.]supabase[.]co/storage/v1/object/public/'
       OR (doc->>'image_source_url')<>v_url
     THEN RAISE EXCEPTION 'cms_owned_photo_source_invalid'; END IF;
   ELSIF v_url !~ '^https://commons[.]wikimedia[.]org/wiki/Special:FilePath/'
     OR (doc->>'image_source_url') !~ '^https://commons[.]wikimedia[.]org/wiki/File:'
   THEN RAISE EXCEPTION 'cms_photo_must_be_licensed_commons'; END IF;
 END IF;
 IF d.section='catalog' THEN
   SELECT * INTO m FROM public.phone_models WHERE id=d.record_key::bigint FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'cms_model_not_found'; END IF;
   before:=jsonb_build_object('model',to_jsonb(m),
      'translations',(SELECT coalesce(jsonb_object_agg(language_code,description),'{}'::jsonb)
       FROM public.phone_model_translations WHERE phone_model_id=m.id),
      'products',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb)
       FROM public.products p WHERE phone_model_id=m.id));
   IF doc ? 'release_year' AND nullif(doc->>'release_year','') IS NOT NULL THEN
      IF (doc->>'release_year') !~ '^\d{4}$'
      THEN RAISE EXCEPTION 'cms_year_invalid'; END IF;
   END IF;
   UPDATE public.phone_models SET
      description=doc->>'description_ru',
      model_name=coalesce(nullif(btrim(doc->>'model_name'),''),m.model_name),
      release_year=CASE WHEN doc ? 'release_year' AND nullif(doc->>'release_year','') IS NOT NULL
        THEN (doc->>'release_year')::smallint ELSE m.release_year END,
      hero_image_url=coalesce(v_url,m.hero_image_url),
      image_source_url=CASE WHEN v_url IS NOT NULL THEN doc->>'image_source_url' ELSE m.image_source_url END,
      image_credit=CASE WHEN v_url IS NOT NULL THEN doc->>'image_credit' ELSE m.image_credit END,
      image_license=CASE WHEN v_url IS NOT NULL THEN v_license ELSE m.image_license END,
      updated_at=clock_timestamp()
   WHERE id=m.id;
   INSERT INTO public.phone_model_translations(phone_model_id,language_code,description)
      VALUES(m.id,'ru',doc->>'description_ru'),(m.id,'hy',doc->>'description_hy'),
            (m.id,'en',doc->>'description_en')
      ON CONFLICT(phone_model_id,language_code) DO UPDATE
      SET description=EXCLUDED.description,updated_at=clock_timestamp();
   IF (doc ? 'price_amd')<>(doc ? 'stock_quantity')
   THEN RAISE EXCEPTION 'cms_price_and_stock_must_be_supplied_together'; END IF;
   IF doc ? 'price_amd' THEN
     IF (doc->>'price_amd') !~ '^\d+(\.\d{1,2})?$'
       OR (doc->>'stock_quantity') !~ '^\d{1,7}$'
     THEN RAISE EXCEPTION 'cms_invalid_price_or_stock'; END IF;
     v_price:=(doc->>'price_amd')::numeric;
     v_stock:=(doc->>'stock_quantity')::integer;
     IF length(coalesce(doc->>'condition',''))>180
     THEN RAISE EXCEPTION 'cms_condition_too_long'; END IF;
     SELECT brand_row.name INTO v_brand FROM public.brands AS brand_row WHERE brand_row.id=m.brand_id;
     SELECT id INTO v_product FROM public.products WHERE phone_model_id=m.id
     ORDER BY id LIMIT 1 FOR UPDATE;
     IF v_product IS NOT NULL THEN
       UPDATE public.products SET price_amd=v_price,stock_quantity=v_stock,
         condition=doc->>'condition',
         is_published=CASE WHEN doc ? 'is_published' THEN (doc->>'is_published')::boolean ELSE is_published END,
         updated_at=clock_timestamp()
         WHERE id=v_product;
     ELSE
       INSERT INTO public.products(brand,model,description,condition,
         price_amd,stock_quantity,phone_model_id,is_published)
       VALUES(v_brand,coalesce(nullif(doc->>'model_name',''),m.model_name),
         doc->>'description_ru',doc->>'condition',
         v_price,v_stock,m.id,COALESCE((doc->>'is_published')::boolean,false));
     END IF;
   END IF;
   v_out:='catalog_database_updated_live_render_check_required';
 ELSIF d.section='brand' THEN
   SELECT * INTO b FROM public.brands WHERE id=d.record_key::bigint FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'cms_brand_not_found'; END IF;
   before:=to_jsonb(b);
   UPDATE public.brands SET short_history=doc->>'history_ru',updated_at=clock_timestamp()
      WHERE id=b.id;
   v_out:='history_static_site_adapter_required';
 ELSE
   before:=(SELECT document FROM public.cms_published_blocks
      WHERE section=d.section AND record_key=d.record_key);
   v_out:='static_page_adapter_required';
 END IF;
 IF d.section IN ('brand','about','homepage') THEN
    INSERT INTO public.cms_published_blocks(section,record_key,document,published_by)
      VALUES(d.section,d.record_key,doc,auth.uid())
    ON CONFLICT(section,record_key) DO UPDATE SET
      document=EXCLUDED.document,version=cms_published_blocks.version+1,
      published_at=clock_timestamp(),published_by=auth.uid(),
      awaiting_site_integration=true;
 END IF;
 INSERT INTO public.cms_admin_audit(section,record_key,before_document,
     after_document,actor,action)
 VALUES(d.section,d.record_key,before,doc,auth.uid(),'publish');
 UPDATE public.cms_editor_drafts SET published_revision=d.revision,
    updated_at=clock_timestamp() WHERE id=d.id;
 RETURN jsonb_build_object('ok',true,'published_to_database',true,
  'site_sync_status',v_out,'section',d.section,'record_key',d.record_key,
  'revision',d.revision,'live_site_verified',false);
END;
$cms_publish$;