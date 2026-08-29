
(function(){
  "use strict";
  var lf = window.A·CEILLightRowState || {mode:"one", qty:4, orient:"auto"};
  window.A·CEILLightRowState = lf;

  function wrap(name, after){
    var old = window[name];
    if (typeof old !== "function" || old.__v234wrapped) return;
    var fn = function(){
      var args = arguments;
      var result = old.apply(this, args);
      try { after.apply(this, args); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
      return result;
    };
    fn.__v234wrapped = true;
    window[name] = fn;
  }

  wrap("rmLfSetMode", function(mode){ lf.mode = mode || "one"; });
  wrap("rmLfSetQty", function(qty){ lf.qty = Math.max(1, parseInt(qty, 10) || 4); });
  wrap("rmLfSetOrient", function(orient){ lf.orient = orient || "auto"; });

  function roomBox(){
    var cv = document.getElementById("cv") || {width:800,height:500};
    var list = (typeof pts !== "undefined" && Array.isArray(pts)) ? pts : [];
    if (!list.length) return {left:80, top:80, right:(cv.width||800)-80, bottom:(cv.height||500)-80};
    var xs=list.map(function(p){return Number(p.x)||0}), ys=list.map(function(p){return Number(p.y)||0});
    return {left:Math.min.apply(null,xs), top:Math.min.apply(null,ys), right:Math.max.apply(null,xs), bottom:Math.max.apply(null,ys)};
  }
  function pxPerCm(){
    try {
      if (typeof scale !== "undefined" && Number(scale)>0) return Number(scale);
      if (typeof _pxPerCm === "function") { var v=Number(_pxPerCm()); if(v>0) return v; }
    } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return 1;
  }
  function replaceSpots(points){
    if (typeof lightMarks === "undefined" || !Array.isArray(lightMarks)) return false;
    lightMarks.length = 0;
    var base = Date.now();
    points.forEach(function(p,i){
      var m={id:"light_row_"+base+"_"+i,type:"spot",x:Math.round(p.x),y:Math.round(p.y)};
      try { if(typeof _nearestLightBaseIndex==="function") m.baseIndex=_nearestLightBaseIndex(m.x,m.y); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try { if(typeof _updateLightCoords==="function") _updateLightCoords(m); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
      lightMarks.push(m);
    });
    try { if(typeof updateLightBadge==="function") updateLightBadge(); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try { if(typeof syncLightMarksToElems==="function") syncLightMarksToElems(); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try { if(typeof saveState==="function") saveState(); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try { if(typeof requestDraw==="function") requestDraw(); else if(typeof draw==="function") draw(); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return true;
  }
  function buildUniformRow(){
    var box=roomBox();
    var w=box.right-box.left, h=box.bottom-box.top;
    var orient=lf.orient || "auto";
    var vertical = orient === "v" || (orient === "auto" && h > w);
    if (orient === "h") vertical = false;
    var n=Math.max(1, Number(lf.qty)||4);
    var edgeInput=document.getElementById("rmLfEdgeOffset");
    var edgeCm=Math.max(0, Number(edgeInput && edgeInput.value)||50);
    var edgePx=edgeCm*pxPerCm();
    var start=(vertical?box.top:box.left)+edgePx;
    var end=(vertical?box.bottom:box.right)-edgePx;
    if(end<=start){ start=vertical?box.top:box.left; end=vertical?box.bottom:box.right; }
    var fixed=vertical?(box.left+box.right)/2:(box.top+box.bottom)/2;
    var arr=[];
    for(var i=0;i<n;i++){
      var v=n===1?(start+end)/2:start+i*(end-start)/(n-1);
      arr.push(vertical?{x:fixed,y:v}:{x:v,y:fixed});
    }
    if(replaceSpots(arr)){
      try { if(typeof rmLfClose==="function") rmLfClose(); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try { if(typeof showToast==="function") showToast("Ряд: "+n+" світильників — "+(vertical?"по довжині":"по ширині")); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    }
  }

  var oldApply=window.rmLfApply;
  window.rmLfApply=function(){
    var row=document.getElementById("rmLfRow");
    var rowVisible=row && !row.classList.contains("rm-lf-hidden");
    if(rowVisible || lf.mode==="row") return buildUniformRow();
    return typeof oldApply==="function" ? oldApply.apply(this,arguments) : undefined;
  };
  try { rmLfApply=window.rmLfApply; } catch(e){window.__diagSilent&&window.__diagSilent(e)}

  function addCurtainHint(){
    var label=[].slice.call(document.querySelectorAll("label,.rwe-label")).find(function(el){return /назва на макеті/i.test(el.textContent||"");});
    if(!label || document.getElementById("rmCurtainIdHint")) return;
    var input=label.parentElement && label.parentElement.querySelector("input");
    if(!input) return;
    var hint=document.createElement("div");
    hint.id="rmCurtainIdHint";
    hint.style.cssText="font-size:11px;line-height:1.35;color:#64748b;font-weight:700;margin:5px 2px 0";
    hint.textContent="Це лише напис на кресленні. Кошторис рахується за прихованою привʼязкою до конкретної позиції номенклатури.";
    input.insertAdjacentElement("afterend",hint);
  }
  document.addEventListener("click",function(){setTimeout(addCurtainHint,20)},true);
})();
