(function(){
"use strict";
if(window.__A_CEIL_PlanReportPwaV1)return;
window.__A_CEIL_PlanReportPwaV1=true;

function isInstalledApp(){
  try{return navigator.standalone===true||window.matchMedia("(display-mode: standalone)").matches||window.matchMedia("(display-mode: window-controls-overlay)").matches}catch(_){return false}
}
function liveReportSettings(value){
  var out=Object.assign({},value||{}),checkbox=document.getElementById("rs_overall");
  if(checkbox)out.overall=checkbox.checked===true;
  else try{
    var saved=JSON.parse(localStorage.getItem("reportSettings")||"{}");
    if(Object.prototype.hasOwnProperty.call(saved,"overall"))out.overall=saved.overall===true;
  }catch(_){}
  return out;
}
function wrapSettingsFunction(name){
  var previous=window[name];
  if(typeof previous!=="function"||previous.__aceilLiveOverall)return;
  var wrapped=function(settings){
    var args=Array.prototype.slice.call(arguments),settingsIndex=name==="_renderRoomForReport"?1:0;
    args[settingsIndex]=liveReportSettings(args[settingsIndex]);
    return previous.apply(this,args);
  };
  wrapped.__aceilLiveOverall=true;window[name]=wrapped;
  try{if(name==="_modernCaptureCurrentDrawing")_modernCaptureCurrentDrawing=wrapped;else if(name==="_renderRoomForReport")_renderRoomForReport=wrapped;else if(name==="generateModernSingleReport")generateModernSingleReport=wrapped;else if(name==="generateModernObjectReport")generateModernObjectReport=wrapped}catch(_){}
}
["_modernCaptureCurrentDrawing","_renderRoomForReport","generateModernSingleReport","generateModernObjectReport"].forEach(wrapSettingsFunction);

var previousSave=window.saveReportSettings;
if(typeof previousSave==="function"&&!previousSave.__aceilLiveOverall){
  var saveWrapped=function(){
    var checkbox=document.getElementById("rs_overall");
    if(checkbox)try{var saved=JSON.parse(localStorage.getItem("reportSettings")||"{}");saved.overall=checkbox.checked===true;localStorage.setItem("reportSettings",JSON.stringify(saved))}catch(_){}
    return previousSave.apply(this,arguments);
  };
  saveWrapped.__aceilLiveOverall=true;window.saveReportSettings=saveWrapped;try{saveReportSettings=saveWrapped}catch(_){}
}

function typeInfo(mark){
  var id=String(mark&&mark.type||"").toLowerCase(),label="";
  try{var item=typeof _lightType==="function"?_lightType(mark.type):null;label=String(item&&item.label||"").toLowerCase()}catch(_){}
  return{id:id,label:label};
}
function isPoint(info){return info.id==="spot"||/точков|точка|світильник/.test(info.label)}
function isChandelier(info){return info.id==="chandelier"||/люстр/.test(info.label)}
function assignLightMarks(list){try{lightMarks=list}catch(_){window.lightMarks=list}}
var previousDraw=window.drawLightMarks;
if(typeof previousDraw==="function"&&!previousDraw.__aceilYellowLights){
  var yellowDraw=function(ctx){
    var all=[];try{all=Array.isArray(lightMarks)?lightMarks:[]}catch(_){all=Array.isArray(window.lightMarks)?window.lightMarks:[]}
    var targets=[],others=[];
    all.forEach(function(mark,index){var info=typeInfo(mark);if(isPoint(info)||isChandelier(info))targets.push({mark:mark,index:index,chandelier:isChandelier(info)});else others.push(mark)});
    assignLightMarks(others);
    try{previousDraw.apply(this,arguments)}finally{assignLightMarks(all)}
    targets.forEach(function(entry){
      var mark=entry.mark;if(!mark||!isFinite(+mark.x)||!isFinite(+mark.y))return;
      var x=+mark.x,y=+mark.y,r=entry.chandelier?9.25:8.25,selected=false;
      try{selected=!_reportMode&&lightMode&&mark.id&&mark.id===selectedLightId}catch(_){}
      ctx.save();ctx.shadowColor="rgba(234,179,8,.35)";ctx.shadowBlur=4;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
      if(entry.chandelier){ctx.fillStyle="#facc15";ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#ca8a04";ctx.lineWidth=1.5;ctx.stroke();}
      else{ctx.fillStyle="#ffffff";ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#facc15";ctx.lineWidth=2.6;ctx.stroke();}
      if(selected){ctx.beginPath();ctx.arc(x,y,r+3.5,0,Math.PI*2);ctx.strokeStyle="#2563eb";ctx.lineWidth=2;ctx.stroke()}
      ctx.fillStyle="#475569";ctx.font="700 9px Arial";ctx.textAlign="center";ctx.textBaseline="top";ctx.fillText(String(entry.index+1),x,y+r+4);ctx.restore();
    });
  };
  yellowDraw.__aceilYellowLights=true;window.drawLightMarks=yellowDraw;try{drawLightMarks=yellowDraw}catch(_){}
}

function dataUrlToBlob(dataUrl){
  var parts=dataUrl.split(","),mime=(parts[0].match(/:(.*?);/)||[])[1]||"image/png",raw=atob(parts[1]),bytes=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime});
}
async function publishImageReport(canvas,fileName){
  var client=window._sb,user=window._sbUser;
  if(!client)throw new Error("Хмара ще не підключена");
  if(!user||!user.id)throw new Error("Потрібна авторизація");
  var bytes=new Uint8Array(10);try{crypto.getRandomValues(bytes)}catch(_){for(var i=0;i<bytes.length;i++)bytes[i]=Math.floor(256*Math.random())}
  var token=Array.from(bytes).map(function(x){return x.toString(16).padStart(2,"0")}).join("");
  var structured=null;try{if(typeof window.A_CEIL_buildCloudStructuredReport==="function")structured=window.A_CEIL_buildCloudStructuredReport(fileName)}catch(_){}
  var payload={version:2,createdAt:new Date().toISOString(),meta:{name:String(window._currentProjName||fileName||"Звіт A·CEIL")},structured:structured,image:canvas.toDataURL("image/png")};
  var blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
  var result=await client.storage.from("roomator-reports").upload("r/"+token+".json",blob,{contentType:"application/json",upsert:false,cacheControl:"3600"});
  if(result.error)throw result.error;
  return location.origin+"/?r="+token;
}
function openReportInsideApp(canvas,fileName){
  var dataUrl=canvas.toDataURL("image/png"),old=document.getElementById("A_CEIL_InAppImageReport");if(old)old.remove();
  var priorOverflow=document.body.style.overflow,layer=document.createElement("div");layer.id="A_CEIL_InAppImageReport";
  layer.innerHTML='<div class="aceil-ir-head"><button type="button" data-close>← Назад</button><strong>Звіт A·CEIL</strong><span></span></div><div class="aceil-ir-body"><img alt="Звіт A·CEIL"><div class="aceil-ir-cloud" hidden><input readonly data-cloud-url><button type="button" data-copy>Копіювати</button></div></div><div class="aceil-ir-actions"><button type="button" data-save>Зберегти PNG</button><button type="button" data-cloud>Хмарне посилання</button><button type="button" class="primary" data-share>Поділитися</button></div>';
  if(!document.getElementById("A_CEIL_InAppImageReportCss")){
    var style=document.createElement("style");style.id="A_CEIL_InAppImageReportCss";style.textContent="#A_CEIL_InAppImageReport{position:fixed;inset:0;z-index:2147483000;background:#eef3f9;color:#0f172a;display:grid;grid-template-rows:auto 1fr auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}.aceil-ir-head{height:58px;padding:8px 14px;background:#fff;border-bottom:1px solid #dbe4ef;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.aceil-ir-head button{justify-self:start;border:1px solid #dbe4ef;background:#f8fafc;border-radius:11px;padding:9px 13px;font-weight:800;color:#0f172a}.aceil-ir-body{overflow:auto;padding:16px}.aceil-ir-body img{display:block;max-width:100%;height:auto;margin:0 auto;background:#fff;border-radius:15px;box-shadow:0 8px 28px rgba(15,23,42,.13)}.aceil-ir-cloud{max-width:900px;margin:12px auto 0;padding:9px;background:#fff;border:1px solid #bfdbfe;border-radius:13px;display:flex;gap:8px}.aceil-ir-cloud[hidden]{display:none}.aceil-ir-cloud input{flex:1;min-width:0;border:0;background:#f8fafc;border-radius:9px;padding:10px;color:#334155}.aceil-ir-cloud button{border:0;background:#dbeafe;color:#1d4ed8;border-radius:9px;padding:10px 13px;font-weight:850}.aceil-ir-actions{display:flex;gap:10px;padding:10px 14px max(12px,env(safe-area-inset-bottom));background:#fff;border-top:1px solid #dbe4ef}.aceil-ir-actions button{flex:1;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:13px;padding:13px;font-weight:850}.aceil-ir-actions .primary{background:#2563eb;color:#fff;border-color:#2563eb}";document.head.appendChild(style)
  }
  document.body.appendChild(layer);document.body.style.overflow="hidden";layer.querySelector("img").src=dataUrl;
  function close(){document.body.style.overflow=priorOverflow;layer.remove();window.removeEventListener("keydown",onKey)}
  function onKey(e){if(e.key==="Escape")close()}
  function save(){var a=document.createElement("a");a.href=dataUrl;a.download=fileName||"A-CEIL-report.png";document.body.appendChild(a);a.click();a.remove()}
  var cloudButton=layer.querySelector("[data-cloud]"),shareButton=layer.querySelector("[data-share]"),cloudBox=layer.querySelector(".aceil-ir-cloud"),cloudInput=layer.querySelector("[data-cloud-url]"),copyButton=layer.querySelector("[data-copy]");
  async function cloudUrl(){if(cloudInput.value)return cloudInput.value;cloudButton.disabled=true;cloudButton.textContent="Завантаження…";try{var url=await publishImageReport(canvas,fileName);cloudInput.value=url;cloudBox.hidden=false;cloudButton.textContent="Посилання готове";return url}catch(e){cloudButton.textContent="Помилка хмари";throw e}finally{cloudButton.disabled=false}}
  async function shareUrl(url){if(navigator.share){try{await navigator.share({title:"Звіт A·CEIL",text:"Звіт A·CEIL",url:url});return}catch(e){if(e&&e.name==="AbortError")return}}try{await navigator.clipboard.writeText(url);shareButton.textContent="Посилання скопійовано";setTimeout(function(){shareButton.textContent="Поділитися"},1800)}catch(_){cloudBox.hidden=false;cloudInput.focus();cloudInput.select()}}
  layer.querySelector("[data-close]").onclick=close;layer.querySelector("[data-save]").onclick=save;
  cloudButton.onclick=function(){cloudUrl().catch(function(e){try{showToast(e&&e.message?e.message:"Помилка хмари")}catch(_){}})};
  copyButton.onclick=async function(){if(!cloudInput.value)return;try{await navigator.clipboard.writeText(cloudInput.value);copyButton.textContent="Скопійовано";setTimeout(function(){copyButton.textContent="Копіювати"},1500)}catch(_){cloudInput.focus();cloudInput.select()}};
  shareButton.onclick=function(){if(cloudInput.value){shareUrl(cloudInput.value);return}shareButton.disabled=true;shareButton.textContent="Готуємо посилання…";cloudUrl().then(function(){shareButton.disabled=false;shareButton.textContent="Натисніть ще раз"}).catch(function(e){shareButton.disabled=false;shareButton.textContent="Поділитися";try{showToast(e&&e.message?e.message:"Помилка хмари")}catch(_){}})};
  window.addEventListener("keydown",onKey);
}
var previousPreview=window._modernOpenPreview;
if(typeof previousPreview==="function"&&!previousPreview.__aceilInApp){
  var previewWrapped=function(canvas,fileName){return isInstalledApp()?openReportInsideApp(canvas,fileName):previousPreview.apply(this,arguments)};
  previewWrapped.__aceilInApp=true;window._modernOpenPreview=previewWrapped;try{_modernOpenPreview=previewWrapped}catch(_){}
}
})();
