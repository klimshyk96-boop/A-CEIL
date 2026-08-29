/* A·CEIL.i18n — модуль мультимовності (gettext-style: ключ = український рядок) */
(function(){
"use strict";
if(window.A·CEIL&&window.A·CEIL.i18n)return;
var STORAGE_KEY="A·CEIL_language";
var SUPPORTED=["uk","en","pl"];
var dicts={};
var listeners=[];
var observer=null;
var current="uk";
try{var saved=localStorage.getItem(STORAGE_KEY);if(saved&&SUPPORTED.indexOf(saved)>-1)current=saved;}catch(e){window.__diagSilent&&window.__diagSilent(e)}

function norm(s){return String(s).replace(/\s+/g," ").trim();}

/* Переклад одного рядка: точний збіг → патерни → без змін */
function translateString(s,lang){
  lang=lang||current;
  if(lang==="uk"||typeof s!=="string")return s;
  var d=dicts[lang];
  if(!d)return s;
  var key=norm(s);
  if(!key)return s;
  var out=null;
  if(Object.prototype.hasOwnProperty.call(d.strings,key))out=d.strings[key];
  if(out==null&&d.patterns.length){
    for(var i=0;i<d.patterns.length;i++){
      var p=d.patterns[i];
      p[0].lastIndex=0;
      if(p[0].test(key)){p[0].lastIndex=0;out=key.replace(p[0],p[1]);break;}
    }
  }
  if(out==null)return s;
  var lead=/^\s*/.exec(s)[0],tail=/\s*$/.exec(s)[0];
  return lead+out+tail;
}

function t(key){return translateString(key,current);}

/* ---- DOM переклад ---- */
var ATTRS=["placeholder","title","aria-label","alt","data-label"];

function translateTextNode(n){
  var v=n.nodeValue;
  if(n.__rmSrc==null){
    if(!v||!norm(v))return;
    n.__rmSrc=v;
  }else if(n.__rmApplied!=null&&v!==n.__rmApplied&&v!==n.__rmSrc){
    /* текст змінено кодом застосунку — приймаємо новий оригінал */
    n.__rmSrc=v;
  }
  var out=current==="uk"?n.__rmSrc:translateString(n.__rmSrc,current);
  if(v!==out)n.nodeValue=out;
  n.__rmApplied=out;
}

function translateElement(el){
  var i,a,src;
  if(!el.__rmAttrSrc)el.__rmAttrSrc={};
  for(i=0;i<ATTRS.length;i++){
    a=ATTRS[i];
    if(!el.hasAttribute(a))continue;
    var cur=el.getAttribute(a);
    if(el.__rmAttrSrc[a]==null){
      if(!norm(cur))continue;
      el.__rmAttrSrc[a]=cur;
    }else if(el.__rmAttrApplied&&el.__rmAttrApplied[a]!=null&&cur!==el.__rmAttrApplied[a]&&cur!==el.__rmAttrSrc[a]){
      el.__rmAttrSrc[a]=cur;
    }
    src=el.__rmAttrSrc[a];
    var out=current==="uk"?src:translateString(src,current);
    if(cur!==out)el.setAttribute(a,out);
    if(!el.__rmAttrApplied)el.__rmAttrApplied={};
    el.__rmAttrApplied[a]=out;
  }
  /* input type=button/submit value */
  if(el.tagName==="INPUT"&&(el.type==="button"||el.type==="submit")&&el.value){
    if(el.__rmValSrc==null)el.__rmValSrc=el.value;
    var ov=current==="uk"?el.__rmValSrc:translateString(el.__rmValSrc,current);
    if(el.value!==ov)el.value=ov;
  }
  /* явні data-i18n ключі (пріоритет над текстовим вузлом) */
  if(el.hasAttribute("data-i18n")){
    var k=el.getAttribute("data-i18n");
    var tv=current==="uk"?k:translateString(k,current);
    if(el.textContent!==tv)el.textContent=tv;
  }
  if(el.hasAttribute("data-i18n-placeholder"))el.setAttribute("placeholder",t(el.getAttribute("data-i18n-placeholder")));
  if(el.hasAttribute("data-i18n-title"))el.setAttribute("title",t(el.getAttribute("data-i18n-title")));
}

function translateTree(root){
  if(!root)return;
  try{
    if(root.nodeType===3){translateTextNode(root);}
    else if(root.nodeType===1||root.nodeType===9||root.nodeType===11){
      if(root.nodeType===1){
        var tg=root.tagName;
        if(tg==="SCRIPT"||tg==="STYLE"||tg==="NOSCRIPT")return;
        translateElement(root);
      }
      var w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:function(n){
        if(n.nodeType===1){
          var g=n.tagName;
          if(g==="SCRIPT"||g==="STYLE"||g==="NOSCRIPT")return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }});
      var n;
      while((n=w.nextNode())){
        if(n.nodeType===1)translateElement(n);
        else translateTextNode(n);
      }
    }
  }finally{
    if(observer)observer.takeRecords(); /* відкинути власні мутації */
  }
}

function translatePage(root){translateTree(root||document.body||document.documentElement);}

/* ---- MutationObserver для динамічного контенту (toast, меню, модалки) ---- */
var pending=[],scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  setTimeout(function(){
    scheduled=false;
    var items=pending;pending=[];
    for(var i=0;i<items.length;i++)translateTree(items[i]);
  },0);
}
function startObserver(){
  if(observer||!window.MutationObserver||!document.body)return;
  observer=new MutationObserver(function(muts){
    if(current==="uk")return;
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==="childList"){
        for(var j=0;j<m.addedNodes.length;j++)pending.push(m.addedNodes[j]);
      }else if(m.type==="characterData"){
        pending.push(m.target);
      }
    }
    if(pending.length)schedule();
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}

