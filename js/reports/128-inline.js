
!function(){
  "use strict";
  function analyzeNow(){
    try{ if(window.A·CEILMeasureConfidence&&typeof window.A·CEILMeasureConfidence.analyze==="function") return window.A·CEILMeasureConfidence.analyze(); }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return null;
  }
  function ensureGateModal(){
    var modal=document.getElementById("rmConfidenceGateModal");
    if(modal) return modal;
    modal=document.createElement("div");
    modal.id="rmConfidenceGateModal";
    modal.style.cssText="position:fixed;inset:0;z-index:15000;background:rgba(15,23,42,.55);display:none;align-items:flex-end;justify-content:center;padding:12px";
    document.body.appendChild(modal);
    modal.addEventListener("click",function(e){ if(e.target===modal) window._rmConfidenceGateCancel(); });
    return modal;
  }
  window._rmConfidenceGateCancel=function(){
    var modal=document.getElementById("rmConfidenceGateModal");
    if(modal) modal.style.display="none";
    window._rmPendingReportProceed=null;
    try{ window.A·CEILMeasureConfidence&&window.A·CEILMeasureConfidence.open&&window.A·CEILMeasureConfidence.open(); }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  };
  window._rmConfidenceGateProceed=function(){
    var modal=document.getElementById("rmConfidenceGateModal");
    if(modal) modal.style.display="none";
    window._rmReportHasUnresolvedIssue=true;
    var cb=window._rmPendingReportProceed;
    window._rmPendingReportProceed=null;
    if(typeof cb==="function") cb();
  };
  function showGate(verdict,proceedCallback){
    window._rmPendingReportProceed=proceedCallback;
    var modal=ensureGateModal();
    modal.innerHTML='<div style="background:#fff;border-radius:22px;padding:20px;width:min(94vw,440px);box-shadow:0 20px 60px rgba(0,0,0,.3)">'
      +'<div style="font-weight:900;font-size:17px;color:#0f172a;margin-bottom:8px">'+verdict.icon+' Непідтверджена похибка заміру</div>'
      +'<div style="font-size:14px;color:#334155;line-height:1.4;margin-bottom:18px">'+verdict.text+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +'<button type="button" onclick="_rmConfidenceGateCancel()" style="min-height:48px;border-radius:14px;background:#eff6ff;color:#1d4ed8;font-weight:800;border:none">Перевірити спочатку</button>'
      +'<button type="button" onclick="_rmConfidenceGateProceed()" style="min-height:48px;border-radius:14px;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;font-weight:800;border:none">Все одно продовжити</button>'
      +'</div></div>';
    modal.style.display="flex";
  }
  function gateCheck(proceedCallback){
    window._rmReportHasUnresolvedIssue=false;
    var r=analyzeNow();
    if(!r||!r.verdict||(r.verdict.type!=="proven"&&r.verdict.type!=="conflict")) return proceedCallback();
    showGate(r.verdict,proceedCallback);
  }
  function gateCheckObject(obj,proceedCallback){
    window._rmReportHasUnresolvedIssue=false;
    var problems=[];
    try{
      (obj&&obj.rooms||[]).forEach(function(room){
        if(typeof window._analyzeRoomState!=="function") return;
        var r=window._analyzeRoomState(room);
        if(r&&r.verdict&&(r.verdict.type==="proven"||r.verdict.type==="conflict")){
          problems.push({name:room&&room.name||"Кімната",verdict:r.verdict});
        }
      });
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    if(!problems.length) return proceedCallback();
    var combined={
      icon:problems.some(function(p){return p.verdict.type==="proven";})?"🔴":"🟡",
      text:problems.map(function(p){return p.verdict.icon+" <b>"+p.name+"</b>: "+p.verdict.text;}).join("<br><br>")
    };
    showGate(combined,proceedCallback);
  }
  function wrap(name){
    var orig=window[name];
    if(typeof orig!=="function"||orig.__rmGated) return;
    var wrapped=function(){
      var self=this,args=arguments;
      return new Promise(function(resolve){
        gateCheck(function(){ resolve(orig.apply(self,args)); });
      });
    };
    wrapped.__rmGated=true;
    window[name]=wrapped;
  }
  wrap("saveToPhone");
  try{ saveToPhone=window.saveToPhone; }catch(e){window.__diagSilent&&window.__diagSilent(e)}

  (function(){
    var orig=window.generateObjectReport;
    if(typeof orig!=="function"||orig.__rmGated) return;
    var wrapped=function(obj){
      var self=this,args=arguments;
      return new Promise(function(resolve){
        gateCheckObject(obj,function(){ resolve(orig.apply(self,args)); });
      });
    };
    wrapped.__rmGated=true;
    window.generateObjectReport=wrapped;
  })();
  try{ generateObjectReport=window.generateObjectReport; }catch(e){window.__diagSilent&&window.__diagSilent(e)}

  var origPreview=window._modernOpenPreview;
  if(typeof origPreview==="function"&&!origPreview.__rmStamped){
    var wrappedPreview=function(out,fileName){
      try{
        if(window._rmReportHasUnresolvedIssue&&out&&out.getContext){
          var c=out.getContext("2d"),W=out.dataset&&out.dataset.logicalWidth?Number(out.dataset.logicalWidth):out.width,H=out.dataset&&out.dataset.logicalHeight?Number(out.dataset.logicalHeight):out.height;
          c.save();
          c.fillStyle="#fef3c7";
          c.fillRect(0,H-34,W,34);
          c.fillStyle="#92400e";
          c.font="bold 15px Arial";
          c.textAlign="center";
          c.fillText("⚠️ Замір містить непідтверджену розбіжність — перевірте виміри",W/2,H-12);
          c.textAlign="left";
          c.restore();
        }
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
      window._rmReportHasUnresolvedIssue=false;
      return origPreview.call(this,out,fileName);
    };
    wrappedPreview.__rmStamped=true;
    window._modernOpenPreview=wrappedPreview;
  }
}();
