(function(){
  "use strict";
  if(window.__A_CEIL_SIDE_INPUT_STEPPER_V1)return;
  window.__A_CEIL_SIDE_INPUT_STEPPER_V1=true;

  var activeIndex=0;
  var draft=[];
  var expanded=false;

  function sideName(index){
    var next=(index+1)%pts.length;
    return N(index)+N(next);
  }
  function numberValue(value){
    var parsed=parseFloat(String(value==null?"":value).replace(",","."));
    return isFinite(parsed)&&parsed>0?parsed:0;
  }
  function modal(){return document.querySelector("#sideInputModal>.modal");}
  function input(){return document.getElementById("aceilSideActiveInput");}

  function commitCurrent(){
    var field=input();
    if(field)draft[activeIndex]=numberValue(field.value);
  }
  function drawHighlight(){
    try{_wallSideFlash=activeIndex;draw();}catch(_){ }
  }
  function renderAllSides(){
    var box=document.getElementById("aceilSideAll");
    var toggle=document.getElementById("aceilSideAllToggle");
    if(!box||!toggle)return;
    toggle.textContent=expanded?"Сховати сторони ▴":"Усі сторони ▾";
    box.hidden=!expanded;
    if(!expanded)return;
    box.innerHTML=draft.map(function(value,index){
      return '<button type="button" class="aceil-side-chip'+(index===activeIndex?' active':'')+'" data-side-index="'+index+'"><b>'+sideName(index)+'</b><span>'+(value||"—")+'</span></button>';
    }).join("");
    box.querySelectorAll("[data-side-index]").forEach(function(button){
      button.addEventListener("click",function(){
        commitCurrent();
        activeIndex=Number(button.dataset.sideIndex)||0;
        expanded=false;
        renderCurrent(true);
      });
    });
  }
  function renderCurrent(keepKeyboard){
    var field=input();
    var label=document.getElementById("aceilSideLabel");
    var progress=document.getElementById("aceilSideProgress");
    var previous=document.getElementById("aceilSidePrevious");
    var next=document.getElementById("aceilSideNext");
    var arc=document.querySelector("#sideInputModal .aceil-side-arc");
    var editor=document.querySelector("#sideInputModal .aceil-side-arc-editor");
    if(label)label.textContent=sideName(activeIndex);
    if(progress)progress.textContent=(activeIndex+1)+"/"+pts.length;
    if(field){
      field.dataset.i=String(activeIndex);
      field.value=draft[activeIndex]||"";
      field.placeholder="см";
    }
    if(previous)previous.disabled=activeIndex===0;
    if(next)next.disabled=activeIndex===pts.length-1;
    if(arc){
      arc.id="sideArcBtn_"+activeIndex;
      arc.classList.toggle("active",wallTypes[activeIndex]==="arc");
      arc.setAttribute("aria-label",wallTypes[activeIndex]==="arc"?"Вимкнути дугу":"Зробити дугою");
      arc.title=wallTypes[activeIndex]==="arc"?"Дуга":"Пряма стіна";
    }
    if(editor){
      editor.id="sideArcEditor_"+activeIndex;
      editor.style.display=wallTypes[activeIndex]==="arc"?"block":"none";
      editor.innerHTML=wallTypes[activeIndex]==="arc"?renderArcPointsEditor(activeIndex):"";
    }
    renderAllSides();
    drawHighlight();
    if(keepKeyboard&&field){
      try{field.focus({preventScroll:true});}catch(_){field.focus();}
      try{field.select();}catch(_){ }
    }
  }
  function move(step){
    commitCurrent();
    var target=Math.max(0,Math.min(pts.length-1,activeIndex+step));
    if(target===activeIndex)return;
    activeIndex=target;
    renderCurrent(true);
  }
  function toggleArc(){
    commitCurrent();
    toggleSideArcType(activeIndex);
    renderCurrent(true);
  }
  function toggleAll(){
    commitCurrent();
    expanded=!expanded;
    renderAllSides();
  }
  function closeStepper(){
    try{_wallSideFlash=-1;draw();}catch(_){ }
    closeModal("sideInputModal");
  }
  function applyStepper(){
    commitCurrent();
    lengths=draft.map(function(value){return numberValue(value);});
    document.querySelectorAll("#tbl input[data-i]").forEach(function(field){
      var index=Number(field.dataset.i)||0;
      if(lengths[index]){
        field.value=lengths[index];
        field.classList.add("filled");
      }
    });
    var perimeter=_totalPerimeterCm();
    var per=document.getElementById("per");
    if(per)per.textContent=(perimeter/100).toFixed(2);
    try{_wallSideFlash=-1;}catch(_){ }
    closeModal("sideInputModal");
    rebuild();
    saveState();
    setTimeout(function(){
      try{
        if(window.A·CEILMeasureConfidence&&typeof window.A·CEILMeasureConfidence.notify==="function")window.A·CEILMeasureConfidence.notify(true);
      }catch(_){ }
    },250);
  }
  function buildMarkup(){
    var sheet=modal();
    if(!sheet)return false;
    sheet.classList.add("aceil-side-stepper");
    sheet.innerHTML='\
      <div class="aceil-side-head">\
        <h3>📋 Розміри</h3>\
        <span id="aceilSideProgress" class="aceil-side-progress"></span>\
        <button type="button" class="aceil-side-close" aria-label="Закрити">×</button>\
      </div>\
      <div class="aceil-side-current">\
        <button type="button" id="aceilSidePrevious" class="aceil-side-nav" aria-label="Попередня сторона">‹</button>\
        <strong id="aceilSideLabel" class="aceil-side-label"></strong>\
        <div class="aceil-side-value"><input id="aceilSideActiveInput" type="text" inputmode="decimal" enterkeyhint="next" pattern="[0-9]*[.,]?[0-9]*" autocomplete="off"><span>см</span></div>\
        <button type="button" id="sideArcBtn_0" class="aceil-side-arc" aria-label="Зробити дугою">〰</button>\
        <button type="button" id="aceilSideNext" class="aceil-side-nav" aria-label="Наступна сторона">›</button>\
      </div>\
      <div id="aceilSideArcEditor" class="aceil-side-arc-editor"></div>\
      <div id="aceilSideAll" class="aceil-side-all" hidden></div>\
      <div class="aceil-side-actions">\
        <button type="button" id="aceilSideAllToggle" class="aceil-side-all-toggle">Усі сторони ▾</button>\
        <button type="button" id="aceilSideApply" class="aceil-side-apply">Побудувати</button>\
      </div>';
    sheet.querySelector(".aceil-side-close").addEventListener("click",closeStepper);
    document.getElementById("aceilSidePrevious").addEventListener("click",function(){move(-1);});
    document.getElementById("aceilSideNext").addEventListener("click",function(){move(1);});
    document.getElementById("sideArcBtn_0").addEventListener("click",toggleArc);
    document.getElementById("aceilSideAllToggle").addEventListener("click",toggleAll);
    document.getElementById("aceilSideApply").addEventListener("click",applyStepper);
    var field=input();
    field.addEventListener("input",function(){draft[activeIndex]=numberValue(field.value);});
    field.addEventListener("change",commitCurrent);
    field.addEventListener("blur",commitCurrent);
    field.addEventListener("keydown",function(event){
      if(event.key!=="Enter")return;
      event.preventDefault();
      if(activeIndex<pts.length-1)move(1);else applyStepper();
    });
    return true;
  }

  function openStepper(){
    if(!closed||pts.length<3){showToast("Спочатку замкніть контур");return;}
    activeIndex=0;
    expanded=false;
    draft=lengths.map(function(value){return numberValue(value);});
    if(!buildMarkup())return;
    document.getElementById("sideInputModal").classList.add("open");
    renderCurrent(false);
    setTimeout(function(){var field=input();if(field){field.focus();try{field.select();}catch(_){ }}},80);
  }

  window.openSideInputModal=openStepper;
  window.applySideInputs=applyStepper;
  try{openSideInputModal=openStepper;applySideInputs=applyStepper;}catch(_){ }
})();
