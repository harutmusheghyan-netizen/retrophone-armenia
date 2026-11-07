CREATE OR REPLACE FUNCTION public.cms_save_admin_draft(p_section text, p_record_key text, p_document jsonb, p_expected_revision integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE d public.cms_editor_drafts%ROWTYPE;
DECLARE v_allowed text[];
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(SELECT 1 FROM public.admin_users WHERE user_id=(SELECT auth.uid()))
 THEN RAISE EXCEPTION 'cms_admin_access_required' USING ERRCODE='42501'; END IF;
 IF p_section NOT IN ('catalog','brand','about','homepage')
   OR p_record_key IS NULL OR length(p_record_key)>80
   OR p_document IS NULL OR jsonb_typeof(p_document)<>'object'
   OR octet_length(p_document::text)>110000
 THEN RAISE EXCEPTION 'cms_invalid_draft'; END IF;
 IF p_section IN ('catalog','brand') THEN
   IF p_record_key !~ '^[1-9][0-9]*$' OR length(p_record_key)>15
   THEN RAISE EXCEPTION 'cms_invalid_record_key'; END IF;
   IF p_section='catalog' AND NOT EXISTS(SELECT 1 FROM public.phone_models WHERE id=p_record_key::bigint)
   THEN RAISE EXCEPTION 'cms_model_not_found'; END IF;
   IF p_section='brand' AND NOT EXISTS(SELECT 1 FROM public.brands WHERE id=p_record_key::bigint)
   THEN RAISE EXCEPTION 'cms_brand_not_found'; END IF;
 ELSIF p_section='about' AND p_record_key<>'main'
 THEN RAISE EXCEPTION 'cms_about_key_not_allowed';
 ELSIF p_section='homepage' AND p_record_key NOT IN
   ('hero','about_excerpt','news_heading','catalog_heading','footer_note')
 THEN RAISE EXCEPTION 'cms_home_block_not_allowed';
 END IF;
 v_allowed:=CASE p_section
 WHEN 'catalog' THEN ARRAY['description_ru','description_hy','description_en','model_name','release_year',
 'image_url','image_source_url','image_credit','image_license','price_amd','stock_quantity','condition','is_published']
 WHEN 'brand' THEN ARRAY['history_ru','history_hy','history_en','image_url','image_source_url','image_credit','image_license']
 WHEN 'about' THEN ARRAY['title_ru','title_hy','title_en','body_ru','body_hy','body_en',
 'image_url','image_source_url','image_credit','image_license',
 'about_eyebrow_ru',
 'about_eyebrow_hy',
 'about_eyebrow_en',
 'about_title_ru',
 'about_title_hy',
 'about_title_en',
 'about_lead_ru',
 'about_lead_hy',
 'about_lead_en',
 'about_since_ru',
 'about_since_hy',
 'about_since_en',
 'about_sinceLabel_ru',
 'about_sinceLabel_hy',
 'about_sinceLabel_en',
 'about_founderLabel_ru',
 'about_founderLabel_hy',
 'about_founderLabel_en',
 'about_founder_ru',
 'about_founder_hy',
 'about_founder_en',
 'about_storyTitle_ru',
 'about_storyTitle_hy',
 'about_storyTitle_en',
 'about_p1_ru',
 'about_p1_hy',
 'about_p1_en',
 'about_p2_ru',
 'about_p2_hy',
 'about_p2_en',
 'about_p3_ru',
 'about_p3_hy',
 'about_p3_en',
 'about_whyTitle_ru',
 'about_whyTitle_hy',
 'about_whyTitle_en',
 'about_whyText_ru',
 'about_whyText_hy',
 'about_whyText_en',
 'about_brandsTitle_ru',
 'about_brandsTitle_hy',
 'about_brandsTitle_en',
 'about_brandsText_ru',
 'about_brandsText_hy',
 'about_brandsText_en',
 'about_companyTitle_ru',
 'about_companyTitle_hy',
 'about_companyTitle_en',
 'about_companyText_ru',
 'about_companyText_hy',
 'about_companyText_en',
 'about_bottom_ru',
 'about_bottom_hy',
 'about_bottom_en',
 'about_catalogBtn_ru',
 'about_catalogBtn_hy',
 'about_catalogBtn_en',
 'about_historyBtn_ru',
 'about_historyBtn_hy',
 'about_historyBtn_en',
 'about_subtle_ru',
 'about_subtle_hy',
 'about_subtle_en',
 'about_socialTitle_ru',
 'about_socialTitle_hy',
 'about_socialTitle_en',
 'about_socialText_ru',
 'about_socialText_hy',
 'about_socialText_en',
 'about_socialBtn_ru',
 'about_socialBtn_hy',
 'about_socialBtn_en',
 'about_footerSocial_ru',
 'about_footerSocial_hy',
 'about_footerSocial_en',
 'about_footerProject_ru',
 'about_footerProject_hy',
 'about_footerProject_en',
 'about_footerCatalog_ru',
 'about_footerCatalog_hy',
 'about_footerCatalog_en',
 'about_footerHistory_ru',
 'about_footerHistory_hy',
 'about_footerHistory_en',
 'about_footerSale_ru',
 'about_footerSale_hy',
 'about_footerSale_en']
 ELSE ARRAY['text_ru','text_hy','text_en']
 END;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_document) AS k WHERE NOT k=ANY(v_allowed))
 THEN RAISE EXCEPTION 'cms_document_field_not_allowed'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_document) AS v(k,x)
   WHERE jsonb_typeof(v.x) NOT IN ('string','number','boolean','null'))
 THEN RAISE EXCEPTION 'cms_nested_document_not_allowed'; END IF;
 SELECT * INTO d FROM public.cms_editor_drafts
 WHERE section=p_section AND record_key=p_record_key FOR UPDATE;
 IF FOUND THEN
   IF p_expected_revision IS NULL OR d.revision<>p_expected_revision
   THEN RAISE EXCEPTION 'cms_draft_changed_reload'; END IF;
   UPDATE public.cms_editor_drafts
   SET document=p_document,revision=revision+1,previewed_at=NULL,
       previewed_revision=NULL,updated_at=clock_timestamp(),updated_by=auth.uid()
   WHERE id=d.id RETURNING * INTO d;
 ELSE
   IF p_expected_revision IS NOT NULL AND p_expected_revision<>0
   THEN RAISE EXCEPTION 'cms_new_draft_expected_revision_zero'; END IF;
   INSERT INTO public.cms_editor_drafts(section,record_key,document,updated_by)
   VALUES(p_section,p_record_key,p_document,auth.uid()) RETURNING * INTO d;
 END IF;
 RETURN jsonb_build_object('ok',true,'id',d.id,'revision',d.revision,'section',d.section,
 'record_key',d.record_key,'preview_required',true);
END;
$function$
;
