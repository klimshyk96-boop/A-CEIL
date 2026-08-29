
(function(){
"use strict";
if(window.__rmReportCeilingElementsV326)return;
window.__rmReportCeilingElementsV326=true;

function types(){
  try{
    if(typeof lightTypes!=="undefined"&&Array.isArray(lightTypes))return lightTypes;
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{
    var a=JSON.parse(localStorage.getItem("lightTypes_v1")||"[]");
    return Array.isArray(a)?a:[];
  }catch(_){return []}
}
function typeObj(id){
  id=String(id||"");
  var a=types();
  for(var i=0;i<a.length;i++)if(String(a[i]&&a[i].id||"")===id)return a[i];
  return null;
}
function norm(v){return String(v||"").trim().toLowerCase()}
function isVent(mark){
  var id=norm(mark&&mark.type),t=typeObj(mark&&mark.type)||{};
  var s=id+" "+norm(t.label)+" "+norm(t.id)+" "+norm(t.svgId);
  return /(^|[\s_-])(vent|exhaust|hood|extractor|fan)([\s_-]|$)|витяж|вентиляц/.test(s);
}
function isChandelier(mark){
  var id=norm(mark&&mark.type),t=typeObj(mark&&mark.type)||{};
  return id==="chandelier"||/люстр/.test(norm(t.label));
}
function isSpot(mark){
  var id=norm(mark&&mark.type),t=typeObj(mark&&mark.type)||{};
  return id==="spot"||/спот|точков/.test(norm(t.label));
}
window.rmIsFixtureMarkV326=function(mark){
  return !!mark&&!isVent(mark)&&(isSpot(mark)||isChandelier(mark));
};
window.rmIsCeilingCustomMarkV326=function(mark){
  return !!mark&&!isVent(mark)&&!isSpot(mark)&&!isChandelier(mark);
};

function fmt(v){
  v=Number(v);
  if(!isFinite(v))return "";
  var n=Math.round(v*10)/10;
  return String(n).replace(".",",");
}
function markCoords(mark,st){
  if(mark&&isFinite(Number(mark.coordX))&&isFinite(Number(mark.coordY))){
    return {x:Number(mark.coordX),y:Number(mark.coordY)};
  }
  /* If stored coordinates are absent, use the app's existing coordinate mapper
     for the currently open room. Saved multi-room states normally already contain coordX/coordY. */
  try{
    if(!st&&typeof canvasToLightCoords==="function"){
      var c=canvasToLightCoords(Number(mark.x)||0,Number(mark.y)||0,Number(mark.baseIndex)||0);
      if(c&&isFinite(Number(c.x))&&isFinite(Number(c.y)))return{x:Number(c.x),y:Number(c.y)};
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return null;
}
window.getCeilingElementCoordLinesV326=function(st){
  var marks=st&&Array.isArray(st.lightMarks)?st.lightMarks:
    ((typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))?lightMarks:[]);
  var out=[],counts={};
  marks.filter(window.rmIsCeilingCustomMarkV326).forEach(function(m){
    var t=typeObj(m.type)||{};
    var label=String(t.label||m.label||m.type||"Елемент стелі").trim();
    counts[label]=(counts[label]||0)+1;
    var n=counts[label],sameTotal=marks.filter(function(x){
      if(!window.rmIsCeilingCustomMarkV326(x))return false;
      var tx=typeObj(x.type)||{};
      return String(tx.label||x.label||x.type||"Елемент стелі").trim()===label;
    }).length;
    var title=sameTotal>1?label+" "+n:label;
    var c=markCoords(m,st);
    if(c){
      out.push(title+": X "+fmt(c.x)+" см · Y "+fmt(c.y)+" см");
    }else{
      out.push(title);
    }
  });
  return out;
};
})();
