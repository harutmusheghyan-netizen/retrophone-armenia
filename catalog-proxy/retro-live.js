// Silent, content-only refresh. Does not change CSS, layout or navigation.
(function(){
 "use strict";
 if(typeof fetch!=="function"||!document||!location)return;
 const scope=location.pathname.startsWith("/news")?"news":"catalog";
 let previous=null, pending=false, inFlight=false;
 function editing(){
  const a=document.activeElement;
  return !!(a&&(a.matches("input, textarea, select")||a.isContentEditable));
 }
 function refreshIfSafe(){
  if(pending&&!document.hidden&&!editing())location.reload();
 }
 async function check(){
  if(inFlight||document.hidden)return;
  inFlight=true;
  try{
   const r=await fetch("/api/content-revision",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)return;
   const data=await r.json(),version=data&&data[scope];
   if(!Number.isSafeInteger(version))return;
   if(previous===null){previous=version;return;}
   if(previous!==version){previous=version;pending=true;}
   refreshIfSafe();
  }catch(e){}finally{inFlight=false;}
 }
 document.addEventListener("visibilitychange",function(){if(!document.hidden){refreshIfSafe();check();}});
 document.addEventListener("focusout",function(){if(pending)setTimeout(refreshIfSafe,500);});
 setInterval(check,30000);
 check();
})();
