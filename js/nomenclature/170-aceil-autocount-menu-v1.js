(function(){
  "use strict";
  if(window.__aceilAutocountMenuV1)return;
  window.__aceilAutocountMenuV1=true;

  function norm(v){
    return String(v==null?"":v).toLowerCase().replace(/[’'`\"]/g,"")
      .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
  }
  function gid(id){return document.getElementById(id);}
  function items(){
    try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.elemItems)?window.elemItems:[];
  }
  function marks(){
    try{if(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))return wallMarks;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.wallMarks)?window.wallMarks:[];
  }
  function points(){
    try{if(typeof pts!=="undefined"&&Array.isArray(pts))return pts;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.pts)?window.pts:[];
  }
  function sideLengthCm(index){
    try{if(typeof _sideLenCm==="function")return Number(_sideLenCm(index))||0;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    try{
      if(typeof lengths!=="undefined"&&Array.isArray(lengths)&&Number(lengths[index]))return Number(lengths[index]);
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return 0;
  }
  function isOverlayPvcCornice(mark){
    var n=norm(mark&&(mark.type||mark.name||mark.title));
    if(!n.includes("карниз")||!n.includes("пвх"))return false;
    return n.includes("наклад")||n.includes("звичайн")||n.includes("стельов")||n.includes("потолоч");
  }
  function itemColor(it){
    if(it&&(it.sourceVariant==="white"||it.sourceVariant==="black"))return it.sourceVariant;
    var n=norm(it&&it.name);
    return /(^| )біл/.test(n)?"white":/(^| )чорн/.test(n)?"black":"";
  }
  function markColor(mark){
    if(mark&&(mark.profileColor==="white"||mark.profileColor==="black"))return mark.profileColor;
    var n=norm(mark&&(mark.type||mark.name));
    return /(^| )біл/.test(n)?"white":/(^| )чорн/.test(n)?"black":"";
  }
  function eligibleCornices(color){
    return marks().filter(function(mark){
      var n=norm(mark&&(mark.type||mark.name||mark.title));
      if(!n.includes("карниз")||isOverlayPvcCornice(mark))return false;
      return !color||markColor(mark)===color;
    });
  }
  function corniceTopology(color){
    var list=eligibleCornices(color),vertices=points(),count=vertices.length,tolerance=3,corners=0;
    if(count>1){
      for(var i=0;i<count;i++){
        var prev=(i-1+count)%count,next=i;
        var prevTouches=list.some(function(mark){
          if(Number(mark.sideIndex)!==prev)return false;
          var side=sideLengthCm(prev),end=Number(mark.offsetCm||0)+Number(mark.lenCm||0);
          return side>0&&Math.abs(side-end)<=tolerance;
        });
        var nextTouches=list.some(function(mark){
          return Number(mark.sideIndex)===next&&Number(mark.offsetCm||0)<=tolerance;
        });
        if(prevTouches&&nextTouches)corners++;
      }
    }
    return {corners:corners,breaks:Math.max(0,2*list.length-2*corners)};
  }
  function correctCorniceRules(render){
    var changed=false;
    items().forEach(function(it){
      var source=norm(it&&it.source);
      if(source!=="cornice break"&&source!=="cornice corners")return;
      var top=corniceTopology(itemColor(it));
      var qty=source==="cornice break"?top.breaks:top.corners;
      if(Number(it.qty)!==qty||it.unit!=="шт")changed=true;
      it.qty=qty;it.unit="шт";it.autoFilled=true;it.autoZero=qty===0;
      it.autoRuleNote="Накладний ПВХ карниз не враховується";
    });
    if(changed&&render!==false){
      try{if(typeof renderElemList==="function")renderElemList();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{if(typeof updateElemBadge==="function")updateElemBadge();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{if(typeof recalcElemTotal==="function")recalcElemTotal();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    }
    return changed;
  }
  window.A·CEILCorrectCorniceAutoCount=correctCorniceRules;

  var previousAuto=window.autoFillNomenclature;
  if(typeof previousAuto==="function"&&!previousAuto.__pvcCorniceFixed){
    var wrappedAuto=function(){
      var result=previousAuto.apply(this,arguments);
      correctCorniceRules(true);
      return result;
    };
    wrappedAuto.__pvcCorniceFixed=true;
    window.autoFillNomenclature=wrappedAuto;
    try{autoFillNomenclature=wrappedAuto;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  var LABELS={
    "":"Без окремого правила — визначати за назвою",
    full_perimeter:"Повний периметр",
    main_profile:"Основний профіль — периметр із відніманнями",
    white_insert:"Біла вставка — залишок периметра",
    total_area:"Площа кімнати",
    corners:"Звичайні кути",
    hidden_curtain:"Карниз — загальна довжина",
    cornice_corners:"Прихований карниз — кути",
    cornice_break:"Прихований карниз — обриви",
    floating_profile:"Парящий профіль — довжина",
    floating_corners:"Парящий профіль — кути",
    shadow_profile:"Тіньовий профіль — довжина",
    shadow_corners:"Тіньовий профіль — кути",
    profile_beam:"Профіль-брус — довжина",
    curve_length:"Криволінійні ділянки — довжина",
    spot_light:"Точкові світильники",
    chandelier:"Люстри",
    ventilation:"Витяжки та вентиляція",
    linear_length:"Світлова лінія — довжина",
    linear_corner:"Світлова лінія — кути",
    linear_break:"Світлова лінія — обриви"
  };
  var GROUPS={
    manual:{title:"Ручний режим",keys:[""]},
    base:{title:"Основне",keys:["full_perimeter","main_profile","white_insert","total_area","corners"]},
    wall:{title:"Елементи стін",keys:["hidden_curtain","cornice_corners","cornice_break","floating_profile","floating_corners","shadow_profile","shadow_corners","profile_beam","curve_length"]},
    light:{title:"Світло",keys:["spot_light","chandelier","ventilation"]},
    linear:{title:"Лінійні елементи",keys:["linear_length","linear_corner","linear_break"]},
    plan:{title:"Елементи з плану",keys:[]},
    other:{title:"Інше",keys:[]}
  };
  function sourceFromButton(button){
    if(button.dataset&&button.dataset.aceilSource!=null)return button.dataset.aceilSource;
    var raw=button.getAttribute("onclick")||"",match=raw.match(/chooseQuickSource\(['\"]([^'\"]*)['\"]\)/);
    return match?match[1]:null;
  }
  function categoryFor(source,isDynamic){
    if(isDynamic)return "plan";
    var names=Object.keys(GROUPS);
    for(var i=0;i<names.length;i++)if(GROUPS[names[i]].keys.indexOf(source)>=0)return names[i];
    return "other";
  }
  function addMissingButton(list,source){
    if(list.querySelector('[data-aceil-source="'+source+'"]'))return;
    var exists=Array.prototype.some.call(list.querySelectorAll(".qs-btn"),function(b){return sourceFromButton(b)===source;});
    if(exists)return;
    var b=document.createElement("button");b.type="button";b.className="qs-btn";b.dataset.aceilSource=source;
    b.innerHTML="<span>▱ "+LABELS[source]+"</span>";
    b.addEventListener("click",function(){if(typeof window.chooseQuickSource==="function")window.chooseQuickSource(source);});
    list.appendChild(b);
  }
  function organizeSourceMenu(){
    var list=gid("quickSourceList");if(!list)return;
    addMissingButton(list,"white_insert");
    var all=Array.prototype.slice.call(list.querySelectorAll(".qs-btn"));if(!all.length)return;
    var currentGroup="",itemName=norm(gid("quickSourceItemName")&&gid("quickSourceItemName").textContent),buckets={};
    Object.keys(GROUPS).forEach(function(k){buckets[k]=[];});
    all.forEach(function(button){
      var source=sourceFromButton(button),dynamic=source==null;
      if(source!=null){
        button.dataset.aceilSource=source;
        var span=button.querySelector("span");if(span&&LABELS[source])span.textContent=(source==="cornice_break"?"▤✂️ ":source==="cornice_corners"?"▤📐 ":"")+LABELS[source];
      }
      var cat=categoryFor(source,dynamic);buckets[cat].push(button);
      if(button.classList.contains("active"))currentGroup=cat;
    });
    if(!currentGroup){
      if(/карниз|профіл|тінь|парящ|брус/.test(itemName))currentGroup="wall";
      else if(/світ|люстр|витяж|вентиляц/.test(itemName))currentGroup="light";
      else if(/ліні|трек/.test(itemName))currentGroup="linear";
      else currentGroup="base";
    }
    list.innerHTML="";
    Object.keys(GROUPS).forEach(function(key){
      if(!buckets[key].length)return;
      var details=document.createElement("details");details.className="acsrc-group";details.open=key===currentGroup||key==="manual";
      var summary=document.createElement("summary");summary.textContent=GROUPS[key].title+" · "+buckets[key].length;details.appendChild(summary);
      var body=document.createElement("div");body.className="acsrc-options";buckets[key].forEach(function(b){body.appendChild(b);});details.appendChild(body);
      if(key==="wall"){
        var note=document.createElement("div");note.className="acsrc-note";
        note.textContent="Накладний ПВХ карниз рахується лише по довжині. Обриви й спеціальні кути — тільки для прихованих систем.";
        body.appendChild(note);
      }
      list.appendChild(details);
    });
  }

  var previousQuick=window.openQuickSourceMenu;
  if(typeof previousQuick==="function"&&!previousQuick.__organizedV1){
    var wrappedQuick=function(){var result=previousQuick.apply(this,arguments);setTimeout(organizeSourceMenu,0);return result;};
    wrappedQuick.__organizedV1=true;window.openQuickSourceMenu=wrappedQuick;
    try{openQuickSourceMenu=wrappedQuick;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  setTimeout(function(){correctCorniceRules(false);},500);
})();
