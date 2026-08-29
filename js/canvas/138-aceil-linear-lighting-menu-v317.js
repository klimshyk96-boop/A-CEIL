
(function(){
"use strict";
if(window.__A·CEILLinearLightingMenuV317)return;
window.__A·CEILLinearLightingMenuV317=true;

function modal(){return document.getElementById("rmLinearLightingModalV317")}
function openMenu(){
  try{if(typeof closeRmLightStart==="function")closeRmLightStart()}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var m=modal();if(!m)return;
  m.classList.add("open");m.setAttribute("aria-hidden","false");
}
function closeMenu(){
  var m=modal();if(!m)return;
  m.classList.remove("open");m.setAttribute("aria-hidden","true");
}
window.rmOpenLinearLightingV317=openMenu;
window.rmCloseLinearLightingV317=closeMenu;

function openReady(){
  closeMenu();
  try{
    if(typeof window.rmOpenLinearElement==="function")window.rmOpenLinearElement();
    if(typeof window.leChooseType==="function")window.leChooseType("lightLine");
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function openFree(){
  closeMenu();
  try{
    if(typeof window.flpStart==="function")window.flpStart();
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

var closeBtn=document.getElementById("rmLinearLightingCloseV317");
var readyBtn=document.getElementById("rmLinearLightingReadyV317");
var freeBtn=document.getElementById("rmLinearLightingFreeV317");
if(closeBtn)closeBtn.addEventListener("click",closeMenu);
if(readyBtn)readyBtn.addEventListener("click",openReady);
if(freeBtn)freeBtn.addEventListener("click",openFree);
var root=modal();
if(root)root.addEventListener("click",function(e){if(e.target===root)closeMenu()});

function consolidateLauncher(){
  var host=document.getElementById("rmLightStartModal");
  if(!host)return;
  var grid=host.querySelector(".rm-ls-grid");
  if(!grid)return;

  /* Remove the old "Лінійний елемент" launcher. */
  grid.querySelectorAll("[data-le-item]").forEach(function(n){n.remove()});

  /* Reuse data-flp so the old PRO MutationObserver considers its launcher present,
     but strip its old click listener by replacing the node. */
  var old=grid.querySelector("[data-flp]");
  var btn;
  if(old){
    btn=old.cloneNode(true);
    old.replaceWith(btn);
  }else{
    btn=document.createElement("button");
    btn.type="button";
    btn.className="rm-ls-btn primary";
    btn.setAttribute("data-flp","1");
    grid.insertBefore(btn,grid.firstChild);
  }

  btn.className="rm-ls-btn primary";
  btn.innerHTML='<span class="rm-ls-icon">━</span><span><b>Лінійне освітлення</b><small>готові фігури або довільна форма</small></span>';
  btn.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    openMenu();
    return false;
  };
}

var prevOpen=window.openRmLightStart;
window.openRmLightStart=function(){
  var r;
  try{if(typeof prevOpen==="function")r=prevOpen.apply(this,arguments)}
  finally{setTimeout(consolidateLauncher,0)}
  return r;
};
try{openRmLightStart=window.openRmLightStart}catch(_){window.__diagSilent&&window.__diagSilent(_)}

var host=document.getElementById("rmLightStartModal");
if(host){
  try{
    new MutationObserver(function(){
      var grid=host.querySelector(".rm-ls-grid");
      if(!grid)return;
      var hasOld=grid.querySelector("[data-le-item]");
      var flp=grid.querySelector("[data-flp]");
      var correct=flp&&/Лінійне освітлення/.test(flp.textContent||"");
      if(hasOld||!correct)consolidateLauncher();
    }).observe(host,{childList:true,subtree:true});
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
setTimeout(consolidateLauncher,50);
})();
