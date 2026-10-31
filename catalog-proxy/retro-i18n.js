document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('#rp-languages button[data-lang]');if(!b||!document.documentElement.hasAttribute('data-rp-verified'))return;const l=b.dataset.lang;if(!['ru','hy','en'].includes(l))return;e.preventDefault();e.stopImmediatePropagation();const u=new URL(location.href);u.searchParams.set('lang',l);location.assign(u.toString())},true);
(function(){
"use strict";
const ru="ru", codes=["ru","hy","en"];
const dict={
en:{
"Главная":"Home","Каталог":"Catalog","Каталог моделей":"Model catalog","Каталог телефонов":"Phone catalog","Каталог ретро-телефонов":"Retro phone catalog","История":"History","История брендов":"Brand history","История производителей телефонов":"History of phone manufacturers","Каталог телефонов":"Phone catalog","Продажа":"For sale","О сайте":"About us",
"Все модели по брендам — алфавитный справочник":"All models by brand — alphabetical directory","Компании и бренды":"Companies and brands","Как читать историю бренда":"How to read a brand history","Алфавитный справочник":"Alphabetical directory",
"Все модели":"All models","В справочнике":"In the directory","Подробнее об истории производителя":"Read the brand history","Ретро-телефоны":"Retro phones","Наличие в продаже уточняется отдельно.":"Availability is confirmed separately.","в справочнике. Наличие в продаже уточняется отдельно.":"in the directory. Availability is confirmed separately.","моделей":"models","модель":"model","модели":"models",
"Сведения о модели":"Model overview","История модели":"Model history","Технические характеристики":"Technical specifications","Источники":"Sources","Источники и дополнительное чтение":"Sources and further reading","Поиск":"Search","Поиск телефонов":"Find phones","Найти":"Find","Найти телефон":"Find a phone","Найти телефон среди":"Find a phone among",
"Поделиться телефоном":"Share this phone","Копировать ссылку":"Copy link","Поделиться":"Share","Ссылка скопирована":"Link copied","Сбросить":"Reset","Показать ещё":"Show more","Уточнить выбор":"Refine selection","Все бренды":"All brands","Год выпуска":"Release year","Год":"Year","Производитель":"Manufacturer","Страна":"Country","Описание":"Description","Размеры":"Dimensions","Вес":"Weight","Камера":"Camera","Дисплей":"Display","Экран":"Screen","Память":"Memory","Батарея":"Battery","Аккумулятор":"Battery","Сеть":"Network","Выпущен":"Released","Выбрать бренд":"Choose brand","Все годы":"All years","Любое наличие":"Any availability","Есть в наличии":"In stock","Нет в наличии":"Out of stock","В наличии":"In stock","Под заказ":"By request","Наличие":"Availability","Все фото":"All photos","С фотографией":"With photo","Без фотографии":"Without photo",
"1. Основание и первые годы":"1. Founding and early years","2. Развитие мобильных телефонов":"2. Development of mobile phones","3. Конкуренция и причины перемен":"3. Competition and reasons for change","4. Закрытие, продажа или банкротство?":"4. Closure, sale or bankruptcy?","5. Хронология ключевых событий":"5. Timeline of key events","6. Знаковые телефоны бренда":"6. Iconic phones of the brand","7. Почему это важно коллекционерам":"7. Why collectors value this brand",
"История Nokia":"Nokia history","История Sony":"Sony history","История Motorola":"Motorola history","История Samsung":"Samsung history",
"Вернуться к каталогу":"Back to catalog","Вернуться к списку брендов":"Back to brands","Назад":"Back","Узнать больше":"Learn more","Подробнее":"Read more",
"Галерея":"Gallery","Характеристики":"Specifications","Выберите язык":"Choose language","Оригинал на русском":"Original in Russian","Связаться":"Contact","Коллекция легендарных телефонов":"Collection of legendary phones"
},
hy:{
"Главная":"Գլխավոր","Каталог":"Կատալոգ","Каталог моделей":"Մոդելների կատալոգ","Каталог телефонов":"Հեռախոսների կատալոգ","Каталог ретро-телефонов":"Ռետրո հեռախոսների կատալոգ","История":"Պատմություն","История брендов":"Ապրանքանիշերի պատմություն","История производителей телефонов":"Հեռախոս արտադրողների պատմություն","Продажа":"Վաճառք","О сайте":"Մեր մասին",
"Все модели по брендам — алфавитный справочник":"Բոլոր մոդելները՝ ըստ ապրանքանիշերի, այբբենական ցանկով","Компании и бренды":"Ընկերություններ և ապրանքանիշեր","Как читать историю бренда":"Ինչպես ուսումնասիրել ապրանքանիշի պատմությունը","Алфавитный справочник":"Այբբենական տեղեկատու",
"Все модели":"Բոլոր մոդելները","В справочнике":"Տեղեկատուում","Подробнее об истории производителя":"Կարդալ արտադրողի պատմությունը","Ретро-телефоны":"Ռետրո հեռախոսներ","Наличие в продаже уточняется отдельно.":"Վաճառքի առկայությունը ճշտվում է առանձին։","в справочнике. Наличие в продаже уточняется отдельно.":"տեղեկատուում։ Վաճառքի առկայությունը ճշտվում է առանձին։","моделей":"մոդել","модель":"մոդել","модели":"մոդել",
"Сведения о модели":"Մոդելի մասին","История модели":"Մոդելի պատմություն","Технические характеристики":"Տեխնիկական բնութագրեր","Источники":"Աղբյուրներ","Источники и дополнительное чтение":"Աղբյուրներ և լրացուցիչ ընթերցանություն","Поиск":"Որոնում","Поиск телефонов":"Հեռախոսների որոնում","Найти":"Գտնել","Найти телефон":"Գտնել հեռախոս","Найти телефон среди":"Գտնել հեռախոս՝",
"Поделиться телефоном":"Կիսվել հեռախոսով","Копировать ссылку":"Պատճենել հղումը","Поделиться":"Կիսվել","Ссылка скопирована":"Հղումը պատճենված է","Сбросить":"Մաքրել","Показать ещё":"Ցույց տալ ավելին","Уточнить выбор":"Հստակեցնել ընտրությունը","Все бренды":"Բոլոր ապրանքանիշերը","Год выпуска":"Թողարկման տարեթիվ","Год":"Տարի","Производитель":"Արտադրող","Страна":"Երկիր","Описание":"Նկարագրություն","Размеры":"Չափեր","Вес":"Քաշ","Камера":"Տեսախցիկ","Дисплей":"Էկրան","Экран":"Էկրան","Память":"Հիշողություն","Батарея":"Մարտկոց","Аккумулятор":"Մարտկոց","Сеть":"Ցանց","Выпущен":"Թողարկվել է","Выбрать бренд":"Ընտրել ապրանքանիշ","Все годы":"Բոլոր տարիները","Любое наличие":"Ցանկացած առկայություն","Есть в наличии":"Առկա է","Нет в наличии":"Առկա չէ","В наличии":"Առկա է","Под заказ":"Պատվերով","Наличие":"Առկայություն","Все фото":"Բոլոր լուսանկարները","С фотографией":"Լուսանկարով","Без фотографии":"Առանց լուսանկարի",
"1. Основание и первые годы":"1. Հիմնադրումը և առաջին տարիները","2. Развитие мобильных телефонов":"2. Բջջային հեռախոսների զարգացումը","3. Конкуренция и причины перемен":"3. Մրցակցությունը և փոփոխությունների պատճառները","4. Закрытие, продажа или банкротство?":"4. Փակում, վաճառք, թե՞ սնանկացում","5. Хронология ключевых событий":"5. Հիմնական իրադարձությունների ժամանակագրությունը","6. Знаковые телефоны бренда":"6. Ապրանքանիշի հայտնի հեռախոսները","7. Почему это важно коллекционерам":"7. Ինչու է սա կարևոր հավաքորդների համար",
"История Nokia":"Nokia-ի պատմությունը","История Sony":"Sony-ի պատմությունը","История Motorola":"Motorola-ի պատմությունը","История Samsung":"Samsung-ի պատմությունը",
"Вернуться к каталогу":"Վերադառնալ կատալոգ","Вернуться к списку брендов":"Վերադառնալ ապրանքանիշերին","Назад":"Հետ","Узнать больше":"Իմանալ ավելին","Подробнее":"Ավելին",
"Галерея":"Պատկերասրահ","Характеристики":"Բնութագրեր","Выберите язык":"Ընտրեք լեզուն","Оригинал на русском":"Բնօրինակը ռուսերեն է","Связаться":"Կապ","Коллекция легендарных телефонов":"Լեգենդար հեռախոսների հավաքածու"
}};
const storageKey="retrophoneLang";
function getSaved(){
 const p=new URLSearchParams(location.search).get("lang");
 if(codes.includes(p))return p;
 try{const s=sessionStorage.getItem(storageKey)||localStorage.getItem(storageKey);if(codes.includes(s))return s;}catch(e){}
 return ru;
}
let current=getSaved();
const tracked=new WeakMap();
let locked=false, scheduled=false;
function translate(base,language) {
 if(language==="ru") return base;
 const space=base.match(/^(\s*)([\s\S]*?)(\s*)$/);
 if(!space)return base;
 const a=space[1],core=space[2],b=space[3];
 const d=dict[language]||{};
 if(Object.prototype.hasOwnProperty.call(d,core))return a+d[core]+b;
 let v=core;
 v=v.replace(/^Ретро-телефоны\s+(.+)$/,(all,brand)=> language==="hy" ? "Ռետրո հեռախոսներ՝ "+brand : "Retro phones: "+brand);
 v=v.replace(/^История\s+(.+)$/,(all,brand)=>language==="hy" ? brand+"-ի պատմությունը" : brand+" history");
 v=v.replace(/^Другие модели\s+(.+)$/,(all,brand)=>language==="hy" ? brand+"-ի այլ մոդելներ" : "Other "+brand+" models");
 v=v.replace(/^Найти телефон среди\s+(\d+)\s+моделей$/,(all,n)=>language==="hy" ? "Գտնել հեռախոս՝ "+n+" մոդելների մեջ" : "Find a phone among "+n+" models");
 v=v.replace(/^(\d+)\s+модел(?:ей|и|ь)$/,(all,n)=>language==="hy"?n+" մոդել":n+" models");
 v=v.replace(/^Все модели\s+(.+)$/,(all,brand)=>language==="hy" ? brand+"-ի բոլոր մոդելները" : "All "+brand+" models");
 if(v===core && core.length<85){
  const long=Object.keys(d).sort((x,y)=>y.length-x.length);
  for(const key of long){if(key.length>9 && v.includes(key)){v=v.split(key).join(d[key]);}}
 }
 return a+v+b;
}
function translateNode(node){
 const parent=node.parentElement;
 if(!parent||["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","CODE","PRE"].includes(parent.tagName)||parent.closest("#rp-languages"))return;
 const value=node.nodeValue||"";
 if(!value.trim())return;
 let rec=tracked.get(node);
 if(!rec || rec.last!==value)rec={base:value,last:value};
 const desired=translate(rec.base,current);
 if(value!==desired){node.nodeValue=desired;}
 rec.last=desired;tracked.set(node,rec);
}
function attrs(){
 document.documentElement.lang=current==="hy"?"hy":current;
 document.documentElement.setAttribute("data-retro-lang",current);
 document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
  const x=el.getAttribute("data-retro-original-placeholder")||el.getAttribute("placeholder");
  el.setAttribute("data-retro-original-placeholder",x);
  el.setAttribute("placeholder",translate(x,current));
 });
 document.querySelectorAll("[title]").forEach(el=>{if(el.closest("#rp-languages"))return;let x=el.getAttribute("data-retro-original-title")||el.title;el.setAttribute("data-retro-original-title",x);el.title=translate(x,current);});
 document.querySelectorAll("#rp-languages button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.lang===current?"true":"false"));
 document.querySelectorAll("a[href]").forEach(a=>{
   const raw=a.getAttribute("href");if(!raw||raw.startsWith("#")||raw.startsWith("mailto:")||raw.startsWith("tel:")||raw.startsWith("javascript:"))return;
   try{
     const url=new URL(raw,location.href);
     if(url.hostname.endsWith("retrophone-armenia.vercel.app") || /^retrophone-armenia(-catalog|-history|-orders|-explore|-photos-demo)?(\.vercel\.app)$/.test(url.hostname)){
      url.searchParams.set("lang",current);
      a.href=url.toString();
     }else if(url.origin===location.origin){url.searchParams.set("lang",current);a.href=url.toString();}
   }catch(e){}
 });
}
function render(){
 if(locked)return;locked=true;
 try{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n;while((n=walker.nextNode()))translateNode(n);
  attrs();
 }finally{locked=false;}
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;render();},60);}
function choose(lang){
 if(!codes.includes(lang))return;current=lang;
 try{sessionStorage.setItem(storageKey,lang);localStorage.setItem(storageKey,lang);}catch(e){}
 const url=new URL(location.href);url.searchParams.set("lang",lang);history.replaceState(history.state,"",url.pathname+url.search+url.hash);
 render();
}
function init(){
 if(document.getElementById("rp-languages"))return;
 const root=document.createElement("div");root.id="rp-languages";root.setAttribute("role","group");root.setAttribute("aria-label","Language / Язык / Լեզու");
 root.innerHTML='<button data-lang="ru" title="Русский" type="button">RU</button><button data-lang="hy" title="Հայերեն" type="button">HY</button><button data-lang="en" title="English" type="button">EN</button>';
 root.addEventListener("click",e=>{const btn=e.target.closest("button[data-lang]");if(btn)choose(btn.dataset.lang);});
 const css=document.createElement("style");css.textContent='#rp-languages{position:fixed;top:12px;right:12px;z-index:2147483000;display:flex;gap:3px;padding:4px;background:rgba(2,9,18,.94);border:1px solid #cda962;border-radius:24px;box-shadow:0 5px 18px #0005}#rp-languages button{font:700 12px/1 system-ui,Arial,sans-serif;background:transparent;color:#f7dfaf;border:0;padding:9px 10px;cursor:pointer;border-radius:20px}#rp-languages button[aria-pressed=true]{background:#e7c077;color:#121820}#rp-languages button:focus-visible{outline:2px solid #fff;outline-offset:2px}@media(max-width:650px){#rp-languages{top:auto;bottom:12px;right:12px}#rp-languages button{padding:11px 12px}}';
 document.head.appendChild(css);document.body.appendChild(root);
 const p=new URLSearchParams(location.search).get("lang");
 if(!p){const url=new URL(location.href);url.searchParams.set("lang",current);history.replaceState(history.state,"",url.pathname+url.search+url.hash);}
 render();
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

/* RetroPhone Researcher: signed-off editorials and independently licensed images
   integrate into the EXISTING 870-model catalog, not a separate website. */
(function(){
 'use strict';
 const params=new URLSearchParams(location.search);
 let brand=params.get('brand')||'',model=params.get('model')||'';
 if(!brand||!model){
  const path=location.pathname.match(/^\/phones\/([^/]+)\/([^/]+)\/?$/i);
  if(path){
    brand=decodeURIComponent(path[1]).replace(/-/g,' ');
    const heading=document.querySelector('main h1')?.textContent.trim()||'';
    model=heading.toLowerCase().startsWith(brand.toLowerCase()+' ')
      ?heading.slice(brand.length).trim()
      :decodeURIComponent(path[2]).replace(/-/g,' ');
  }
 }
 if(!brand||!model)return;
 const api='https://aikxbgixitaaatkmcols.supabase.co/rest/v1/';
 const publicKey='sb_publishable_PvxphKmdiZKPMGD0BbPBuw_nS2cKRJt';
 const headers={apikey:publicKey,Accept:'application/json'};
 const get=async(table,select)=>{
  const u=new URL(api+table);
  u.searchParams.set('select',select);
  u.searchParams.set('brand','ilike.'+brand);
  u.searchParams.set('model_name','ilike.'+model);
  u.searchParams.set('limit','1');
  const r=await fetch(u,{headers,cache:'no-store'});
  if(!r.ok)throw Error('source '+table+' HTTP '+r.status);
  const items=await r.json();return Array.isArray(items)?items[0]||null:null;
 };
 const approvedFields='brand,model_name,announced_year,release_year,description_ru,description_hy,description_en,photo_url,photo_credit,photo_license,verified_sources,published_at';
 const photoFields='brand,model_name,file_page_url,image_url,author,license,verified_at';
 const safeURL=s=>{try{const u=new URL(String(s));return u.protocol==='https:'?u.href:null}catch(e){return null}};
 const labels={
  ru:{archive:'Архивная техническая справка',archiveSource:'Открыть архивный источник',heading:'Проверенная история модели',media:'Фотография модели',photo:'Автор и лицензия',sources:'Исторические источники',date:'Проверенный год выпуска',stock:'Наличие телефона в продаже уточняется отдельно.',caption:'Фотография из лицензированного архива Wikimedia Commons'},
  hy:{archive:'Արխիվային տեխնիկական ամփոփում',archiveSource:'Բացել արխիվային աղբյուրը',heading:'Մոդելի ստուգված պատմությունը',media:'Մոդելի լուսանկարը',photo:'Հեղինակ և արտոնագիր',sources:'Պատմական աղբյուրներ',date:'Հաստատված թողարկման տարեթիվ',stock:'Վաճառքում առկայությունը ստուգվում է առանձին։',caption:'Լուսանկար Wikimedia Commons-ի ազատ արտոնագրով արխիվից'},
  en:{archive:'Archival technical summary',archiveSource:'Open archive source',heading:'Verified model history',media:'Model photograph',photo:'Credit and license',sources:'Historical sources',date:'Verified release year',stock:'Stock availability is checked separately.',caption:'Photo from the Wikimedia Commons freely licensed archive'}
 };
 const create=(tag,content,className)=>{
   const node=document.createElement(tag);
   if(className)node.className=className;
   if(content!==undefined)node.textContent=String(content);
   return node;
 };
 let editorial=null,media=null,archival=null,finished=false,scheduled=false;
 const css=document.createElement('style');
 css.id='rp-agent-integrated-style';
 css.textContent='.rp-agent-enrichment{margin:24px 0;padding:22px;border:1px solid #b99a65a8;border-radius:12px;background:linear-gradient(120deg,#172331,#0b1721);color:#f6ede1;line-height:1.7}.rp-agent-enrichment h2{color:#edc486;margin:0 0 12px;font:normal clamp(22px,2.6vw,30px) Georgia,serif}.rp-agent-enrichment p{white-space:pre-line}.rp-agent-media img{display:block;max-width:100%;width:auto;max-height:320px;object-fit:contain;border-radius:8px;background:#050b11}.rp-agent-media small{display:block;color:#cebfa9;font-size:12px;margin:8px 0}.rp-agent-media a,.rp-agent-enrichment a{color:#f0c784}.rp-agent-enrichment ul{padding-left:20px}.rp-agent-enrichment li{margin:6px 0}.rp-agent-enrichment .rp-agent-hint{font-size:13px;color:#ccb999;margin-top:15px}@media(max-width:600px){.rp-agent-enrichment{padding:15px}}';
 document.head.appendChild(css);
 function getLanguage(){const l=document.documentElement.getAttribute('data-retro-lang')||new URLSearchParams(location.search).get('lang')||'ru';return labels[l]?l:'ru'}
 function paint(){
  if(!finished)return;
  const root=document.querySelector('#app .rp-detail')||document.querySelector('main');
  if(!root)return;
  let box=root.querySelector('#rp-agent-enrichment');
  if(!editorial&&!media&&!archival){if(box)box.remove();return}
  if(!box){box=create('section',undefined,'rp-agent-enrichment');box.id='rp-agent-enrichment';root.appendChild(box)}
  box.replaceChildren();
  const l=getLanguage(),w=labels[l];
  const photoUrl=safeURL(editorial?.photo_url||media?.image_url);
  const gallery=document.querySelector('#app .rp-gallery #rp-photo');
  if(photoUrl&&gallery&&!gallery.querySelector('img[src]')){
    const img=create('img');img.src=photoUrl;img.alt=brand+' '+model;img.loading='lazy';
    gallery.replaceChildren(img);
    const caption=create('small',(editorial?.photo_credit||media?.author||'')+' · '+(editorial?.photo_license||media?.license||''));
    caption.style.cssText='display:block;color:#efcf9e;font-size:12px;padding:5px 0';
    gallery.append(caption);
  }
  if(photoUrl&&!gallery){
   const figure=create('figure',undefined,'rp-agent-media');figure.style.margin='0 0 15px';
   figure.append(create('h2',w.media));
   const img=create('img');img.src=photoUrl;img.loading='lazy';img.alt=brand+' '+model;figure.append(img);
   const credit=editorial?.photo_credit||media?.author||'';
   const license=editorial?.photo_license||media?.license||'';
   figure.append(create('small',w.photo+': '+credit+' · '+license));
   const fileFromEditorial=editorial?.photo_url?.match(/Special:FilePath\/([^?]+)/);
   const editorialCommonsFile=fileFromEditorial?'https://commons.wikimedia.org/wiki/File:'+fileFromEditorial[1]:null;
   const fileUrl=safeURL(media?.file_page_url||editorialCommonsFile);
   if(fileUrl&&new URL(fileUrl).hostname==='commons.wikimedia.org'){
     const a=create('a',w.caption);a.href=fileUrl;a.target='_blank';a.rel='noopener noreferrer';figure.append(a);
   }
   box.append(figure);
  }
  if(editorial){
   box.append(create('h2',w.heading));
   if(editorial.release_year)box.append(create('p',w.date+': '+editorial.release_year));
   box.append(create('p',editorial['description_'+l]||editorial.description_ru||''));
   const evidence=Array.isArray(editorial.verified_sources)?editorial.verified_sources:[];
   if(evidence.length){
     const details=create('details'),summary=create('summary',w.sources),ul=create('ul');
     for(const item of evidence.slice(0,12)){
       const url=safeURL(item.url);if(!url)continue;
       const li=create('li'),a=create('a',item.title||item.kind||url);
       a.href=url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);ul.append(li);
     }
     details.append(summary,ul);box.append(details);
   }
  }
  if(!editorial&&archival){
   box.append(create('h2',w.archive));
   box.append(create('p',archival['summary_'+l]||archival.summary_ru||''));
   const url=safeURL(archival.source_url);
   if(url){const a=create('a',w.archiveSource);a.href=url;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  }
  box.append(create('p',w.stock,'rp-agent-hint'));
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;paint()},85)}
 document.documentElement.addEventListener('click',evt=>{if(evt.target.closest('#rp-languages button[data-lang]'))setTimeout(paint,125)},true);
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-retro-lang']});
 const load=async()=>{try{if(document.documentElement.hasAttribute('data-rp-verified'))return;
   [editorial,media,archival]=await Promise.all([
    get('agent_published_model_editorials',approvedFields),
    get('agent_catalog_verified_media',photoFields),
    Promise.resolve(null)
   ]);
   finished=true;paint();
 }catch(e){/* Leave original catalog unmodified if the enrichment source is unavailable. */}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
