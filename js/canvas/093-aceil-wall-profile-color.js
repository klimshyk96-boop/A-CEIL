(function(){
  "use strict";

  function wallMarksArr(){
    if(Array.isArray(window.wallMarks))return window.wallMarks;
    try{if(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))return wallMarks;}catch(error){window.__diagSilent&&window.__diagSilent(error);}
    return [];
  }

  function currentEditId(){
    return window._rwe2CurrentWallId||window._wallEditId||null;
  }

  function stopTap(event,prevent){
    if(!event)return;
    if(prevent&&event.cancelable)event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation==="function")event.stopImmediatePropagation();
  }

  window.__rwe2ProfileColor="";
  window.rwe2SetProfileColor=function(color){
    var chosen=color==="white"||color==="black"?color:"";
    window.__rwe2ProfileColor=chosen;
    var row=document.getElementById("rwe2ProfileColorButtons");
    if(row)row.querySelectorAll(".rwe-pcolor-btn").forEach(function(button){
      button.classList.toggle("active",(button.getAttribute("data-color")||"")===chosen);
    });
  };

  function bindProfileColorButton(button){
    if(!button||button.dataset.safeTap==="1")return;
    button.dataset.safeTap="1";
    var lastPick=0;
    function begin(event){stopTap(event,false);}
    function choose(event){
      stopTap(event,true);
      var now=Date.now();
      if(now-lastPick<250)return;
      lastPick=now;
      window.rwe2SetProfileColor(button.getAttribute("data-color")||"");
    }
    button.addEventListener("pointerdown",begin,{passive:false});
    button.addEventListener("touchstart",begin,{passive:false});
    button.addEventListener("mousedown",begin);
    button.addEventListener("pointerup",choose,{passive:false});
    button.addEventListener("touchend",choose,{passive:false});
    button.addEventListener("click",choose);
  }

  function ensureProfileColorUi(){
    var existing=document.getElementById("rwe2ProfileColorRow");
    if(existing){
      existing.querySelectorAll(".rwe-pcolor-btn").forEach(bindProfileColorButton);
      return existing;
    }
    var nameInput=document.getElementById("rwe2Name");
    if(!nameInput)return null;
    var wrap=document.createElement("div");
    wrap.id="rwe2ProfileColorRow";
    var label=document.createElement("label");
    label.className="rwe2-label";
    label.textContent="Колір профілю";
    var row=document.createElement("div");
    row.className="rwe-pcolor-row";
    row.id="rwe2ProfileColorButtons";
    row.innerHTML='<button type="button" class="rwe-pcolor-btn" data-color="white">⚪ Білий</button><button type="button" class="rwe-pcolor-btn" data-color="black">⚫ Чорний</button><button type="button" class="rwe-pcolor-btn" data-color="">Без кольору</button>';
    row.querySelectorAll(".rwe-pcolor-btn").forEach(bindProfileColorButton);
    wrap.appendChild(label);
    wrap.appendChild(row);
    nameInput.insertAdjacentElement("afterend",wrap);
    return wrap;
  }

  function colorFromName(typeText){
    try{if(typeof _colorWordFromName==="function")return _colorWordFromName(typeText);}catch(error){window.__diagSilent&&window.__diagSilent(error);}
    var name=String(typeText||"").trim().toLowerCase();
    if(/білі|білий|біла|біле|білого|білих/.test(name))return "white";
    if(/чорн/.test(name))return "black";
    return "";
  }

  window.A·CEIL.pipeline.get("openWallEditModal").stage("profileColor",{around:function(next,args){var id=args[0];
      var result=next();
      try{
        ensureProfileColorUi();
        var mark=wallMarksArr().find(function(item){return item&&item.id===id;});
        var color="";
        if(mark)color=mark.profileColor==="white"||mark.profileColor==="black"?mark.profileColor:colorFromName(mark.type);
        window.rwe2SetProfileColor(color);
      }catch(error){window.__diagSilent&&window.__diagSilent(error);}
      return result;
    }
  });
  function saveChosenProfileColor(id){
    try{
      var mark=wallMarksArr().find(function(item){return item&&item.id===id;});
      if(!mark)return;
      var chosen=window.__rwe2ProfileColor;
      mark.profileColor=chosen==="white"||chosen==="black"?chosen:"";
      if(typeof saveState==="function")saveState();
    }catch(error){window.__diagSilent&&window.__diagSilent(error);}
  }

  window.A·CEIL.pipeline.get("rwe2Save").stage("profileColor",{around:function(next,args){
      var id=currentEditId();
      var result=next();
      saveChosenProfileColor(id);
      return result;
    }
  });
window.A·CEIL.pipeline.get("saveWallEdit").stage("profileColor",{around:function(next){
      var id=currentEditId();
      var result=next();
      saveChosenProfileColor(id);
      return result;}});
})();
