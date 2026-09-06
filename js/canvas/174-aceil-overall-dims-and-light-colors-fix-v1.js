(function(){
"use strict";
if(window.__A_CEIL_FinalFixes174)return;
window.__A_CEIL_FinalFixes174=true;

/* =========================================================================
   FIX 1 — "Габаритні розміри приміщення" (overall room dimensions) keep
   appearing in the report even when the checkbox is switched OFF.

   Root cause: the report-generation functions (generateModernSingleReport /
   generateModernObjectReport) get their "settings" argument re-assigned in
   several places (e.g. openReportSettings() re-creates them on every modal
   open, and an earlier live-settings patch mismatched the argument index
   for the multi-room/object report). As a result the boolean the report
   actually renders with can be stale.

   Fix: make _overallDims() itself always re-check the live/current state
   instead of trusting whatever "rs" object it was handed. It first looks
   at the actual checkbox on the page (#rs_overall) if the settings panel
   is present, and otherwise falls back to freshly-loaded saved settings.
   ========================================================================= */
(function fixOverallDims(){
  var baseOverallDims=window._overallDims;
  if(typeof baseOverallDims!=="function")return;
  if(baseOverallDims.__aceilOverallFixed)return;

  var fixedOverallDims=function(st,rs){
    var isOn;
    try{
      var checkbox=document.getElementById("rs_overall");
      if(checkbox){
        isOn=checkbox.checked===true;
      }else{
        var saved=null;
        try{saved=typeof _loadRS==="function"?_loadRS():null}catch(_){}
        if(!saved){
          try{saved=JSON.parse(localStorage.getItem("reportSettings")||"{}")}catch(_){saved={}}
        }
        isOn=!!(saved&&saved.overall===true);
      }
    }catch(_){
      isOn=!!(rs&&rs.overall===true);
    }
    if(!isOn)return"";
    var patchedRs=Object.assign({},rs||{},{overall:true});
    return baseOverallDims(st,patchedRs);
  };
  fixedOverallDims.__aceilOverallFixed=true;

  window._overallDims=fixedOverallDims;
  try{_overallDims=fixedOverallDims}catch(_){}
})();

/* =========================================================================
   FIX 2 — Chandelier/spot-light markers render as plain white circles
   instead of: chandelier = filled yellow circle, spot light = yellow
   "donut" (white fill, yellow ring).

   Root cause: js/nomenclature/063-inline.js's init() unconditionally
   re-assigns window.drawLightMarks to a plain white-circle+icon renderer,
   and it re-runs that init() via setTimeout(...,50) and setTimeout(...,500)
   — i.e. AFTER every synchronous <script> tag (including the earlier
   yellow-color patch) has already finished running. That later timer wipes
   out the yellow-color fix every time.

   Fix: turn window.drawLightMarks into a self-defending accessor property.
   Whenever *anything* (now or in the future, sync or async) assigns a new
   raw drawing function to window.drawLightMarks, our setter intercepts it
   and re-wraps it with the correct yellow styling before it can be used.
   ========================================================================= */
(function fixLightColors(){
  function typeInfo(mark){
    var id=String(mark&&mark.type||"").toLowerCase(),label="";
    try{
      var item=typeof _lightType==="function"?_lightType(mark.type):null;
      label=String(item&&item.label||"").toLowerCase();
    }catch(_){}
    return{id:id,label:label};
  }
  function isPoint(info){return info.id==="spot"||/точков|точка|світильник|спот/.test(info.label)}
  function isChandelier(info){return info.id==="chandelier"||/люстр/.test(info.label)}

  function buildYellowWrapper(baseDraw){
    if(typeof baseDraw!=="function")return baseDraw;
    if(baseDraw.__aceilYellowLightsFinal)return baseDraw;

    var wrapped=function(ctx){
      var all=[];
      try{all=Array.isArray(lightMarks)?lightMarks:[]}
      catch(_){all=Array.isArray(window.lightMarks)?window.lightMarks:[]}

      var targets=[],others=[];
      all.forEach(function(mark,index){
        var info=typeInfo(mark);
        if(isPoint(info)||isChandelier(info))targets.push({mark:mark,index:index,chandelier:isChandelier(info)});
        else others.push(mark);
      });

      function setMarks(v){try{lightMarks=v}catch(_){window.lightMarks=v}}
      setMarks(others);
      try{baseDraw.apply(this,arguments)}
      finally{setMarks(all)}

      targets.forEach(function(entry){
        var mark=entry.mark;
        if(!mark||!isFinite(+mark.x)||!isFinite(+mark.y))return;
        var x=+mark.x,y=+mark.y,r=entry.chandelier?9.25:8.25,selected=false;
        try{selected=!_reportMode&&lightMode&&mark.id&&mark.id===selectedLightId}catch(_){}

        ctx.save();
        ctx.shadowColor="rgba(234,179,8,.35)";
        ctx.shadowBlur=4;
        ctx.beginPath();
        ctx.arc(x,y,r,0,Math.PI*2);
        if(entry.chandelier){
          ctx.fillStyle="#facc15";
          ctx.fill();
          ctx.shadowBlur=0;
          ctx.strokeStyle="#ca8a04";
          ctx.lineWidth=1.5;
          ctx.stroke();
        }else{
          ctx.fillStyle="#ffffff";
          ctx.fill();
          ctx.shadowBlur=0;
          ctx.strokeStyle="#facc15";
          ctx.lineWidth=2.6;
          ctx.stroke();
        }
        if(selected){
          ctx.beginPath();
          ctx.arc(x,y,r+3.5,0,Math.PI*2);
          ctx.strokeStyle="#2563eb";
          ctx.lineWidth=2;
          ctx.stroke();
        }
        ctx.fillStyle="#475569";
        ctx.font="700 9px Arial";
        ctx.textAlign="center";
        ctx.textBaseline="top";
        ctx.fillText(String(entry.index+1),x,y+r+4);
        ctx.restore();
      });
    };
    wrapped.__aceilYellowLightsFinal=true;
    return wrapped;
  }

  var storedWrapped=buildYellowWrapper(window.drawLightMarks);

  var installed=false;
  try{
    Object.defineProperty(window,"drawLightMarks",{
      configurable:true,
      enumerable:true,
      get:function(){return storedWrapped},
      set:function(fn){storedWrapped=buildYellowWrapper(fn)}
    });
    installed=true;
  }catch(_){installed=false}

  if(!installed){
    // Fallback for environments where defineProperty on window isn't allowed:
    // periodically re-assert the yellow wrapper.
    window.drawLightMarks=storedWrapped;
    try{drawLightMarks=storedWrapped}catch(_){}
    setInterval(function(){
      var current=window.drawLightMarks;
      if(current&&current.__aceilYellowLightsFinal)return;
      var rewrapped=buildYellowWrapper(current);
      window.drawLightMarks=rewrapped;
      try{drawLightMarks=rewrapped}catch(_){}
    },250);
  }else{
    try{drawLightMarks=storedWrapped}catch(_){}
  }
})();

})();