/* ---- Патч canvas: переклад текстів у звітах без зміни коду звітів ---- */
(function(){
  if(!window.CanvasRenderingContext2D)return;
  var proto=CanvasRenderingContext2D.prototype;
  ["fillText","strokeText"].forEach(function(m){
    var orig=proto[m];
    if(typeof orig!=="function")return;
    proto[m]=function(){
      if(current!=="uk"&&typeof arguments[0]==="string")arguments[0]=translateString(arguments[0],current);
      return orig.apply(this,arguments);
    };
  });
  var om=proto.measureText;
  if(typeof om==="function"){
    proto.measureText=function(text){
      if(current!=="uk"&&typeof text==="string")text=translateString(text,current);
      return om.call(this,text);
    };
  }
})();

/* ---- Обгортки системних діалогів ---- */
(function(){
  ["alert","confirm","prompt"].forEach(function(m){
    var orig=window[m];
    if(typeof orig!=="function")return;
    window[m]=function(msg,def){
      if(typeof msg==="string")msg=translateString(msg,current);
      if(m==="prompt")return orig.call(window,msg,typeof def==="string"?translateString(def,current):def);
      return orig.call(window,msg);
    };
  });
})();

/* ---- API ---- */
function register(lang,dict){
  dict=dict||{};
  var strings=dict.strings||{};
  var patterns=[];
  (dict.patterns||[]).forEach(function(p){
    try{
      var re=p[0]instanceof RegExp?p[0]:new RegExp(p[0]);
      patterns.push([re,p[1]]);
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  });
  dicts[lang]={strings:strings,patterns:patterns};
  if(SUPPORTED.indexOf(lang)<0)SUPPORTED.push(lang);
  if(lang===current&&document.body)translatePage();
}

function setLanguage(lang){
  if(!lang||SUPPORTED.indexOf(lang)<0)lang="uk";
  var changed=lang!==current;
  current=lang;
  try{localStorage.setItem(STORAGE_KEY,lang);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{document.documentElement.setAttribute("lang",lang);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{if(document.body)translatePage();}catch(e){
    try{window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.error("i18n.translate_failed",{message:String(e&&e.message||e),lang:lang});}catch(_e){window.__diagSilent&&window.__diagSilent(_e)}
  }
  listeners.slice().forEach(function(fn){try{fn(lang);}catch(e){window.__diagSilent&&window.__diagSilent(e)}});
  try{document.dispatchEvent(new CustomEvent("A·CEIL-language-changed",{detail:{language:lang,changed:changed}}));}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return current;
}

function getLanguage(){return current;}
function onChange(fn){if(typeof fn==="function")listeners.push(fn);}

window.A·CEIL=window.A·CEIL||{};
var api={
  register:register,
  setLanguage:setLanguage,
  getLanguage:getLanguage,
  t:t,
  translate:translateString,
  translatePage:translatePage,
  onChange:onChange,
  availableLanguages:function(){return SUPPORTED.slice();}
};
try{Object.defineProperty(api,"currentLanguage",{get:function(){return current;}});}catch(e){api.currentLanguage=current;}
window.A·CEIL.i18n=api;

function boot(){
  try{document.documentElement.lang=current;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  startObserver();
  if(current!=="uk")translatePage();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();
