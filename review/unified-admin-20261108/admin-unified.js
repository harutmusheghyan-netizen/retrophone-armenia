
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const client = window.__retroAdminClient;
  if (!client) {
    console.error('RetroPhone unified editor: existing authentication client missing');
    return;
  }

  const panels = {
    catalog: {
      title: 'Каталог телефонов',
      intro: 'Выберите модель. Описания на трёх языках обязательны для публикации. Фото, цены и наличие можно оставить без изменений.',
      warning: 'Каталог использует действующую базу моделей. После публикации проверяйте карточку на сайте отдельно.',
      fields: [
        ['model_name','Название модели','text'],
        ['release_year','Год выпуска / объявления','number'],
        ['description_ru','Описание модели (Русский)','long'],
        ['description_hy','Նկարագրություն (Հայերեն)','long'],
        ['description_en','Description (English)','long'],
        ['image_url','Новая фотография (ссылка Wikimedia Special:FilePath)','url'],
        ['image_source_url','Страница файла на Wikimedia Commons','url'],
        ['image_credit','Автор фотографии','text'],
        ['image_license','Лицензия фотографии','license']
      ]
    },
    brand: {
      title: 'История брендов',
      intro: 'Редактирование истории производителей на русском, армянском и английском языках.',
      warning: 'Публикация обновляет редакционную базу, но отдельные статические страницы истории брендов ещё не подключены к ней.',
      fields: [
        ['history_ru','История бренда (Русский)','long'],
        ['history_hy','Բրենդի պատմություն (Հայերեն)','long'],
        ['history_en','Brand history (English)','long'],
        ['image_url','Фотография или логотип (Wikimedia)','url'],
        ['image_source_url','Страница источника фотографии','url'],
        ['image_credit','Автор фотографии','text'],
        ['image_license','Лицензия фотографии','license']
      ]
    },
    about: {
      title: 'О нас',
      intro: 'Переводы, текст и иллюстрация страницы «О нас». Оформление главной страницы не изменяется.',
      warning: 'Тексты и фото загружены из утверждённой страницы «О нас». Редактирование сохраняется в редакционную базу; изменения появятся на действующем сайте только после безопасного подключения. Исходное фото без выбора нового не заменяется.',
      fields: [
        ['title_ru','Заголовок (Русский)','text'],
        ['title_hy','Վերնագիր (Հայերեն)','text'],
        ['title_en','Title (English)','text'],
        ['body_ru','О нас (Русский)','long'],
        ['body_hy','Մեր մասին (Հայերեն)','long'],
        ['body_en','About us (English)','long'],
        ['image_url','Фото (Wikimedia или лицензированное)','url'],
        ['image_source_url','Источник фотографии','url'],
        ['image_credit','Автор фотографии','text'],
        ['image_license','Лицензия фотографии','license']
      ]
    },
    homepage: {
      title: 'Главная страница — только текст',
      intro: 'Редактируются только разрешённые текстовые блоки. CSS, HTML, расположение элементов и навигация защищены от изменения.',
      warning: 'Исходный текст берётся из утверждённой главной страницы на трёх языках. Публикация сохраняет редакционные данные, но сама статическая страница изменится только после отдельного безопасного подключения.',
      fields: [
        ['text_ru','Текст блока (Русский)','long'],
        ['text_hy','Բլոկի տեքստ (Հայերեն)','long'],
        ['text_en','Block text (English)','long']
      ]
    }
  };
  // Source-accurate About fields: 29 per language, from the pinned homepage.
  const aboutInfo=[
  [
    "eyebrow",
    "Надпись над заголовком",
    "text",
    "intro"
  ],
  [
    "title",
    "Заголовок раздела",
    "text",
    "intro"
  ],
  [
    "lead",
    "Вступительный текст",
    "long",
    "intro"
  ],
  [
    "since",
    "Стаж коллекции",
    "text",
    "intro"
  ],
  [
    "sinceLabel",
    "Подпись к стажу",
    "text",
    "intro"
  ],
  [
    "founderLabel",
    "Подпись над именем основателя",
    "text",
    "founder"
  ],
  [
    "founder",
    "Имя и фамилия основателя",
    "text",
    "founder"
  ],
  [
    "storyTitle",
    "Название истории коллекции",
    "text",
    "founder"
  ],
  [
    "p1",
    "История коллекции — абзац 1",
    "long",
    "founder"
  ],
  [
    "p2",
    "История коллекции — абзац 2",
    "long",
    "founder"
  ],
  [
    "p3",
    "История коллекции — абзац 3",
    "long",
    "founder"
  ],
  [
    "whyTitle",
    "Почему создан сайт — заголовок",
    "text",
    "purpose"
  ],
  [
    "whyText",
    "Почему создан сайт — описание",
    "long",
    "purpose"
  ],
  [
    "brandsTitle",
    "История брендов — заголовок",
    "text",
    "purpose"
  ],
  [
    "brandsText",
    "История брендов — текст",
    "long",
    "purpose"
  ],
  [
    "companyTitle",
    "О компании — заголовок",
    "text",
    "purpose"
  ],
  [
    "companyText",
    "О компании — описание",
    "long",
    "purpose"
  ],
  [
    "socialTitle",
    "Социальные сети — заголовок",
    "text",
    "social"
  ],
  [
    "socialText",
    "Социальные сети — описание",
    "long",
    "social"
  ],
  [
    "socialBtn",
    "Соцсети — текст кнопки",
    "text",
    "social"
  ],
  [
    "bottom",
    "Заключительная строка",
    "long",
    "social"
  ],
  [
    "catalogBtn",
    "Кнопка каталога — подпись",
    "text",
    "social"
  ],
  [
    "historyBtn",
    "Кнопка истории — подпись",
    "text",
    "social"
  ],
  [
    "subtle",
    "Пояснение о наличии телефонов",
    "long",
    "social"
  ],
  [
    "footerSocial",
    "Нижний блок — социальная сеть",
    "text",
    "footer"
  ],
  [
    "footerProject",
    "Нижний блок — описание проекта",
    "text",
    "footer"
  ],
  [
    "footerCatalog",
    "Нижний блок — каталог",
    "text",
    "footer"
  ],
  [
    "footerHistory",
    "Нижний блок — истории брендов",
    "text",
    "footer"
  ],
  [
    "footerSale",
    "Нижний блок — наличие",
    "long",
    "footer"
  ]
];
  const aboutLanguages=[['ru','Русский'],['hy','Հայերեն'],['en','English']];
  const aboutGroups={
    intro:'Заголовок и вступление',founder:'Основатель и история коллекции',
    purpose:'Миссия проекта и бренды',social:'Кнопки, ссылки и заключение',
    footer:'Нижний блок страницы'
  };
  panels.about.fields=[
    ...aboutLanguages.flatMap(([lang,language])=>aboutInfo.map(([key,label,kind])=>
      ['about_'+key+'_'+lang,label+' — '+language,kind])),
    ['image_url','Новая лицензированная фотография','url'],
    ['image_source_url','Источник новой фотографии','url'],
    ['image_credit','Автор новой фотографии','text'],
    ['image_license','Лицензия новой фотографии','license']
  ];
  let cachedAboutBaseline=null;
  async function getOriginalAbout() {
    if(!cachedAboutBaseline){
      const response=await fetch('/about-etalon-data.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Не удалось загрузить сохранённые тексты «О нас» ('+response.status+'). Не редактируйте пустую форму.');
      const data=await response.json();
      const keys=aboutInfo.map(entry=>entry[0]);
      if(data.schema_version!==1 ||
         data.source?.deployment_id!=='dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu' ||
         data.keys?.length!==keys.length ||
         keys.some(key=>!data.keys.includes(key)) ||
         aboutLanguages.some(([lang])=>keys.some(key=>typeof data[lang]?.[key]!=='string'||!data[lang][key].trim()))) {
        throw new Error('Сохранённые тексты «О нас» не прошли проверку полноты. Запись отключена.');
      }
      cachedAboutBaseline=data;
    }
    const doc={};
    for(const [lang] of aboutLanguages) {
      for(const [key] of aboutInfo)
        doc['about_'+key+'_'+lang]=cachedAboutBaseline[lang][key];
    }
    return doc;
  }


  // Read-only baselines recovered from the exact previously published site.
  // Never use a blank CMS table as evidence that historical content is empty.
  let brandHistoryParts={};
  let brandLogoBaseline=null;
  let homepageBaseline=null;
  async function readSourceAsset(filename,label) {
    const r=await fetch('/'+filename,{cache:'no-store'});
    if(!r.ok)throw new Error('Не удалось восстановить исходные данные '+label+' (HTTP '+r.status+'). Редактирование заблокировано.');
    return await r.json();
  }
  async function loadOriginalBrand(item) {
    const part=Number(item.key)<=5?1:2;
    if(!brandHistoryParts[part])
      brandHistoryParts[part]=await readSourceAsset('brand-etalon-part-'+part+'.json','истории бренда');
    const root=brandHistoryParts[part];
    const brand=root?.brands?.[item.key];
    if(root?.schema_version!==1 || String(brand?.id)!==item.key ||
       ['ru','hy','en'].some(lang=>
          typeof brand.languages?.[lang]?.text!=='string' ||
          brand.languages[lang].text.length<800 ||
          !brand.languages[lang].url.startsWith('https://retrophone-armenia-history.vercel.app/')))
      throw new Error('Исходная трёхъязычная история '+item.label+' недоступна. Сохранение заблокировано.');
    if(!brandLogoBaseline)
      brandLogoBaseline=await readSourceAsset('brand-original-logos.json','логотипов брендов');
    const logo=brandLogoBaseline?.logos?.[item.key];
    current.originalMedia=logo?{
      url:logo.logo_url,source:logo.source_page,credit:'Исходный логотип бренда; источник: Wikimedia Commons',
      kind:'logo'
    }:null;
    current.sourceLinks=['ru','hy','en'].map(lang=>({
      label:'Полная история '+lang.toUpperCase(),url:brand.languages[lang].url
    }));
    current.sourceNote='Загружены оригинальные полные истории бренда: русский, армянский и английский.';
    return {
      history_ru:brand.languages.ru.text,
      history_hy:brand.languages.hy.text,
      history_en:brand.languages.en.text
    };
  }
  async function loadOriginalHome(item) {
    if(!homepageBaseline)
      homepageBaseline=await readSourceAsset('homepage-etalon-data.json','главной страницы');
    const root=homepageBaseline;
    const baseline=root?.blocks?.[item.key];
    if(root.schema_version!==1 ||
       root.source?.deployment_id!=='dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu' ||
       !baseline || ['ru','hy','en'].some(lang=>typeof baseline['text_'+lang]!=='string'))
      throw new Error('Исходный текст блока главной не найден. Не сохраняйте пустую форму.');
    const kind=root.mapping?.[item.key];
    current.sourceNote='Изначальный текст: '+(kind?.origin||'эталонный сайт')+
      (kind?.certainty==='navigation_label_only'
        ? '. Внимание: это подпись пункта меню, а не подтверждённый самостоятельный заголовок блока новостей.'
        : '. Дизайн и HTML главной остаются неизменными.');
    current.sourceLinks=[{label:'Проверить действующую главную',url:'https://retrophone-armenia.vercel.app/'}];
    return {...baseline};
  }
  const heroExtraFields=[
    ['subtitle_ru','Подзаголовок главной — Русский','text'],
    ['subtitle_hy','Գլխավոր ենթավերնագիր — Հայերեն','text'],
    ['subtitle_en','Hero subtitle — English','text']
  ];
  function editableFields(){
    return section==='homepage' && current?.key==='hero'
       ? panels.homepage.fields.concat(heroExtraFields)
       : panels[section].fields;
  }

  const blockLabels = [
    {key:'hero',label:'Главный заголовок / приветствие'},
    {key:'about_excerpt',label:'Краткий блок «О нас»'},
    {key:'news_heading',label:'Заголовок блока новостей'},
    {key:'catalog_heading',label:'Заголовок каталога'},
    {key:'footer_note',label:'Подпись в нижней части'}
  ];
  const licenses=['','CC BY 2.0','CC BY 3.0','CC BY 4.0','CC BY-SA 3.0','CC BY-SA 4.0','CC0','Public domain','Owned by RetroPhone Armenia'];

  let section = 'news';
  let brands = null;
  let catalogModels = null;
  let targetList = [];
  let current = null;
  let busy = false;

  function setStatus(message, isError=false) {
    const node=$('cmsStatus');
    node.classList.toggle('hidden', !message);
    node.classList.toggle('bad',isError);
    node.classList.toggle('good',!isError);
    node.textContent=message||'';
  }
  function setBusy(active) {
    busy=active;
    $('cmsSave').disabled=active||!current?.ready;
    $('cmsPreview').disabled=active||!current?.ready;
    $('cmsPublish').disabled=active||!current?.ready||!current.previewed;
    $('cmsPublishFromPreview').disabled=active||!current?.ready||!current.previewed;
  }
  async function checkAdmin() {
    const {data,error}=await client.auth.getUser();
    if(error||!data?.user)throw Error('Войдите в административную панель.');
    const a=await client.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(a.error||!a.data)throw Error('Нет подтверждённых прав администратора.');
    return data.user;
  }
  async function getBrands() {
    if(brands)return brands;
    const r=await client.from('brands').select('id,name,slug,short_history,history_url').order('sort_order',{ascending:true}).limit(50);
    if(r.error)throw r.error;
    brands=r.data||[];
    return brands;
  }
  async function getModels() {
    if(catalogModels)return catalogModels;
    await getBrands();
    const r=await client.from('phone_models')
      .select('id,brand_id,model_name,release_year,description')
      .order('brand_id',{ascending:true}).order('model_name',{ascending:true}).range(0,999);
    if(r.error)throw r.error;
    catalogModels=(r.data||[]).map(m => {
      const brand=brands.find(b=>b.id===m.brand_id);
      return {key:String(m.id),label:(brand?.name||'')+' '+m.model_name,model:m};
    });
    return catalogModels;
  }
  async function buildTargets(nextSection) {
    if(nextSection==='catalog')return await getModels();
    if(nextSection==='brand')return (await getBrands()).map(b=>({
      key:String(b.id),label:b.name,brand:b
    }));
    if(nextSection==='about')return [{key:'main',label:'Страница «О нас»'}];
    if(nextSection==='homepage')return blockLabels;
    return [];
  }
  function renderTargets() {
    const list=$('cmsList');list.replaceChildren();
    const q=$('cmsFilter').value.toLocaleLowerCase().trim();
    const visible=targetList.filter(t=>t.label.toLocaleLowerCase().includes(q));
    for(const item of visible.slice(0,100)) {
      const button=document.createElement('button');
      button.type='button';button.className='cms-entry';
      button.classList.toggle('selected',current?.key===item.key);
      button.textContent=item.label;
      button.addEventListener('click',()=>run(()=>openTarget(item)));
      list.appendChild(button);
    }
    if(!visible.length) {
      const p=document.createElement('p');p.className='muted';
      p.textContent='Ничего не найдено.';list.appendChild(p);
    } else if(visible.length>100) {
      const p=document.createElement('p');p.className='muted';
      p.textContent='Показаны первые 100 моделей. Уточните поиск.';list.appendChild(p);
    }
  }
  function fieldNode(cfg, doc) {
    const [key,label,kind]=cfg;
    const wrap=document.createElement('div');
    if(kind==='long'||kind==='url')wrap.classList.add('wide');
    const lbl=document.createElement('label');
    lbl.textContent=label;lbl.htmlFor='cms_'+key;wrap.appendChild(lbl);
    let input;
    if(kind==='long') {
      input=document.createElement('textarea');
      input.className='large';input.maxLength=12000;
    } else if(kind==='license') {
      input=document.createElement('select');
      for(const name of licenses){
        const opt=document.createElement('option');
        opt.value=name;opt.textContent=name||'Не изменять фото / выбрать лицензию';
        input.appendChild(opt);
      }
    } else {
      input=document.createElement('input');
      input.type=kind;
      if(kind==='number') {
        input.min='1970';input.max='2026';input.step='1';
      }
      input.maxLength=2000;
    }
    input.id='cms_'+key;input.dataset.cmsField=key;
    const value=doc[key];
    if(value!==null && value!==undefined)input.value=String(value);
    input.addEventListener('input',invalidate);
    wrap.appendChild(input);
    if(key==='image_url') {
      const hint=document.createElement('p');hint.className='cms-field-desc';
      hint.textContent='Если оставить пустым, действующая фотография останется без изменений.';
      wrap.appendChild(hint);
    }
    return wrap;
  }
  function showForm(doc) {
    const fieldsRoot=$('cmsFields');
    fieldsRoot.replaceChildren();
    fieldsRoot.classList.toggle('cms-about-fields',section==='about');
    if(section==='about'){
      for(const [lang,language] of aboutLanguages){
        const details=document.createElement('details');
        details.className='cms-about-lang';
        details.open=lang==='ru';
        const summary=document.createElement('summary');
        const total=aboutInfo.filter(([key])=>String(doc['about_'+key+'_'+lang]||'').trim()).length;
        summary.textContent=language+' — заполнено '+total+' из '+aboutInfo.length+' полей';
        details.appendChild(summary);
        for(const [groupName,groupTitle] of Object.entries(aboutGroups)){
          const group=document.createElement('section');
          group.className='cms-about-subsection';
          const heading=document.createElement('h3');
          heading.textContent=groupTitle;
          group.appendChild(heading);
          const grid=document.createElement('div');
          grid.className='cms-fields';
          for(const [key,label,kind,groupCode] of aboutInfo){
            if(groupCode!==groupName)continue;
            grid.appendChild(fieldNode(['about_'+key+'_'+lang,label,kind],doc));
          }
          group.appendChild(grid);
          details.appendChild(group);
        }
        fieldsRoot.appendChild(details);
      }
      const photo=document.createElement('details');
      photo.className='cms-about-lang';
      const photoSummary=document.createElement('summary');
      photoSummary.textContent='Фотография — существующая сохраняется без изменения';
      photo.appendChild(photoSummary);
      const photoInfo=document.createElement('p');
      photoInfo.className='cms-hint';
      photoInfo.textContent='В утверждённой странице уже установлена фотография основателя. Если здесь не указывать новую, исходная фотография остаётся на сайте.';
      photo.appendChild(photoInfo);
      const inheritedPhoto=cachedAboutBaseline?.founder_photo?.data_url;
      if(typeof inheritedPhoto==='string' && inheritedPhoto.length<200000 &&
         /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(inheritedPhoto)){
        const existing=document.createElement('img');
        existing.className='cms-about-original-photo';
        existing.alt='Фото основателя из утверждённой страницы — просмотр, без замены';
        existing.src=inheritedPhoto;
        existing.loading='lazy';
        photo.appendChild(existing);
      }
      const grid=document.createElement('div');grid.className='cms-fields';
      for(const cfg of panels.about.fields.filter(([key])=>key.startsWith('image_')))
        grid.appendChild(fieldNode(cfg,doc));
      photo.appendChild(grid);fieldsRoot.appendChild(photo);
    }else{
      for(const cfg of editableFields())fieldsRoot.appendChild(fieldNode(cfg,doc));
    }
    $('cmsInventoryBox').classList.toggle('hidden',section!=='catalog');
    const hasValues=doc.price_amd!==undefined && doc.stock_quantity!==undefined;
    $('cmsChangeInventory').checked=hasValues;
    $('cmsInventoryFields').classList.toggle('hidden',!hasValues);
    $('cmsPrice').value=hasValues?String(doc.price_amd):'';
    $('cmsStock').value=hasValues?String(doc.stock_quantity):'';
    $('cmsCondition').value=String(doc.condition||'');
    $('cmsProductPublished').checked=doc.is_published===true;
    $('cmsPublish').textContent=section==='catalog'?
      'Опубликовать карточку в базе':
      'Зафиксировать содержимое в базе';
    $('cmsPublishFromPreview').textContent=$('cmsPublish').textContent;
    $('cmsSave').disabled=false;$('cmsPreview').disabled=false;
    $('cmsPublish').disabled=true;
  }
  async function getExistingContent(item) {
    const doc={};
    if(section==='catalog') {
      const id=Number(item.key);
      const [base,trans,products]=await Promise.all([
        client.from('phone_models')
          .select('id,model_name,release_year,description,hero_image_url,image_source_url,image_credit,image_license,specifications,source_url,display_year,year_type')
          .eq('id',id).single(),
        client.from('phone_model_translations')
          .select('language_code,description').eq('phone_model_id',id),
        client.from('products')
          .select('price_amd,stock_quantity,condition,is_published')
          .eq('phone_model_id',id).order('id',{ascending:true}).limit(1)
      ]);
      if(base.error||trans.error||products.error)throw base.error||trans.error||products.error;
      doc.model_name=base.data.model_name;
      doc.release_year=base.data.release_year||'';
      doc.description_ru=base.data.description||'';
      for(const translation of trans.data||[]) {
        if(translation.description?.trim())doc['description_'+translation.language_code]=translation.description;
      }
      current.product=(products.data||[])[0]||null;
      current.previousImage=base.data.hero_image_url||null;
      current.originalMedia=base.data.hero_image_url?{
        url:base.data.hero_image_url,
        source:base.data.image_source_url,
        credit:[base.data.image_credit,base.data.image_license].filter(Boolean).join(' · '),
        kind:'photo'
      }:null;
      current.originalSpecifications=base.data.specifications||null;
      current.sourceLinks=base.data.source_url?[{label:'Источник сведений о модели',url:base.data.source_url}]:[];
      current.sourceNote='Текущие данные каталога: название, год, имеющиеся RU/HY/EN описания. Отсутствующие переводы не заполняются вымышленным текстом.';
      // Media fields stay blank to preserve existing media on normal text edits.
      $('cmsCurrentStock').textContent=current.product?
       'Сейчас в базе: '+(current.product.price_amd??'цена не указана')+
       ' AMD, количество '+current.product.stock_quantity+
       '. Изменение возможно только после включения переключателя.':
       'Цена и наличие для этой модели пока не указаны. Ничего не подставляется автоматически.';
    } else if(section==='brand') {
      Object.assign(doc,await loadOriginalBrand(item));
      const r=await client.from('cms_published_blocks')
        .select('document').eq('section','brand').eq('record_key',item.key).maybeSingle();
      if(r.error)throw r.error;
      Object.assign(doc,r.data?.document||{});
    } else if(section==='about'||section==='homepage') {
      if(section==='about'){
        Object.assign(doc,await getOriginalAbout());
        current.sourceNote='Все ранее утверждённые тексты страницы «О нас» (87 полей на трёх языках).';
      } else Object.assign(doc,await loadOriginalHome(item));
      const r=await client.from('cms_published_blocks').select('document')
        .eq('section',section).eq('record_key',item.key).maybeSingle();
      if(r.error)throw r.error;
      // Published CMS edits always take precedence over the immutable original.
      Object.assign(doc,r.data?.document||{});
    }
    return doc;
  }

  function showExistingSource(){
    const box=$('cmsOriginalBox');
    box.replaceChildren();
    if(!current)return;
    const title=document.createElement('strong');
    title.textContent='Ранее опубликованная информация — только для просмотра';
    box.appendChild(title);
    if(current.originalMedia?.url &&
        /^https:\/\//i.test(current.originalMedia.url)){
      const pic=document.createElement('img');
      pic.className='cms-original-image';
      pic.loading='lazy';
      pic.alt='Существующее изображение сохраняется без изменений';
      pic.src=current.originalMedia.url;
      box.appendChild(pic);
      const credit=document.createElement('p');
      credit.textContent=current.originalMedia.credit||'Изображение с действующего сайта';
      box.appendChild(credit);
      if(current.originalMedia.source &&
          /^https:\/\//i.test(current.originalMedia.source)){
        const a=document.createElement('a');
        a.href=current.originalMedia.source;a.target='_blank';a.rel='noopener noreferrer';
        a.textContent='Проверить источник изображения';
        box.appendChild(a);
      }
    }else if(section==='catalog'){
      const p=document.createElement('p');p.textContent='У модели пока нет главной фотографии. Новое изображение необязательно.';
      box.appendChild(p);
    }
    if(Array.isArray(current.sourceLinks)){
      for(const entry of current.sourceLinks){
        if(!entry?.url || !/^https:\/\//i.test(entry.url))continue;
        const link=document.createElement('a');
        link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';
        link.textContent=entry.label;
        box.appendChild(link);
      }
    }
    if(current.originalSpecifications &&
        Object.keys(current.originalSpecifications).length){
      const details=document.createElement('details');
      const label=document.createElement('summary');
      label.textContent='Сохранённые технические характеристики модели (просмотр)';
      details.appendChild(label);
      const pre=document.createElement('pre');
      pre.className='cms-original-specifications';
      pre.textContent=JSON.stringify(current.originalSpecifications,null,2).slice(0,5000);
      details.appendChild(pre);box.appendChild(details);
    }
    if(section==='catalog'){
      const missing=['ru','hy','en'].filter(lang=>
        !String(document.getElementById('cms_description_'+lang)?.value||'').trim());
      const desc=document.createElement('p');
      desc.textContent=missing.length
       ? 'В базе пока нет перевода: '+missing.map(x=>x.toUpperCase()).join(', ')+'. Это не ошибка отображения; перевод ещё предстоит подготовить.'
       : 'Описание модели на всех трёх языках загружено.';
      box.appendChild(desc);
    }
    box.classList.remove('hidden');
  }

  async function openTarget(item) {
    if(busy)return;
    await checkAdmin();
    current={key:item.key,label:item.label,revision:0,previewed:false,ready:false,product:null,previousImage:null,originalMedia:null,sourceLinks:[],sourceNote:''};
    $('cmsFields').replaceChildren();
    $('cmsSave').disabled=true;
    $('cmsPreview').disabled=true;
    $('cmsPublish').disabled=true;
    $('cmsOriginalBox').replaceChildren();
    $('cmsOriginalBox').classList.add('hidden');
    $('cmsRecordTitle').textContent=item.label;
    $('cmsRecordSubtitle').textContent='Загрузка данных...';
    setStatus('');
    const original=await getExistingContent(item);
    const r=await client.from('cms_editor_drafts')
      .select('id,document,revision,published_revision,updated_at')
      .eq('section',section).eq('record_key',item.key).maybeSingle();
    if(r.error)throw r.error;
    if(r.data) {
      current.id=r.data.id;current.revision=r.data.revision;
      Object.assign(original,r.data.document||{});
    }
    showForm(original);
    current.ready=true;
    showExistingSource();
    $('cmsWarning').textContent=panels[section].warning+(current.sourceNote?' Источник: '+current.sourceNote:'');
    $('cmsRecordSubtitle').textContent=(
      r.data?'Сохранённый черновик':
      section==='about'?'Восстановлено из утверждённой страницы · 3 языка':
      section==='brand'?'Полная утверждённая история · 3 языка':
      section==='homepage'?'Исходные тексты главной · 3 языка':
      'Данные действующей базы'
    )+' · редакция '+(current.revision||'новая');
    renderTargets();
  }
  function collectDocument() {
    const doc={};
    for(const cfg of editableFields()){
      const [key,,kind]=cfg;
      const field=$('cms_'+key);let val=(field.value||'').trim();
      if(!val && ['model_name','release_year','image_url','image_source_url','image_credit','image_license'].includes(key))
        continue;
      if(kind==='number'&&val){
        const year=Number(val);
        if(!Number.isInteger(year)||year<1970||year>2026)
          throw Error('Проверьте год выпуска: 1970–2026.');
      }
      doc[key]=val;
    }
    if(!doc.image_url){
      delete doc.image_source_url;delete doc.image_credit;delete doc.image_license;
    }
    if(section==='about'){
      for(const [lang] of aboutLanguages) {
        for(const [key] of aboutInfo) {
          if(!String(doc['about_'+key+'_'+lang]||'').trim())
            throw new Error('Заполните исходный текст «О нас»: '+key+' ('+lang+').');
        }
        doc['title_'+lang]=doc['about_title_'+lang];
        doc['body_'+lang]=[
          'lead','p1','p2','p3','whyText','brandsText','companyText'
        ].map(key=>doc['about_'+key+'_'+lang]).join('\n\n');
      }
    }
    if(section==='catalog' && $('cmsChangeInventory').checked){
      const price=$('cmsPrice').value.trim();
      const qty=$('cmsStock').value.trim();
      if(!/^\d+(\.\d{1,2})?$/.test(price)||!/^\d+$/.test(qty))
        throw Error('Укажите настоящую цену и неотрицательное целое количество.');
      doc.price_amd=price;
      doc.stock_quantity=qty;
      doc.condition=$('cmsCondition').value.trim();
      doc.is_published=$('cmsProductPublished').checked;
    }
    return doc;
  }
  function invalidate() {
    if(!current)return;
    current.previewed=false;
    $('cmsPublish').disabled=true;
    $('cmsPublishFromPreview').disabled=true;
  }
  async function saveDraft() {
    if(!current?.ready)throw Error('Сначала дождитесь загрузки исходных данных страницы или модели.');
    await checkAdmin();
    const payload=collectDocument();
    const r=await client.rpc('cms_save_admin_draft',{
      p_section:section,p_record_key:current.key,
      p_document:payload,p_expected_revision:current.revision
    });
    if(r.error||!r.data?.ok)throw r.error||Error('Не удалось сохранить черновик.');
    current.id=r.data.id;
    current.revision=r.data.revision;
    current.document=payload;
    current.previewed=false;
    $('cmsPublish').disabled=true;
    $('cmsRecordSubtitle').textContent='Черновик сохранён · редакция '+current.revision;
    setStatus('Черновик сохранён в защищённой редакционной базе. На действующем сайте ничего не изменилось.');
    return current;
  }
  function previewDocument(doc) {
    const root=$('cmsPreviewContent');root.replaceChildren();
    const h=document.createElement('h2');h.textContent=current.label;root.appendChild(h);
    const labels=new Map(editableFields().map(f=>[f[0],f[1]]));
    for(const [key,val] of Object.entries(doc)) {
      const heading=document.createElement('h3');
      heading.textContent=labels.get(key)||key;
      const p=document.createElement('p');
      p.textContent=String(val??'');
      root.append(heading,p);
    }
    if(section==='catalog'){
      const p=document.createElement('p');p.className='cms-hint';
      p.textContent='Если фотография не изменялась, ранее опубликованное фото сохраняется. Цена и наличие меняются только при включённом переключателе.';
      root.appendChild(p);
    }
    if(section!=='catalog'){
      const p=document.createElement('p');p.className='cms-hint';
      p.textContent='Эта страница пока статическая. После подтверждения текст будет в редакционной базе, но на сайте появится только после подключения блока.';
      root.appendChild(p);
    }
    $('cmsModal').classList.remove('hidden');
  }
  async function previewDraft(){
    const data=await saveDraft();
    const r=await client.rpc('cms_preview_admin_draft',{
      p_id:data.id,p_expected_revision:data.revision
    });
    if(r.error||!r.data?.ok)throw r.error||Error('Не удалось открыть предпросмотр.');
    current.previewed=true;
    previewDocument(r.data.document);
    $('cmsPublish').disabled=false;
    $('cmsPublishFromPreview').disabled=false;
    setStatus('Предпросмотр зарегистрирован. Публикация доступна только для этой редакции.');
  }
  async function publishDraft(){
    if(!current?.previewed)throw Error('Сначала проверьте текущую редакцию через «Предпросмотр».');
    const warning=section==='catalog'?
      'Опубликовать изменения карточки в рабочую базу? Изменения могут быть видны в каталоге.':
      'Зафиксировать содержимое в базе? Статическая страница пока не обновится.';
    if(!window.confirm(warning))return;
    await checkAdmin();
    const r=await client.rpc('cms_publish_admin_draft',{
      p_id:current.id,p_expected_revision:current.revision
    });
    if(r.error||!r.data?.ok)throw r.error||Error('Сервер не подтвердил публикацию.');
    $('cmsModal').classList.add('hidden');
    current.previewed=false;
    $('cmsPublish').disabled=true;
    $('cmsPublishFromPreview').disabled=true;
    setStatus(r.data.live_site_verified?
       'Опубликовано и проверено на сайте.':
       'Сохранено в редакционной базе. Статус синхронизации: '+
       r.data.site_sync_status+
       '. Отображение на действующей странице ещё не подтверждено.');
  }
  async function changeSection(next) {
    if(busy)return;
    if(next==='news'){
      section=next;current=null;
      $('newsArea').classList.remove('hidden');
      $('cmsPanel').classList.add('hidden');
    } else {
      await checkAdmin();
      section=next;current=null;
      $('newsArea').classList.add('hidden');
      $('cmsPanel').classList.remove('hidden');
      $('cmsHeading').textContent=panels[next].title;
      $('cmsIntro').textContent=panels[next].intro;
      $('cmsWarning').textContent=panels[next].warning;
      $('cmsRecordTitle').textContent='Выберите запись слева';
      $('cmsRecordSubtitle').textContent='';
      $('cmsFields').replaceChildren();
      $('cmsInventoryBox').classList.add('hidden');
      $('cmsSave').disabled=true;$('cmsPreview').disabled=true;$('cmsPublish').disabled=true;
      $('cmsFilter').value='';
      targetList=await buildTargets(next);
      renderTargets();
      if(targetList.length===1)await openTarget(targetList[0]);
    }
    document.querySelectorAll('[data-cms-tab]').forEach(button=>{
      const active=button.dataset.cmsTab===next;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  function run(fn){
    Promise.resolve().then(fn).catch(error=>{
      console.error('RetroPhone unified admin:',error?.message||error);
      setStatus(error?.message||String(error),true);
    }).finally(()=>setBusy(false));
  }
  for(const button of document.querySelectorAll('[data-cms-tab]')){
    button.addEventListener('click',()=>run(()=>changeSection(button.dataset.cmsTab)));
  }
  $('cmsFilter').addEventListener('input',renderTargets);
  $('cmsChangeInventory').addEventListener('change',()=>{
    $('cmsInventoryFields').classList.toggle('hidden',!$('cmsChangeInventory').checked);
    if($('cmsChangeInventory').checked&&current?.product){
      $('cmsPrice').value=String(current.product.price_amd??'');
      $('cmsStock').value=String(current.product.stock_quantity??'');
      $('cmsCondition').value=current.product.condition||'';
      $('cmsProductPublished').checked=current.product.is_published===true;
    }
    invalidate();
  });
  $('cmsForm').addEventListener('input',invalidate);
  $('cmsSave').addEventListener('click',()=>run(async()=>{setBusy(true);await saveDraft()}));
  $('cmsPreview').addEventListener('click',()=>run(async()=>{setBusy(true);await previewDraft()}));
  $('cmsPublish').addEventListener('click',()=>run(async()=>{setBusy(true);await publishDraft()}));
  $('cmsPublishFromPreview').addEventListener('click',()=>run(async()=>{setBusy(true);await publishDraft()}));
  $('cmsClosePreview').addEventListener('click',()=>$('cmsModal').classList.add('hidden'));
})();
