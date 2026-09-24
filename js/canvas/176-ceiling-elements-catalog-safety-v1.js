(function(){
"use strict";
if(window.__aceilCeilingCatalogSafetyV1)return;
window.__aceilCeilingCatalogSafetyV1=true;

var KEY="lightTypes_v1";
var READY=[
  {id:"vent",label:"Витяжка",icon:"◯",svgId:"vent_round",system:true,locked:false},
  {id:"ce_magnetic_exhaust",label:"Магнітна витяжка",icon:"◉",svgId:"vent_grille",ceilingElement:true},
  {id:"ce_camera_sensor",label:"Датчик/камера",icon:"◌",svgId:"camera",ceilingElement:true},
  {id:"ce_pipe_bypass_lt50",label:"Обхід труби <50",icon:"◆",svgId:"niche",ceilingElement:true},
  {id:"ce_pipe_bypass_gt50",label:"Обхід труби >50 мм",icon:"◆",svgId:"niche",ceilingElement:true}
];

function read(){
  try{var a=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}
}
function current(){
  try{if(Array.isArray(window.lightTypes))return window.lightTypes.slice()}catch(_){/* noop */}
  try{if(typeof lightTypes!=="undefined"&&Array.isArray(lightTypes))return lightTypes.slice()}catch(_){/* noop */}
  return [];
}
function merge(){
  var sources=Array.prototype.slice.call(arguments),out=[];
  sources.forEach(function(list){
    (Array.isArray(list)?list:[]).forEach(function(t){
      if(!t||!t.id)return;
      var id=String(t.id),label=String(t.label||"").trim().toLowerCase();
      var at=out.findIndex(function(x){return String(x.id)===id||(label&&String(x.label||"").trim().toLowerCase()===label)});
      if(at>=0)out[at]=Object.assign({},out[at],t);
      else out.push(Object.assign({},t));
    });
  });
  return out;
}

/* Keep the pre-cloud list so an older cloud copy cannot erase local cards. */
var startupSnapshot=read();
function repair(){
  var next=merge(READY,startupSnapshot,read(),current());
  if(!next.length)return;
  try{localStorage.setItem(KEY,JSON.stringify(next))}catch(_){/* noop */}
  try{window.lightTypes=next;lightTypes=next}catch(_){window.lightTypes=next}
  try{if(typeof window.rmRenderCeilingElementsV318==="function")window.rmRenderCeilingElementsV318()}catch(_){/* noop */}
  try{if(typeof window.renderLightMenu==="function")window.renderLightMenu()}catch(_){/* noop */}
  try{if(typeof window.renderLightTypeRowsSvg==="function")window.renderLightTypeRowsSvg()}catch(_){/* noop */}
}

var oldForce=window.forceLoadNomenclature;
if(typeof oldForce==="function"&&!oldForce.__ceCatalogSafe){
  var wrapped=async function(){var r=await oldForce.apply(this,arguments);repair();return r};
  wrapped.__ceCatalogSafe=true;
  window.forceLoadNomenclature=wrapped;
  try{forceLoadNomenclature=wrapped}catch(_){/* noop */}
}

repair();
[250,900,1800,4000].forEach(function(ms){setTimeout(repair,ms)});
document.addEventListener("visibilitychange",function(){if(!document.hidden)repair()});
})();
