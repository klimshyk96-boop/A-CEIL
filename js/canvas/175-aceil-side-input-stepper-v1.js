(function(){
"use strict";
if(window.__A_CEIL_SIDE_INPUT_STEPPER_V17)return;
window.__A_CEIL_SIDE_INPUT_STEPPER_V17=true;

var activeIndex=0,draft=[],mode="all",viewportBound=false,fullViewportHeight=0;

function sideName(i){return N(i)+N((i+1)%pts.length);}
function num(v){var x=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(x)&&x>0?x:0;}
function overlay(){return document.getElementById("sideInputModal");}
function sheet(){return document.querySelector("#sideInputModal>.modal");}

function highlight(i){
  activeIndex=Math.max(0,Math.min(pts.length-1,i));
  try{_wallSideFlash=activeIndex;draw();}catch(_){}
  document.querySelectorAll("#aceilAllRowsV17 .aceil-v17-row").forEach(function(r,k){r.classList.toggle("active",k===activeIndex);});
}
function focusAll(i){
  highlight(i);
  var f=document.querySelector('#aceilAllRowsV17 [data-v17-i="'+activeIndex+'"]');
  if(f){
    try{f.focus({preventScroll:true});}catch(_){f.focus();}
    try{f.select();}catch(_){}
    f.closest(".aceil-v17-row")?.scrollIntoView({block:"nearest"});
  }
}
function commitAll(){
  document.querySelectorAll("#aceilAllRowsV17 [data-v17-i]").forEach(function(f){
    draft[+f.dataset.v17I]=num(f.value);
  });
}
function apply(){
  if(mode==="all")commitAll();else{
    var f=document.getElementById("aceilSingleV17");
    if(f)draft[activeIndex]=num(f.value);
  }
  lengths=draft.map(num);
  document.querySelectorAll("#tbl input[data-i]").forEach(function(f){
    var i=+f.dataset.i||0;
    f.value=lengths[i]||"";
    f.classList.toggle("filled",!!lengths[i]);
  });
  var p=document.getElementById("per");if(p)p.textContent=(_totalPerimeterCm()/100).toFixed(2);
  try{_wallSideFlash=-1;}catch(_){}
  closeModal("sideInputModal");rebuild();saveState();
}
function close(){
  try{_wallSideFlash=-1;draw();}catch(_){}
  closeModal("sideInputModal");
}
function renderAll(){
  mode="all";
  overlay().classList.add("aceil-v17-all");
  var rows=draft.map(function(v,i){
    return '<div class="aceil-v17-row'+(i===activeIndex?' active':'')+'">'+
      '<button type="button" data-v17-label="'+i+'">'+sideName(i)+'</button>'+
      '<div><input data-v17-i="'+i+'" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" autocomplete="off" enterkeyhint="'+(i===pts.length-1?'done':'next')+'" value="'+(v||"")+'" placeholder="0"><span>см</span></div>'+
      '<b>'+(v?'✓':'')+'</b></div>';
  }).join("");
  sheet().innerHTML=
    '<div class="aceil-v17-head"><h3>📋 Розміри</h3><button type="button" id="aceilCloseV17">×</button></div>'+
    '<div class="aceil-v17-note">Всі сторони одночасно · активна стіна червона</div>'+
    '<div id="aceilAllRowsV17" class="aceil-v17-rows">'+rows+'</div>'+
    '<div class="aceil-v17-actions"><button type="button" id="aceilSingleModeV17">По одній стороні</button><button type="button" id="aceilApplyV17">Побудувати</button></div>';
  document.getElementById("aceilCloseV17").onclick=close;
  document.getElementById("aceilApplyV17").onclick=apply;
  document.getElementById("aceilSingleModeV17").onclick=function(){commitAll();renderSingle();};
  document.querySelectorAll("[data-v17-label]").forEach(function(b){b.onclick=function(){focusAll(+b.dataset.v17Label);};});
  document.querySelectorAll("[data-v17-i]").forEach(function(f){
    var i=+f.dataset.v17I;
    f.onfocus=function(){highlight(i);};
    f.oninput=function(){draft[i]=num(f.value);var b=f.closest(".aceil-v17-row").querySelector("b");b.textContent=draft[i]?"✓":"";};
    f.onkeydown=function(e){
      if(e.key!=="Enter")return;
      e.preventDefault();draft[i]=num(f.value);
      if(i<pts.length-1)focusAll(i+1);else apply();
    };
  });
  setTimeout(function(){focusAll(activeIndex);},60);
}
function renderSingle(){
  mode="single";
  overlay().classList.remove("aceil-v17-all");
  var i=activeIndex;
  sheet().innerHTML=
    '<div class="aceil-v17-head"><h3>📋 Розміри</h3><span>'+(i+1)+'/'+pts.length+'</span><button type="button" id="aceilCloseV17">×</button></div>'+
    '<div class="aceil-v17-single"><button id="aceilPrevV17">‹</button><strong>'+sideName(i)+'</strong><div><input id="aceilSingleV17" type="text" inputmode="decimal" enterkeyhint="next" value="'+(draft[i]||"")+'" placeholder="0"><span>см</span></div><button id="aceilNextV17">›</button></div>'+
    '<div class="aceil-v17-actions"><button type="button" id="aceilAllModeV17">Усі сторони</button><button type="button" id="aceilApplyV17">Побудувати</button></div>';
  highlight(i);
  document.getElementById("aceilCloseV17").onclick=close;
  document.getElementById("aceilApplyV17").onclick=apply;
  document.getElementById("aceilAllModeV17").onclick=function(){var f=document.getElementById("aceilSingleV17");draft[activeIndex]=num(f.value);renderAll();};
  document.getElementById("aceilPrevV17").onclick=function(){var f=document.getElementById("aceilSingleV17");draft[activeIndex]=num(f.value);if(activeIndex>0){activeIndex--;renderSingle();}};
  document.getElementById("aceilNextV17").onclick=function(){var f=document.getElementById("aceilSingleV17");draft[activeIndex]=num(f.value);if(activeIndex<pts.length-1){activeIndex++;renderSingle();}};
  var f=document.getElementById("aceilSingleV17");
  f.oninput=function(){draft[activeIndex]=num(f.value);};
  f.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();draft[activeIndex]=num(f.value);if(activeIndex<pts.length-1){activeIndex++;renderSingle();}else apply();}};
  setTimeout(function(){try{f.focus({preventScroll:true});f.select();}catch(_){f.focus();}},60);
}
function updateViewport(){
  var o=overlay();if(!o)return;
  var vv=window.visualViewport,h=vv?vv.height:innerHeight,top=vv?vv.offsetTop:0;
  if(o.classList.contains("open")&&vv){o.style.top=Math.round(top)+"px";o.style.height=Math.round(h)+"px";o.style.bottom="auto";}
  else if(!o.classList.contains("open")){o.style.top="";o.style.height="";o.style.bottom="";}
}
function bindViewport(){
  if(viewportBound)return;viewportBound=true;
  if(window.visualViewport){visualViewport.addEventListener("resize",updateViewport);visualViewport.addEventListener("scroll",updateViewport);}
}
function open(){
  if(!closed||pts.length<3){showToast("Спочатку замкніть контур");return;}
  activeIndex=0;mode="all";draft=lengths.map(num);
  var s=sheet();if(!s)return;
  s.className="modal aceil-v17-sheet";
  overlay().classList.add("open","aceil-v17-all");
  bindViewport();updateViewport();renderAll();
}
window.openSideInputModal=open;
window.applySideInputs=apply;
try{openSideInputModal=open;applySideInputs=apply;}catch(_){}
})();