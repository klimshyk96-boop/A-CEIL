(function(){
  "use strict";
  if(window.__aceilAutocountMenuV1)return;
  window.__aceilAutocountMenuV1=true;

  function norm(v){
    return String(v==null?"":v).toLowerCase().replace(/[’'`\"]/g,"")
      .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
  }
  function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})}
  function gid(id){return document.getElementById(id);}
  function autoCountEnabled(){
    try{return !window.A_CEIL_AutoCount||typeof window.A_CEIL_AutoCount.isEnabled!=="function"||window.A_CEIL_AutoCount.isEnabled()}catch(e){return true}
  }
  function items(){
    try{if(typeof elemItems!=="undefined"&&Array.isArray(elemItems))return elemItems;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.elemItems)?window.elemItems:[];
  }
  function groups(){
    try{if(typeof elemGroups!=="undefined"&&Array.isArray(elemGroups))return elemGroups;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.elemGroups)?window.elemGroups:[];
  }
  function marks(){
    try{if(typeof wallMarks!=="undefined"&&Array.isArray(wallMarks))return wallMarks;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.wallMarks)?window.wallMarks:[];
  }
  function points(){
    try{if(typeof pts!=="undefined"&&Array.isArray(pts))return pts;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.pts)?window.pts:[];
  }
  function lightMarksList(){
    try{if(typeof lightMarks!=="undefined"&&Array.isArray(lightMarks))return lightMarks;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.lightMarks)?window.lightMarks:[];
  }
  function linearList(){
    try{if(typeof linearElements!=="undefined"&&Array.isArray(linearElements))return linearElements;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return Array.isArray(window.linearElements)?window.linearElements:[];
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
    if(!n.includes("карниз"))return false;
    var special=/прихован|ніша|нішев|профіл|алюм|інтегрован|вбудован|гардин/.test(n);
    if(special)return false;
    return n.includes("пвх")||/наклад|звичайн|стельов|потолоч/.test(n);
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
  function topologyFor(list){
    var vertices=points(),count=vertices.length,tolerance=3,corners=0,breaks=0;
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
    list.forEach(function(mark){
      if(!mark)return;
      if(mark.forceBreaks===true){breaks+=2;return;}
      if(mark.anchor==="full")return;
      var side=sideLengthCm(Number(mark.sideIndex)||0);
      if(!(side>0)){breaks+=2;return;}
      var start=Number(mark.offsetCm)||0,end=start+(Number(mark.lenCm)||0);
      if(start>tolerance)breaks++;
      if(end<side-tolerance)breaks++;
    });
    return {corners:corners,breaks:breaks};
  }
  function corniceTopology(color){return topologyFor(eligibleCornices(color))}

  var RULE_KEY="A_CEIL_custom_auto_rules_v1",customRules=[],rulesUpdatedAt=0,_customMenuItemId=null,_editingRuleId=null;
  function cleanRule(rule){
    var scopes=["room","wall","light","linear"],ops=["perimeter","area","length","count","corners","breaks"];
    if(!rule||!rule.id||!rule.name||scopes.indexOf(rule.scope)<0||ops.indexOf(rule.operation)<0)return null;
    var factor=Number(rule.factor);if(!isFinite(factor)||factor<=0)factor=1;
    return {id:String(rule.id),name:String(rule.name).trim(),scope:rule.scope,operation:rule.operation,match:String(rule.match||"").trim(),exclude:String(rule.exclude||"").trim(),color:["white","black"].indexOf(rule.color)>=0?rule.color:"",factor:factor,excludeOverlayPvc:rule.excludeOverlayPvc!==false};
  }
  function readRuleSnapshot(){
    var best=null;
    try{var local=JSON.parse(localStorage.getItem(RULE_KEY)||"null");if(local&&Array.isArray(local.rules))best=local}catch(e){}
    groups().forEach(function(g){var snap=g&&g._aceilAutoRules;if(snap&&Array.isArray(snap.rules)&&(!best||Number(snap.updatedAt)>Number(best.updatedAt)))best=snap});
    return best;
  }
  function embedRules(){
    if(!customRules.length&&!rulesUpdatedAt)return;
    var snap={updatedAt:rulesUpdatedAt,rules:customRules.map(function(r){return Object.assign({},r)})};
    groups().forEach(function(g){if(g)g._aceilAutoRules=snap});
  }
  function loadRules(){
    var snap=readRuleSnapshot();if(!snap)return;
    if(Number(snap.updatedAt)<rulesUpdatedAt)return;
    customRules=snap.rules.map(cleanRule).filter(Boolean);rulesUpdatedAt=Number(snap.updatedAt)||0;
    try{localStorage.setItem(RULE_KEY,JSON.stringify({updatedAt:rulesUpdatedAt,rules:customRules}))}catch(e){}
    embedRules();
  }
  function saveRules(){
    rulesUpdatedAt=Date.now();embedRules();
    try{localStorage.setItem(RULE_KEY,JSON.stringify({updatedAt:rulesUpdatedAt,rules:customRules}))}catch(e){}
    try{if(typeof saveState==="function")saveState()}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  function textOfMark(mark){return norm(mark&&(mark.type||mark.name||mark.title||mark.label))}
  function ruleMatches(text,rule){var n=norm(text),wanted=norm(rule.match),excluded=norm(rule.exclude);return (!wanted||n.includes(wanted))&&(!excluded||!n.includes(excluded))}
  function roomPerimeterM(){
    try{if(typeof lengths!=="undefined"&&Array.isArray(lengths)&&lengths.length)return Math.round(lengths.reduce(function(s,v){return s+(Number(v)||0)},0))/100}catch(e){}
    var el=gid("per"),v=Number(String(el&&el.textContent||"0").replace(",","."));return isFinite(v)?v:0;
  }
  function roomAreaM2(){var el=gid("area"),v=Number(String(el&&el.textContent||"0").replace(",","."));return isFinite(v)?v:0}
  function roomCorners(){var a=Number(gid("inCorners")&&gid("inCorners").textContent)||0,b=Number(gid("outCorners")&&gid("outCorners").textContent)||0;return a+b}
  function lightLabel(mark){
    var type=String(mark&&mark.type||"");
    try{var arr=typeof lightTypes!=="undefined"&&Array.isArray(lightTypes)?lightTypes:(window.lightTypes||[]),found=arr.find(function(t){return t&&String(t.id)===type});return type+" "+String(found&&found.label||"")}catch(e){return type}
  }
  function linearLabel(el){return String(el&&(el.label||el.name||el.elementType)||"")}
  function computeCustom(rule){
    var qty=0,unit="шт";
    if(rule.scope==="room"){
      if(rule.operation==="area"){qty=roomAreaM2();unit="м²"}
      else if(rule.operation==="corners"||rule.operation==="count"){qty=roomCorners();unit="шт"}
      else{qty=roomPerimeterM();unit="м"}
    }else if(rule.scope==="wall"){
      var wall=marks().filter(function(m){return ruleMatches(textOfMark(m),rule)&&(!rule.color||markColor(m)===rule.color)&&(!(rule.excludeOverlayPvc&&(rule.operation==="breaks"||rule.operation==="corners"))||!isOverlayPvcCornice(m))});
      if(rule.operation==="length"){qty=wall.reduce(function(s,m){return s+(Number(m&&m.lenCm)||0)},0)/100;unit="м"}
      else if(rule.operation==="corners"){qty=topologyFor(wall).corners;unit="шт"}
      else if(rule.operation==="breaks"){qty=topologyFor(wall).breaks;unit="шт"}
      else{qty=wall.length;unit="шт"}
    }else if(rule.scope==="light"){
      qty=lightMarksList().filter(function(m){return ruleMatches(lightLabel(m),rule)}).length;unit="шт";
    }else if(rule.scope==="linear"){
      var lines=linearList().filter(function(el){return ruleMatches(linearLabel(el),rule)});
      if(rule.operation==="length"){qty=lines.reduce(function(s,el){var v=Number(el&&el.totalLengthCm);if(!isFinite(v))v=(Array.isArray(el&&el.segments)?el.segments:[]).reduce(function(a,b){return a+(Number(b)||0)},0);return s+(v||0)},0)/100;unit="м"}
      else if(rule.operation==="corners"){qty=lines.reduce(function(s,el){return s+(Number(el&&el.cornerCount)||0)},0);unit="шт"}
      else if(rule.operation==="breaks"){qty=lines.reduce(function(s,el){return s+(Number(el&&el.breakCount)||((el&&el.shape)==="rectangle"?0:2))},0);unit="шт"}
      else{qty=lines.length;unit="шт"}
    }
    qty=Math.round(qty*Number(rule.factor||1)*100)/100;
    return {qty:qty,unit:unit};
  }
  function applyCustomRules(render){
    if(!autoCountEnabled())return false;
    loadRules();var changed=false;
    items().forEach(function(it){
      var source=String(it&&it.source||"");if(!source.startsWith("custom:")||it.manualQtyOverride===true)return;
      var rule=customRules.find(function(r){return "custom:"+r.id===source});if(!rule)return;
      var value=computeCustom(rule);if(Number(it.qty)!==value.qty||it.unit!==value.unit)changed=true;
      it.qty=value.qty;it.unit=value.unit;it.autoFilled=true;it.autoZero=value.qty===0;it.autoRuleNote="Моє правило: "+rule.name;
    });
    if(changed&&render!==false){
      try{if(typeof renderElemList==="function")renderElemList()}catch(e){}
      try{if(typeof updateElemBadge==="function")updateElemBadge()}catch(e){}
      try{if(typeof recalcElemTotal==="function")recalcElemTotal()}catch(e){}
    }
    return changed;
  }
  window.A_CEIL_CustomAutoRules={list:function(){loadRules();return customRules.slice()},apply:applyCustomRules};
  function correctCorniceRules(render){
    if(!autoCountEnabled())return false;
    var changed=false;
    items().forEach(function(it){
      var source=norm(it&&it.source);
      if(it.manualQtyOverride===true||(source!=="cornice break"&&source!=="cornice corners"))return;
      var top=corniceTopology(itemColor(it));
      var qty=source==="cornice break"?top.breaks:top.corners;
      if(Number(it.qty)!==qty||it.unit!=="шт")changed=true;
      it.qty=qty;it.unit="шт";it.autoFilled=true;it.autoZero=qty===0;
      it.autoRuleNote="Кути й обриви: лише приховані/профільні карнизи; накладний ПВХ виключено";
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
      if(!autoCountEnabled())return 0;
      var result=previousAuto.apply(this,arguments);
      applyCustomRules(false);
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
    hidden_curtain:"Карниз — довжина всіх типів",
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
  var NOTES={
    "":"Кількість вводиться вручну або визначається за точною назвою",
    full_perimeter:"Увесь периметр кімнати · м",
    main_profile:"Периметр мінус парящий, тіньовий та інші задані профілі · м",
    white_insert:"Залишок периметра після профілів без вставки · м",
    total_area:"Площа побудованої кімнати · м²",
    corners:"Кути кімнати після віднімання спеціальних кутів · шт",
    hidden_curtain:"Сума довжин усіх карнизів на стінах · м",
    cornice_corners:"Тільки стики прихованих/профільних карнизів · шт",
    cornice_break:"Тільки вільні кінці прихованих/профільних карнизів · шт",
    floating_profile:"Сума довжин парящого профілю · м",
    floating_corners:"Кінці парящого профілю у кутах · шт",
    shadow_profile:"Сума довжин тіньового профілю · м",
    shadow_corners:"Кінці тіньового профілю у кутах · шт",
    profile_beam:"Сума довжин профілю-бруса · м",
    curve_length:"Сума довжин дуг · м",
    spot_light:"Кількість точкових світильників на плані · шт",
    chandelier:"Кількість люстр на плані · шт",
    ventilation:"Кількість витяжок і вентиляційних елементів · шт",
    linear_length:"Сумарна довжина лінійного елемента · м",
    linear_corner:"Кути лінійного елемента · шт",
    linear_break:"Вільні кінці лінійного елемента · шт"
  };
  var GROUPS={
    recommended:{title:"Підходить для цієї позиції",keys:[]},
    manual:{title:"Ручне значення",keys:[""]},
    custom:{title:"Мої правила",keys:[]},
    base:{title:"Кімната: площа, периметр і кути",keys:["full_perimeter","main_profile","white_insert","total_area","corners"]},
    wall:{title:"Стіни: карнизи та профілі",keys:["hidden_curtain","cornice_corners","cornice_break","floating_profile","floating_corners","shadow_profile","shadow_corners","profile_beam","curve_length"]},
    light:{title:"Світло та вентиляція",keys:["spot_light","chandelier","ventilation"]},
    linear:{title:"Лінії та треки",keys:["linear_length","linear_corner","linear_break"]},
    plan:{title:"Конкретний елемент із плану",keys:[]},
    other:{title:"Інші правила",keys:[]}
  };
  function sourceFromButton(button){
    if(button.dataset&&button.dataset.aceilSource!=null)return button.dataset.aceilSource;
    var raw=button.getAttribute("onclick")||"",match=raw.match(/chooseQuickSource\(['\"]([^'\"]*)['\"]\)/);
    return match?match[1]:null;
  }
  function categoryFor(source,isDynamic){
    if(String(source||"").startsWith("custom:"))return "custom";
    if(String(source||"").startsWith("walltype:" )||String(source||"").startsWith("walltypecolor:"))return "wall";
    if(String(source||"").startsWith("lighttype:"))return "light";
    if(/^(lineartype|linearcorners|linearfixtures|linearbreaks|lineartrack):/.test(String(source||"")))return "linear";
    if(isDynamic)return "plan";
    var names=Object.keys(GROUPS);
    for(var i=0;i<names.length;i++)if(GROUPS[names[i]].keys.indexOf(source)>=0)return names[i];
    return "other";
  }
  function recommendationScore(itemName,source,text,active){
    if(active)return 1000;
    var name=norm(itemName),label=norm(text);if(!name||!label)return 0;
    var overlay=/карниз/.test(name)&&/пвх|наклад|стельов/.test(name);
    if(overlay&&(source==="cornice_break"||source==="cornice_corners"))return -100;
    var stop={білий:1,біла:1,білі:1,чорний:1,чорна:1,чорні:1,кількість:1,довжина:1,всі:1,кольори:1,профіль:1,елемент:1};
    var tokens=name.split(" ").filter(function(w){return w.length>=3&&!stop[w]}),matched=tokens.filter(function(w){return label.includes(w)}).length;
    var score=tokens.length?Math.round(60*matched/tokens.length):0;
    if(name.includes("карниз")&&source==="hidden_curtain")score+=35;
    if(!overlay&&name.includes("карниз")&&(source==="cornice_break"||source==="cornice_corners"))score+=20;
    if(name.includes("люстр")&&source==="chandelier")score+=45;
    if(/точков|світиль/.test(name)&&source==="spot_light")score+=45;
    if(/витяж|вентиляц/.test(name)&&source==="ventilation")score+=45;
    if(/площа|полотно|плів/.test(name)&&source==="total_area")score+=35;
    if(/периметр|профіл/.test(name)&&source==="main_profile")score+=20;
    if(/білий|біла|білі/.test(name)&&/чорний|чорна|чорні/.test(label))score-=35;
    if(/чорний|чорна|чорні/.test(name)&&/білий|біла|білі/.test(label))score-=35;
    if(String(source||"").startsWith("walltype")&&name.includes("карниз")&&label.includes("карниз"))score+=15;
    if(String(source||"").startsWith("lighttype")&&matched)score+=15;
    if(String(source||"").startsWith("lineartype")&&matched)score+=15;
    return score;
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
  function ruleSummary(rule){
    var scope={room:"Кімната",wall:"Елементи стін",light:"Світло",linear:"Лінії"}[rule.scope]||rule.scope;
    var op={perimeter:"периметр",area:"площа",length:"довжина",count:"кількість",corners:"кути",breaks:"обриви"}[rule.operation]||rule.operation;
    var parts=[scope+" · "+op];if(rule.match)parts.push("містить «"+rule.match+"»");if(rule.factor!==1)parts.push("×"+rule.factor);return parts.join(" · ");
  }
  function addCustomRuleButtons(list){
    loadRules();var current=items().find(function(it){return it&&String(it.id)===String(_customMenuItemId)}),currentSource=String(current&&current.source||"");
    customRules.forEach(function(rule){
      var source="custom:"+rule.id,b=document.createElement("button");b.type="button";b.className="qs-btn acsrc-custom-rule"+(currentSource===source?" active":"");b.dataset.aceilSource=source;
      b.innerHTML='<span class="acsrc-label"><b>🧩 '+esc(rule.name)+'</b><small>'+esc(ruleSummary(rule))+'</small></span><span class="acsrc-rule-edit" role="button" aria-label="Редагувати правило">✏️</span>';
      b.addEventListener("click",function(){if(typeof window.chooseQuickSource==="function")window.chooseQuickSource(source)});
      var edit=b.querySelector(".acsrc-rule-edit");edit.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();openRuleModal(rule.id)});
      list.appendChild(b);
    });
  }
  function organizeSourceMenu(){
    var list=gid("quickSourceList");if(!list)return;
    installTouchScroll(list);
    addMissingButton(list,"white_insert");
    addCustomRuleButtons(list);
    var all=Array.prototype.slice.call(list.querySelectorAll(".qs-btn"));if(!all.length)return;
    var currentGroup="",itemName=norm(gid("quickSourceItemName")&&gid("quickSourceItemName").textContent),buckets={},records=[];
    Object.keys(GROUPS).forEach(function(k){buckets[k]=[];});
    all.forEach(function(button){
      var source=sourceFromButton(button),dynamic=source==null;
      if(source!=null){
        button.dataset.aceilSource=source;
        var span=button.querySelector("span");
        if(span&&LABELS[source]){
          var icon=source==="cornice_break"?"▤✂️":source==="cornice_corners"?"▤📐":"";
          span.className="acsrc-label";
          span.innerHTML="<b>"+(icon?icon+" ":"")+LABELS[source]+"</b><small>"+(NOTES[source]||"")+"</small>";
        }else if(span&&/^(walltype|walltypecolor|lighttype|lineartype):/.test(String(source))){
          var exactText=span.textContent.trim();span.className="acsrc-label";
          span.innerHTML="<b>"+esc(exactText)+"</b><small>Точна прив’язка до цього типу на плані</small>";
        }
      }else{
        var dynamicSpan=button.querySelector("span");
        if(dynamicSpan){
          var dynamicText=dynamicSpan.textContent.trim();
          dynamicSpan.className="acsrc-label";
          dynamicSpan.innerHTML="<b>"+esc(dynamicText)+"</b><small>Точна прив’язка до вибраного елемента на плані</small>";
        }
      }
      button.dataset.aceilSearch=norm(button.textContent);
      var cat=categoryFor(source,dynamic),active=button.classList.contains("active"),score=recommendationScore(itemName,source,button.textContent,active);
      records.push({button:button,source:source,category:cat,active:active,score:score});
    });
    var suggestedGroup=/карниз|профіл|тінь|парящ|брус/.test(itemName)?"wall":/світ|люстр|витяж|вентиляц/.test(itemName)?"light":/ліні|трек/.test(itemName)?"linear":"base";
    var recommended=records.filter(function(r){return r.source!==""&&r.score>=35}).sort(function(a,b){return b.score-a.score}).slice(0,6);
    records.forEach(function(r){
      var cat=recommended.indexOf(r)>=0?"recommended":r.category;buckets[cat].push(r.button);
      if(r.active)currentGroup=cat;
    });
    if(!currentGroup)currentGroup=buckets.recommended.length?"recommended":suggestedGroup;
    list.innerHTML="";
    var help=document.createElement("div");help.className="acsrc-help";
    help.innerHTML="<div><b>Що повинна рахувати ця позиція?</b><span>Оберіть одне джерело. Після змін на плані кількість оновлюється автоматично.</span></div><button type=\"button\" class=\"acsrc-create\">＋ Своє правило</button>";
    help.querySelector(".acsrc-create").addEventListener("click",function(){openRuleModal(null)});
    list.appendChild(help);
    var search=document.createElement("input");search.type="search";search.className="acsrc-search";search.placeholder="Пошук правила: карниз, площа, світло…";list.appendChild(search);
    var order=["recommended","manual","custom",currentGroup].concat(Object.keys(GROUPS)).filter(function(key,index,self){return self.indexOf(key)===index;});
    order.forEach(function(key){
      if(!buckets[key].length)return;
      var details=document.createElement("details");details.className="acsrc-group";details.open=key===currentGroup||key==="recommended"&&buckets.recommended.length>0;
      details.dataset.aceilGroup=key;
      var summary=document.createElement("summary");summary.innerHTML="<span>"+GROUPS[key].title+"</span><em>"+buckets[key].length+(key==="recommended"?" · рекомендовано":"")+"</em>";details.appendChild(summary);
      var body=document.createElement("div");body.className="acsrc-options";buckets[key].forEach(function(b){body.appendChild(b);});details.appendChild(body);
      if(key==="wall"){
        var note=document.createElement("div");note.className="acsrc-note";
        note.textContent="Накладний ПВХ карниз рахується лише по довжині. Обриви й спеціальні кути — тільки для прихованих систем.";
        body.appendChild(note);
      }
      list.appendChild(details);
    });
    search.addEventListener("input",function(){
      var q=norm(search.value),groups=Array.prototype.slice.call(list.querySelectorAll(".acsrc-group"));
      groups.forEach(function(group){
        var visible=0;
        Array.prototype.forEach.call(group.querySelectorAll(".qs-btn"),function(button){
          var show=!q||String(button.dataset.aceilSearch||"").includes(q);button.hidden=!show;if(show)visible++;
        });
        group.hidden=visible===0;if(q&&visible)group.open=true;
      });
    });
  }

  // Keep the gesture inside the source list, but let Safari/PWA perform its
  // native inertial scrolling. A previous manual scrollTop + preventDefault
  // implementation made the list immovable on recent iOS versions.
  function installTouchScroll(list){
    if(!list||list.dataset.aceilTouchScroll==="1")return;
    list.dataset.aceilTouchScroll="1";
    list.style.webkitOverflowScrolling="touch";
    list.style.touchAction="pan-y";
    list.addEventListener("touchstart",function(ev){ev.stopPropagation()},{passive:true});
    list.addEventListener("touchmove",function(ev){ev.stopPropagation()},{passive:true});
  }

  var quickSourcePageLock=null;
  function setQuickSourcePageLocked(locked){
    if(locked){
      if(quickSourcePageLock)return;
      var body=document.body,y=window.scrollY||window.pageYOffset||0;
      quickSourcePageLock={y:y,position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,width:body.style.width,overflow:body.style.overflow};
      body.style.position="fixed";body.style.top=(-y)+"px";body.style.left="0";body.style.right="0";body.style.width="100%";body.style.overflow="hidden";
      return;
    }
    if(!quickSourcePageLock)return;
    var saved=quickSourcePageLock;quickSourcePageLock=null;
    document.body.style.position=saved.position;document.body.style.top=saved.top;document.body.style.left=saved.left;document.body.style.right=saved.right;document.body.style.width=saved.width;document.body.style.overflow=saved.overflow;
    window.scrollTo(0,saved.y);
  }
  function installQuickSourcePageLock(){
    var modal=gid("quickSourceModal");if(!modal||modal.dataset.aceilPageLock==="1")return;
    modal.dataset.aceilPageLock="1";
    new MutationObserver(function(){setQuickSourcePageLocked(modal.classList.contains("open"))}).observe(modal,{attributes:true,attributeFilter:["class"]});
  }

  var OP_OPTIONS={
    room:[["perimeter","Периметр"],["area","Площа"],["corners","Кількість кутів"]],
    wall:[["length","Сума довжин"],["count","Кількість елементів"],["corners","З’єднані кути"],["breaks","Вільні кінці / обриви"]],
    light:[["count","Кількість елементів"]],
    linear:[["length","Сума довжин"],["count","Кількість елементів"],["corners","Кути"],["breaks","Обриви"]]
  };
  function ensureRuleModal(){
    if(gid("acRuleModal"))return;
    var overlay=document.createElement("div");overlay.id="acRuleModal";overlay.className="modal-overlay ac-rule-modal";
    overlay.innerHTML='<div class="modal ac-rule-card"><div class="ac-rule-head"><div><h3>🧩 Власне правило</h3><p>Без програмування — лише джерело, умова та дія</p></div><button type="button" class="ac-rule-x">×</button></div><label>Назва правила</label><input id="acRuleName" placeholder="Наприклад: Обриви прихованого карниза"><div class="ac-rule-grid"><div><label>Джерело</label><select id="acRuleScope"><option value="room">Кімната</option><option value="wall">Елементи стін</option><option value="light">Світло</option><option value="linear">Лінії та треки</option></select></div><div><label>Що рахувати</label><select id="acRuleOperation"></select></div></div><div id="acRuleFilters"><label>Назва або тип містить</label><input id="acRuleMatch" placeholder="Наприклад: прихований карниз"><label>Не враховувати, якщо містить</label><input id="acRuleExclude" placeholder="Наприклад: накладний"><div class="ac-rule-grid"><div><label>Колір профілю</label><select id="acRuleColor"><option value="">Будь-який</option><option value="white">Білий</option><option value="black">Чорний</option></select></div><div><label>Коефіцієнт</label><input id="acRuleFactor" type="number" inputmode="decimal" min="0.01" step="0.01" value="1"></div></div><label class="ac-rule-check"><input id="acRuleNoPvc" type="checkbox" checked><span>Не рахувати накладний ПВХ у кутах та обривах</span></label></div><div class="ac-rule-preview" id="acRulePreview"></div><div class="ac-rule-actions"><button type="button" id="acRuleDelete" class="danger">Видалити</button><button type="button" class="secondary" id="acRuleCancel">Скасувати</button><button type="button" id="acRuleSave">Зберегти</button></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector(".ac-rule-x").onclick=closeRuleModal;gid("acRuleCancel").onclick=closeRuleModal;gid("acRuleSave").onclick=saveRuleFromModal;gid("acRuleDelete").onclick=deleteRuleFromModal;
    gid("acRuleScope").addEventListener("change",function(){fillRuleOperations();refreshRuleForm()});
    ["acRuleOperation","acRuleName","acRuleMatch","acRuleExclude","acRuleColor","acRuleFactor","acRuleNoPvc"].forEach(function(id){gid(id).addEventListener("input",refreshRuleForm);gid(id).addEventListener("change",refreshRuleForm)});
    overlay.addEventListener("click",function(ev){if(ev.target===overlay)closeRuleModal()});
  }
  function fillRuleOperations(selected){
    var scope=gid("acRuleScope").value,select=gid("acRuleOperation"),options=OP_OPTIONS[scope]||OP_OPTIONS.wall;
    select.innerHTML=options.map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join("");
    if(selected&&options.some(function(o){return o[0]===selected}))select.value=selected;
  }
  function refreshRuleForm(){
    if(!gid("acRuleModal"))return;
    var scope=gid("acRuleScope").value,operation=gid("acRuleOperation").value,isRoom=scope==="room",isWall=scope==="wall";
    gid("acRuleFilters").classList.toggle("room-source",isRoom);
    gid("acRuleColor").closest("div").hidden=!isWall;
    gid("acRuleNoPvc").closest("label").hidden=!(isWall&&(operation==="corners"||operation==="breaks"));
    var draft={scope:scope,operation:operation,match:gid("acRuleMatch").value,exclude:gid("acRuleExclude").value,factor:Number(gid("acRuleFactor").value)||1};
    gid("acRulePreview").textContent="Результат: "+ruleSummary(draft);
  }
  function openRuleModal(id){
    ensureRuleModal();loadRules();_editingRuleId=id||null;
    var rule=id?customRules.find(function(r){return r.id===id}):null;
    gid("acRuleName").value=rule?rule.name:"";gid("acRuleScope").value=rule?rule.scope:"wall";fillRuleOperations(rule&&rule.operation);
    gid("acRuleMatch").value=rule?rule.match:"";gid("acRuleExclude").value=rule?rule.exclude:"";gid("acRuleColor").value=rule?rule.color:"";gid("acRuleFactor").value=rule?rule.factor:1;gid("acRuleNoPvc").checked=rule?rule.excludeOverlayPvc!==false:true;
    gid("acRuleDelete").hidden=!rule;refreshRuleForm();gid("acRuleModal").classList.add("open");setTimeout(function(){gid("acRuleName").focus()},60);
  }
  function closeRuleModal(){var modal=gid("acRuleModal");if(modal)modal.classList.remove("open");_editingRuleId=null}
  function saveRuleFromModal(){
    var name=gid("acRuleName").value.trim();if(!name){gid("acRuleName").focus();return}
    var raw={id:_editingRuleId||("r"+Date.now()),name:name,scope:gid("acRuleScope").value,operation:gid("acRuleOperation").value,match:gid("acRuleMatch").value,exclude:gid("acRuleExclude").value,color:gid("acRuleColor").value,factor:Number(gid("acRuleFactor").value)||1,excludeOverlayPvc:gid("acRuleNoPvc").checked},rule=cleanRule(raw);if(!rule)return;
    var index=customRules.findIndex(function(r){return r.id===rule.id});if(index>=0)customRules[index]=rule;else customRules.push(rule);saveRules();closeRuleModal();
    if(_customMenuItemId!=null&&typeof window.openQuickSourceMenu==="function")setTimeout(function(){window.openQuickSourceMenu(_customMenuItemId)},0);
  }
  function deleteRuleFromModal(){
    if(!_editingRuleId)return;var source="custom:"+_editingRuleId;customRules=customRules.filter(function(r){return r.id!==_editingRuleId});items().forEach(function(it){if(String(it&&it.source||"")===source){it.source="";it.qty=0;it.autoFilled=false;it.autoZero=false}});saveRules();closeRuleModal();
    if(_customMenuItemId!=null&&typeof window.openQuickSourceMenu==="function")setTimeout(function(){window.openQuickSourceMenu(_customMenuItemId)},0);
  }
  window.A_CEIL_openCustomAutoRule=function(){openRuleModal(null)};

  // The source select remains the canonical value consumed by saveElemEdit.
  // These three dependent selects are a view over its existing options.
  var editId=null,editCatalog=[];
  var EDIT_CATEGORIES={base:"Кімната та полотно",wall:"Профілі та карнизи",linear:"Лінійне освітлення",light:"Світильники та інші елементи",other:"Додаткові правила"};
  var EDIT_SOURCES={
    full_perimeter:["base","Периметр кімнати","Повний периметр, м"],
    total_area:["base","Полотно","Площа, м²"],corners:["base","Кути кімнати","Кількість, шт"],
    main_profile:["wall","Основний профіль","Довжина з відніманнями, м"],
    white_insert:["wall","Вставка","Довжина з відніманнями, м"],
    floating_profile:["wall","Парящий профіль","Довжина, м"],floating_corners:["wall","Парящий профіль","Кути, шт"],
    shadow_profile:["wall","Тіньовий профіль","Довжина, м"],shadow_corners:["wall","Тіньовий профіль","Кути, шт"],
    profile_beam:["wall","Профіль-брус","Довжина, м"],hidden_curtain:["wall","Карниз","Довжина, м"],
    cornice_corners:["wall","Прихований карниз","Кути, шт"],cornice_break:["wall","Прихований карниз","Обриви, шт"],
    curve_length:["wall","Криволінійні ділянки","Довжина, м"],
    spot_light:["light","Точкові світильники","Кількість, шт"],chandelier:["light","Люстри","Кількість, шт"],ventilation:["light","Витяжка та вентиляція","Кількість, шт"]
  };
  function editSourceDescriptor(value,label){
    var entry=EDIT_SOURCES[value];if(entry)return {value:value,category:entry[0],element:entry[1],metric:entry[2]};
    var legacy={linear_length:"lineartype:lightLine",linear_corner:"linearcorners:lightLine",linear_break:"linearbreaks:lightLine"};
    var src=legacy[value]||value,parts=src.split(":"),prefix=parts[0],key=parts.slice(1).join(":"),element="",metric="";
    var names={lightLine:"Світлова лінія",surfaceTrack:"Накладний шинопровід",recessedTrack:"Вмонтований шинопровід",magneticTrack:"Магнітний шинопровід"};
    if(/^(lineartype|linearcorners|linearbreaks|linearfixtures)$/.test(prefix)&&names[key]){
      element=typeof window.ceilingElementMenuName==="function"?window.ceilingElementMenuName("linear_"+key):names[key];
      metric={lineartype:"Довжина, м",linearcorners:"Кути, шт",linearbreaks:"Обриви, шт",linearfixtures:"Світильники, шт"}[prefix];
      return {value:value,category:"linear",element:element,metric:metric};
    }
    if(/^ceilingcornice/.test(prefix))return {value:value,category:"wall",element:"Карниз UNO",metric:prefix==="ceilingcornice"?"Довжина, м":prefix==="ceilingcornicecorners"?"Кути, шт":"Обриви, шт",color:prefix==="ceilingcornice"&&parts.length>2?parts[2]:"",ceilingColor:prefix==="ceilingcornice"};
    if(prefix==="walltype"||prefix==="walltypecolor"){
      var raw=prefix==="walltype"?key:parts.slice(2).join(":"),color=prefix==="walltypecolor"?parts[1]:"";
      try{element=decodeURIComponent(raw)}catch(e){element=raw}
      return {value:value,category:"wall",element:element,metric:"Довжина, м",color:color,dynamicWall:true};
    }
    if(prefix==="lighttype")return {value:value,category:"light",element:label.replace(/^[^\p{L}\p{N}]+/u,"").replace(/\s*\(кількість\)\s*$/, ""),metric:"Кількість, шт"};
    return {value:value,category:"other",element:value?label:"Автовизначення за назвою (старе правило)",metric:"За правилом"};
  }
  function fillEditChoices(select,choices,selected){
    select.innerHTML=choices.map(function(c){return '<option value="'+esc(c.value)+'">'+esc(c.label)+'</option>'}).join("");
    if(choices.some(function(c){return c.value===selected}))select.value=selected;
  }
  function editColor(){try{return typeof _editingElemVariant!=="undefined"?_editingElemVariant:""}catch(e){return ""}}
  function ensureContourFields(item){
    if(!gid("acWholeContourRow")){
      var row=document.createElement("div");row.id="acWholeContourRow";
      row.innerHTML='<label style="display:flex;align-items:center;gap:8px;margin:10px 0"><input type="checkbox" id="acWholeContour"> На весь контур кімнати</label><label id="acContourPresetLabel">Колір із заготовки елементів стін<select id="acContourPreset" style="width:100%;min-width:0"></select></label>';
      gid("acEditFields").appendChild(row);
    }
    var presets=typeof window.rwe2WallPresetRead==="function"?window.rwe2WallPresetRead():[];
    presets=Array.isArray(presets)?presets.filter(function(p){return p&&p.name}):[];
    var choices=[{value:"",label:"Звичайний контур",color:"#1d1d1f"}].concat(presets.map(function(p){return {value:p.name,label:p.name,color:p.color}}));
    if(item.fullContourPresetName&&!choices.some(function(p){return p.value===item.fullContourPresetName}))choices.push({value:item.fullContourPresetName,label:item.fullContourPresetName,color:item.fullContourColor});
    fillEditChoices(gid("acContourPreset"),choices,item.fullContourPresetName||"");
    gid("acContourPreset")._colors=choices;
    gid("acWholeContour").checked=!!item.fullContourSelected;
  }
  function contourDraft(item){
    var enabled=gid("acEditEnabled").checked,source=gid("editElemSource").value;
    var eligible=/^(main_profile|shadow_profile|floating_profile)$/.test(source);
    gid("acWholeContourRow").hidden=!enabled||!eligible;
    gid("acContourPresetLabel").hidden=!gid("acWholeContour").checked;
    item.fullContourSelected=enabled&&eligible&&gid("acWholeContour").checked;
    item.fullContourPresetName=gid("acContourPreset").value;
    var choice=gid("acContourPreset")._colors.find(function(p){return p.value===item.fullContourPresetName});
    item.fullContourColor=choice&&choice.color||"#1d1d1f";
    return item;
  }
  function syncEditPreview(){
    var source=gid("editElemSource").value,entry=editCatalog.find(function(d){return d.value===source});
    if(!gid("acWholeContourRow"))ensureContourFields(items().find(function(it){return it.id===editId})||{});
    var on=gid("acEditEnabled").checked,fields=gid("acEditFields"),preview=gid("acEditPreview");fields.hidden=!on;
    gid("acEditManualQtyRow").hidden=on;
    gid("editElemVariantRow").style.display=on&&entry&&entry.category==="wall"?"block":"none";
    if(!on){preview.textContent="Кількість задається вручну";return;}
    var draft=Object.assign({},items().find(function(it){return it.id===editId})||{},{source:source,sourceVariant:editColor()});
    contourDraft(draft);
    var result=typeof window.previewNomenclatureSource==="function"?window.previewNomenclatureSource(source,draft):null;
    if(source.indexOf("custom:")===0){var rule=customRules.find(function(r){return "custom:"+r.id===source});if(rule)result=computeCustom(rule);}
    if(!result&&source==="full_perimeter")result={qty:roomPerimeterM(),unit:"м"};
    if(!result&&source==="total_area")result={qty:roomAreaM2(),unit:"м²"};
    preview.textContent=result?"На плані: "+Number(result.qty.toFixed(2)).toLocaleString("uk-UA")+" "+result.unit+" · Оновлюється після змін на плані":"Правило вибрано · Збережіть і натисніть «Перерахувати»";
    if(!autoCountEnabled())preview.textContent+=" · Загальний автопрорахунок вимкнений";
  }
  function refreshEditSelectors(source,level){
    var selected=editCatalog.find(function(d){return d.value===source})||editCatalog[0];if(!selected)return;
    var category=gid("acEditCategory"),element=gid("acEditElement"),metric=gid("acEditMetric");
    if(!level)fillEditChoices(category,Object.keys(EDIT_CATEGORIES).filter(function(k){return editCatalog.some(function(d){return d.category===k})}).map(function(k){return {value:k,label:EDIT_CATEGORIES[k]}}),selected.category);
    var rows=editCatalog.filter(function(d){return d.category===category.value});
    if(level!=="metric"&&level!=="element")fillEditChoices(element,Array.from(new Set(rows.map(function(d){return d.element}))).map(function(n){return {value:n,label:n}}),level==="category"?null:selected.element);
    rows=rows.filter(function(d){return d.element===element.value});
    var seen={};rows=rows.filter(function(d){if(d.dynamicWall&&d.color)return false;if(seen[d.metric])return false;seen[d.metric]=true;return true;});
    fillEditChoices(metric,rows.map(function(d){return {value:d.value,label:d.metric}}),source);
    // Preserve the exact existing source, including legacy and colored values.
    if(!level)gid("editElemSource").value=source;
    else gid("editElemSource").value=metric.value;
    updateSourceExtraFieldsVisibility();syncEditPreview();
  }
  function setupEditCalculation(id){
    editId=id;var source=gid("editElemSource"),item=items().find(function(it){return it.id===id});if(!source||!item)return;
    loadRules();customRules.forEach(function(rule){var value="custom:"+rule.id;if(!Array.prototype.some.call(source.options,function(o){return o.value===value})){var option=document.createElement("option");option.value=value;option.textContent=rule.name;source.appendChild(option);}});
    if(item.source&&!Array.prototype.some.call(source.options,function(o){return o.value===item.source})){var option=document.createElement("option");option.value=item.source;option.textContent="Збережене правило";source.appendChild(option);}
    source.value=item.source||"";editCatalog=Array.prototype.map.call(source.options,function(o){return editSourceDescriptor(o.value,o.textContent)});
    var selected=editCatalog.find(function(d){return d.value===source.value});
    if(selected&&selected.color&&typeof window.setEditElemVariant==="function")window.setEditElemVariant(selected.color);
    gid("acEditEnabled").checked=item.manualQtyOverride!==true;
    gid("acEditManualQty").value=Number(item.qty)||0;
    gid("acEditAdvanced").open=false;ensureContourFields(item);refreshEditSelectors(source.value);
  }
  document.addEventListener("change",function(event){
    var id=event.target&&event.target.id;
    if(id==="acEditCategory")refreshEditSelectors("","category");
    else if(id==="acEditElement")refreshEditSelectors("","element");
    else if(id==="acEditMetric"){gid("editElemSource").value=gid(id).value;updateSourceExtraFieldsVisibility();syncEditPreview();}
    else if(id==="acEditEnabled"||id==="acWholeContour"||id==="acContourPreset")syncEditPreview();
  });
  document.addEventListener("click",function(event){
    if(event.target&&event.target.closest&&event.target.closest("#editElemVariantButtons")){
      var source=gid("editElemSource"),entry=editCatalog.find(function(d){return d.value===source.value});
      if(entry&&entry.dynamicWall){var next=editCatalog.find(function(d){return d.dynamicWall&&d.element===entry.element&&(d.color||"")===editColor()});if(next)source.value=next.value;}
      if(entry&&entry.ceilingColor)source.value="ceilingcornice:uno";
      syncEditPreview();
    }
  });
  var oldEditOpen=window.openEditElemModal;
  if(typeof oldEditOpen==="function"){
    window.openEditElemModal=function(id){var result=oldEditOpen.apply(this,arguments);setupEditCalculation(id);return result;};
    try{openEditElemModal=window.openEditElemModal}catch(e){}
  }
  var oldEditSave=window.saveElemEdit;
  if(typeof oldEditSave==="function"){
    window.saveElemEdit=function(){
      var item=items().find(function(it){return it.id===editId});if(!item)return oldEditSave.apply(this,arguments);
      if(!gid("editElemName").value.trim())return oldEditSave.apply(this,arguments);
      contourDraft(item);
      if(item.fullContourSelected)items().forEach(function(other){if(other!==item)other.fullContourSelected=false;});
      item.manualQtyOverride=!gid("acEditEnabled").checked;
      if(item.manualQtyOverride){item.qty=Math.max(0,Number(String(gid("acEditManualQty").value).replace(",","."))||0);item.autoFilled=false;item.autoZero=false;}
      var result=oldEditSave.apply(this,arguments);
      if(typeof window.draw==="function")window.draw();
      // Saving an explicit automatic rule is a user-requested calculation.
      if(!item.manualQtyOverride&&autoCountEnabled()&&typeof window.autoFillNomenclature==="function")window.autoFillNomenclature({silent:true});
      return result;
    };
    try{saveElemEdit=window.saveElemEdit}catch(e){}
  }

  var previousRender=window.renderElemList;
  if(typeof previousRender==="function"&&!previousRender.__corniceRulesV2){
    var wrappedRender=function(){loadRules();embedRules();applyCustomRules(false);correctCorniceRules(false);return previousRender.apply(this,arguments)};
    wrappedRender.__corniceRulesV2=true;window.renderElemList=wrappedRender;
    try{renderElemList=wrappedRender;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  var previousQuick=window.openQuickSourceMenu;
  if(typeof previousQuick==="function"&&!previousQuick.__organizedV1){
    var wrappedQuick=function(id){_customMenuItemId=id;var result=previousQuick.apply(this,arguments);setTimeout(organizeSourceMenu,0);return result;};
    wrappedQuick.__organizedV1=true;window.openQuickSourceMenu=wrappedQuick;
    try{openQuickSourceMenu=wrappedQuick;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  var previousSave=window.saveState;
  if(typeof previousSave==="function"&&!previousSave.__customRulesV1){
    var wrappedSave=function(){var result=previousSave.apply(this,arguments);applyCustomRules(false);correctCorniceRules(false);return result};
    wrappedSave.__customRulesV1=true;window.saveState=wrappedSave;try{saveState=wrappedSave}catch(e){}
  }
  var previousLightBadge=window.updateLightBadge;
  if(typeof previousLightBadge==="function"&&!previousLightBadge.__customRulesV1){
    var wrappedLightBadge=function(){var result=previousLightBadge.apply(this,arguments);applyCustomRules(false);return result};
    wrappedLightBadge.__customRulesV1=true;window.updateLightBadge=wrappedLightBadge;try{updateLightBadge=wrappedLightBadge}catch(e){}
  }
  setTimeout(function(){loadRules();embedRules();applyCustomRules(false);correctCorniceRules(false);installTouchScroll(gid("quickSourceList"));installQuickSourcePageLock();},500);
})();
