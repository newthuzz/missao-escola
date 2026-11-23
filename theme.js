/* Runs before the app: theme switching must not depend on study/account scripts. */
(function () {
  'use strict';
  var key='missao-escola-theme',root=document.documentElement;
  function valid(value){return value==='light'||value==='dark';}
  function read(){
    var local=null,tab=null,fallback=false;
    try{local=localStorage.getItem(key);}catch(e){}
    try{tab=sessionStorage.getItem(key);fallback=sessionStorage.getItem(key+'-fallback')==='1';}catch(e){}
    if(fallback&&valid(tab))return tab;
    return valid(local)?local:valid(tab)?tab:null;
  }
  function remember(value){
    var persisted=false;
    try{localStorage.setItem(key,value);persisted=true;}catch(e){}
    try{sessionStorage.setItem(key,value);sessionStorage.setItem(key+'-fallback',persisted?'0':'1');}catch(e){}
  }
  var current=read()||'light';
  function apply(value){
    current=valid(value)?value:'light';
    root.setAttribute('data-theme',current);
    // "only" opts out of automatic darkening where the browser supports it.
    // Keep CSS and metadata consistent for controls, scrollbars and page UI.
    root.style.colorScheme=current;
    if(window.CSS&&typeof CSS.supports==='function'&&CSS.supports('color-scheme','only '+current))root.style.colorScheme='only '+current;
    var meta=document.querySelector('meta[name="color-scheme"]');
    if(meta)meta.setAttribute('content','only '+current);
    meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',current==='light'?'#ffffff':'#101b30');
    var toggle=document.getElementById('theme-toggle');
    if(toggle){
      var next=current==='light'?'escuro':'claro';
      toggle.setAttribute('type','button');
      toggle.setAttribute('aria-pressed',String(current==='dark'));
      toggle.setAttribute('aria-label','Ativar modo '+next);
      var icon=current==='light'
        ?'<path d="M20.9 13.4A9 9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z"/>'
        :'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
      toggle.innerHTML='<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+icon+'</svg><span class="theme-toggle-label">Modo '+next+'</span>';
    }
  }
  apply(current);
  document.addEventListener('DOMContentLoaded',function(){apply(current);});
  document.addEventListener('click',function(event){
    var target=event.target;
    while(target&&target!==document){
      if(target.id==='theme-toggle'){
        event.preventDefault();apply(current==='light'?'dark':'light');remember(current);return;
      }
      target=target.parentNode;
    }
  });
  window.addEventListener('storage',function(event){
    if(event.key===key||event.key===null){
      var value=event.key===null?'light':event.newValue;
      if(valid(value)||value===null){current=valid(value)?value:'light';try{sessionStorage.setItem(key,current);sessionStorage.setItem(key+'-fallback','0');}catch(e){}apply(current);}
    }
  });
  window.addEventListener('pageshow',function(){apply(read()||current);});
})();
