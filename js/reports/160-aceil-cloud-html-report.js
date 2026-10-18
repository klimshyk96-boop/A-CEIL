
(function(){
"use strict";

function clone(v){
  try{return JSON.parse(JSON.stringify(v));}catch(_){return null}
}
function esc(v){
  return String(v==null?"":v).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function num(v){
  var n=parseFloat(v); return Number.isFinite(n)?n:0;
}
function money(v){
  return new Intl.NumberFormat("uk-UA",{maximumFractionDigits:2}).format(num(v));
}
function safeState(st){
  try{
    if(typeof st==="string") return JSON.parse(st)||{};
    return st&&typeof st==="object"?st:{};
  }catch(_){return{}}
}
function reportGroups(st){
  try{
    if(typeof _modernGetNomenclatureGroupsFromState==="function"){
      return clone(_modernGetNomenclatureGroupsFromState(st||{}))||[];
    }
  }catch(_){}
  var items=(st&&Array.isArray(st.elemItems)?st.elemItems:[])||[];
  var groups=(st&&Array.isArray(st.elemGroups)?st.elemGroups:[])||[];
  var active=items.filter(function(i){return num(i&&i.qty)>0}), used={}, out=[];
  groups.forEach(function(g){
    var arr=active.filter(function(i){return String(i.groupId||"")===String(g.id||"")});
    if(arr.length){arr.forEach(function(i){used[String(i.id)]=1});out.push({name:g.name||"Група",items:arr})}
  });
  var rest=active.filter(function(i){return !used[String(i.id)]});
  if(rest.length) out.push({name:"Інше",items:rest});
  return clone(out)||[];
}
function cleanGroups(groups){
  return (groups||[]).map(function(g){
    return {
      name:String(g&&g.name||"Група"),
      items:(g&&g.items||[]).filter(function(i){return num(i&&i.qty)>0}).map(function(i){
        var q=num(i.qty), p=num(i.price);
        return {
          name:String(i.name||"Позиція"),
          icon:String(i.icon||""),
          qty:q,
          unit:String(i.unit||"шт"),
          price:p,
          total:q*p
        };
      })
    };
  }).filter(function(g){return g.items.length});
}
function totalGroups(groups){
  var t=0;(groups||[]).forEach(function(g){(g.items||[]).forEach(function(i){t+=num(i.total)})});return t;
}
function currentState(){
  var st={};
  try{st.pts=clone(typeof pts!=="undefined"?pts:[])||[]}catch(_){st.pts=[]}
  try{st.lengths=clone(typeof lengths!=="undefined"?lengths:[])||[]}catch(_){st.lengths=[]}
  try{st.realPts=clone(typeof realPts!=="undefined"?realPts:[])||[]}catch(_){st.realPts=[]}
  try{st.lightMarks=clone(typeof lightMarks!=="undefined"?lightMarks:[])||[]}catch(_){st.lightMarks=[]}
  try{st.wallMarks=clone(typeof wallMarks!=="undefined"?wallMarks:[])||[]}catch(_){st.wallMarks=[]}
  try{st.elemItems=clone(typeof elemItems!=="undefined"?elemItems:[])||[]}catch(_){st.elemItems=[]}
  try{st.elemGroups=clone(typeof elemGroups!=="undefined"?elemGroups:[])||[]}catch(_){st.elemGroups=[]}
  try{st.circleMode=!!(typeof circleMode!=="undefined"&&circleMode)}catch(_){st.circleMode=false}
  try{st.circleDiamCm=typeof circleDiamCm!=="undefined"?circleDiamCm:null}catch(_){st.circleDiamCm=null}
  return st;
}
function linesFor(st,kind){
  try{
    if(kind==="dimensions"&&typeof _allWallDimensionLines==="function") return clone(_allWallDimensionLines(st||{}))||[];
    if(kind==="walls"&&typeof getWallCoordLines==="function") return clone(getWallCoordLines(st||{}))||[];
    if(kind==="lights"&&typeof getLightCoordLines==="function"){
      var cp=clone(st)||{};
      if(Array.isArray(cp.lightMarks)&&window.rmIsFixtureMarkV326) cp.lightMarks=cp.lightMarks.filter(function(m){return window.rmIsFixtureMarkV326(m)});
      return clone(getLightCoordLines(cp))||[];
    }
    if(kind==="ceilings"&&window.getCeilingElementCoordLinesV326) return clone(window.getCeilingElementCoordLinesV326(st||{}))||[];
    if(kind==="exhausts"&&typeof getExhaustCoordLines==="function") return clone(getExhaustCoordLines(st||{}))||[];
  }catch(_){}
  return [];
}
function fixtureCount(st){
  try{
    var a=(st&&st.lightMarks)||[];
    return window.A·CEILFixtureLightCount?window.A·CEILFixtureLightCount(a):a.length;
  }catch(_){return 0}
}
function roomSnapshot(name,st,fallback){
  st=safeState(st);
  var groups=cleanGroups(reportGroups(st));
  var area=(fallback&&fallback.area)||"";
  var per=(fallback&&fallback.per)||"";
  var inC=(fallback&&fallback.inC)||"";
  var outC=(fallback&&fallback.outC)||"";
  try{
    if(!area&&typeof _modernRoomStatsFromCurrent==="function"&&(!st.pts||!st.pts.length)){
      var x=_modernRoomStatsFromCurrent(); area=x.area;per=x.per;inC=x.inC;outC=x.outC;
    }
  }catch(_){}
  return {
    name:String(name||"Кімната"),
    area:String(area||"—"),
    per:String(per||"—"),
    inC:String(inC||"—"),
    outC:String(outC||"—"),
    lights:fixtureCount(st),
    dimensions:linesFor(st,"dimensions"),
    walls:linesFor(st,"walls"),
    lightLines:linesFor(st,"lights"),
    ceilingLines:linesFor(st,"ceilings"),
    exhaustLines:linesFor(st,"exhausts"),
    groups:groups,
    total:totalGroups(groups)
  };
}
function activeObject(){
  try{
    var ps=typeof getProjects==="function"?getProjects():[];
    var id=null;
    if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null) id=_activeObjectId;
    if(id==null&&typeof _currentProjectId!=="undefined"&&_currentProjectId!=null) id=_currentProjectId;
    if(id!=null) return ps.find(function(p){
      return [p&&p.id,p&&p._dbId,p&&p._localId].some(function(v){return v!=null&&String(v)===String(id)});
    })||null;
  }catch(_){}
  return null;
}
window.A_CEIL_buildCloudStructuredReport=function(fileName){
  var obj=activeObject(), meta={
    name:"",
    address:"",
    phone:"",
    comment:""
  };
  try{meta.name=String(typeof _currentProjName!=="undefined"&&_currentProjName||obj&&obj.name||"Звіт A·CEIL")}catch(_){}
  try{meta.address=String(typeof _currentProjAddr!=="undefined"&&_currentProjAddr||obj&&obj.addr||"")}catch(_){}
  try{meta.phone=String(typeof _currentProjPhone!=="undefined"&&_currentProjPhone||obj&&obj.phone||"")}catch(_){}
  try{meta.comment=String(typeof _currentProjComment!=="undefined"&&_currentProjComment||obj&&obj.comment||"")}catch(_){}

  if(obj&&obj.multiRoom&&Array.isArray(obj.rooms)&&obj.rooms.length){
    var rooms=obj.rooms.map(function(r){
      return roomSnapshot(r.name||"Кімната",safeState(r.state),r);
    });
    return {type:"object",meta:meta,rooms:rooms,total:rooms.reduce(function(s,r){return s+num(r.total)},0)};
  }

  var st=currentState(), stats={};
  try{
    if(typeof _modernRoomStatsFromCurrent==="function") stats=_modernRoomStatsFromCurrent()||{};
  }catch(_){}
  var room=roomSnapshot(meta.name||"Кімната",st,{
    area:stats.area||document.getElementById("area")&&document.getElementById("area").textContent||"",
    per:stats.per||document.getElementById("per")&&document.getElementById("per").textContent||"",
    inC:stats.inC||document.getElementById("inCorners")&&document.getElementById("inCorners").textContent||"",
    outC:stats.outC||document.getElementById("outCorners")&&document.getElementById("outCorners").textContent||""
  });
  return {type:"single",meta:meta,rooms:[room],total:room.total};
};

window.A_CEIL_cloudPlanImage=function(canvas){
  try{
    if(!canvas) return "";
    var s=parseFloat(canvas.dataset&&canvas.dataset.hdScale)||1;
    var logicalW=parseFloat(canvas.dataset&&canvas.dataset.logicalWidth)||1080;
    var x=28,y=200,w=640,h=590;
    if(logicalW!==1080) return "";
    var out=document.createElement("canvas");
    out.width=Math.max(1,Math.round(w*s));
    out.height=Math.max(1,Math.round(h*s));
    var c=out.getContext("2d");
    c.imageSmoothingEnabled=true;
    c.imageSmoothingQuality="high";
    c.drawImage(canvas,Math.round(x*s),Math.round(y*s),Math.round(w*s),Math.round(h*s),0,0,out.width,out.height);
    return out.toDataURL("image/png");
  }catch(_){return ""}
};

function renderList(title,arr){
  if(!arr||!arr.length) return "";
  return '<section class="chr-card"><h3>'+esc(title)+'</h3><div class="chr-list">'+arr.map(function(x){
    return '<div>'+esc(String(x).replace(/^•\s*/,""))+'</div>';
  }).join("")+'</div></section>';
}
function renderEstimate(groups,total){
  if(!groups||!groups.length) return "";
  var html='<section class="chr-card chr-est"><h3>6. Кошторис</h3>';
  groups.forEach(function(g){
    html+='<div class="chr-group"><b>'+esc(g.name)+'</b></div>';
    g.items.forEach(function(i){
      html+='<div class="chr-row"><div class="chr-item">'+
        (i.icon?'<span>'+esc(i.icon)+'</span> ':'')+'<strong>'+esc(i.name)+'</strong>'+
        '<small>К-ть: '+esc(i.qty)+' '+esc(i.unit)+' &nbsp; Ціна: '+money(i.price)+'</small></div>'+
        '<div class="chr-sum">'+money(i.total)+' грн</div></div>';
    });
  });
  html+='<div class="chr-total"><span>ДО СПЛАТИ</span><strong>'+money(total)+' грн</strong></div></section>';
  return html;
}
function routeUrl(loc){
  try{
    if(window.A·CEILLocation&&window.A·CEILLocation.routeUrl) return window.A·CEILLocation.routeUrl(loc);
  }catch(_){}
  if(!loc) return "";
  var a=Number(loc.latitude!=null?loc.latitude:loc.lat),b=Number(loc.longitude!=null?loc.longitude:loc.lng);
  return Number.isFinite(a)&&Number.isFinite(b)?"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(a+","+b):String(loc.mapUrl||"");
}

window.A_CEIL_renderStructuredCloudReport=function(overlay,data){
  var s=data.structured||{}, meta=Object.assign({},data.meta||{},s.meta||{}), rooms=s.rooms||[];
  var phone=String(meta.phone||"").replace(/[^+\d]/g,""), route=routeUrl(data.location);
  var roomHtml=rooms.map(function(r,idx){
    var summary='<div class="chr-stats chr-stats-compact">'+
      '<div><small>ПЛОЩА</small><b>'+esc(r.area)+' м²</b></div>'+
      '<div><small>ПЕРИМЕТР</small><b>'+esc(r.per)+' м</b></div></div>';
    var drawing=(idx===0&&s.drawing)?'<section class="chr-card chr-plan"><h3>1. План приміщення</h3><img src="'+esc(s.drawing)+'" alt="План приміщення"></section>':'';
    return '<article class="chr-room">'+
      (rooms.length>1?'<h2>'+esc(r.name||("Кімната "+(idx+1)))+'</h2>':'')+
      drawing+
      '<section class="chr-card"><h3>2. Основна інформація</h3>'+summary+'</section>'+
      renderList("3. Розміри стін",r.dimensions)+
      renderList("4. Розташування елементів",r.walls)+
      renderList("5. Світло",r.lightLines)+
      renderList("Елементи стелі",r.ceilingLines)+
      renderList("Витяжка",r.exhaustLines)+
      renderEstimate(r.groups,r.total)+
      '</article>';
  }).join("");

  var fullImage=data.image?'<details class="chr-original"><summary>Відкрити повний графічний макет</summary><img src="'+esc(data.image)+'" alt="Повний звіт"></details>':'';
  overlay.innerHTML=
    '<div class="chr-shell">'+
      '<header class="chr-head"><div class="chr-logo">A·CEIL <span>PRO</span></div><div><h1>'+esc(meta.name||"Монтажний звіт")+'</h1><p>Хмарний монтажний звіт</p></div></header>'+
      ((meta.address||meta.comment)?'<section class="chr-meta">'+
        (meta.address?'<div>📍 '+esc(meta.address)+'</div>':'')+
        (meta.comment?'<div>💬 '+esc(meta.comment)+'</div>':'')+
      '</section>':'')+
      ((route||phone)?'<div class="chr-actions">'+
        (route?'<a href="'+esc(route)+'">🧭 Маршрут</a>':'')+
        (phone?'<a href="tel:'+esc(phone)+'">📞 Подзвонити</a>':'')+
      '</div>':'')+
      roomHtml+
      (rooms.length>1?'<div class="chr-grand"><span>ЗАГАЛОМ ДО СПЛАТИ</span><strong>'+money(s.total)+' грн</strong></div>':'')+
      fullImage+
    '</div>';

  var style=document.getElementById("A-CEIL-cloud-html-style");
  if(!style){
    style=document.createElement("style");style.id="A-CEIL-cloud-html-style";
    style.textContent=
      '#A·CEILPublicReportView{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#eef4fb;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:0!important;box-sizing:border-box}' +
      '.chr-shell{width:min(100%,1040px);margin:0 auto;padding:18px 14px 44px;box-sizing:border-box}' +
      '.chr-head{display:flex;gap:16px;align-items:center;background:#0f172a;color:#fff;padding:20px;border-radius:22px;margin-bottom:12px;box-shadow:0 12px 34px rgba(15,23,42,.16)}' +
      '.chr-logo{font-weight:950;font-size:20px;white-space:nowrap}.chr-logo span{color:#60a5fa}.chr-head h1{font-size:23px;line-height:1.1;margin:0 0 5px}.chr-head p{margin:0;color:#cbd5e1;font-size:13px}' +
      '.chr-meta,.chr-card,.chr-original{background:#fff;border:1px solid #dbe4ef;border-radius:20px;padding:16px;margin:12px 0;box-shadow:0 7px 22px rgba(15,23,42,.05)}' +
      '.chr-meta{display:grid;gap:7px;color:#475569;font-weight:650}.chr-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}.chr-actions a{display:flex;min-height:48px;align-items:center;justify-content:center;border-radius:15px;text-decoration:none;font-weight:850;background:#dcfce7;color:#047857}.chr-actions a+ a{background:#dbeafe;color:#1d4ed8}' +
      '.chr-room>h2{font-size:22px;margin:24px 4px 8px}.chr-card h3{margin:0 0 13px;color:#0755bd;font-size:18px}.chr-plan img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid #e2e8f0}' +
      '.chr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.chr-stats>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:11px}.chr-stats small{display:block;color:#64748b;font-size:10px;font-weight:900;letter-spacing:.06em}.chr-stats b{display:block;font-size:17px;margin-top:5px}' +
      '.chr-list{display:grid;gap:0}.chr-list>div{padding:10px 2px;border-bottom:1px solid #edf2f7;font-size:15px;line-height:1.35}.chr-list>div:last-child{border-bottom:0}' +
      '.chr-est{overflow:hidden}.chr-group{background:#eaf2ff;color:#0755bd;font-size:14px;font-weight:900;padding:9px 10px;margin:12px -4px 0}.chr-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px 2px;border-bottom:1px solid #edf2f7}.chr-item strong{font-size:15px}.chr-item small{display:block;color:#64748b;font-size:12px;margin-top:5px}.chr-sum{color:#079447;font-weight:900;font-size:14px;white-space:nowrap}.chr-total,.chr-grand{display:flex;align-items:center;justify-content:space-between;gap:12px;border:2px solid #22c55e;background:#f0fdf4;border-radius:15px;padding:13px 14px;margin-top:14px}.chr-total span,.chr-grand span{font-size:12px;font-weight:900;color:#15803d}.chr-total strong,.chr-grand strong{font-size:21px;color:#15803d}.chr-grand{margin:18px 0;background:#0755bd;border-color:#0755bd;color:#fff}.chr-grand span,.chr-grand strong{color:#fff}' +
      '.chr-original summary{cursor:pointer;font-weight:850;color:#475569}.chr-original img{display:block;width:100%;height:auto;margin-top:12px;border-radius:12px}' +
      '@media(max-width:600px){.chr-shell{padding:10px 8px 30px}.chr-head{border-radius:18px;padding:16px 14px}.chr-logo{font-size:16px}.chr-head h1{font-size:19px}.chr-stats{grid-template-columns:1fr 1fr}.chr-actions{grid-template-columns:1fr}.chr-card,.chr-meta,.chr-original{border-radius:16px;padding:13px}.chr-row{grid-template-columns:1fr}.chr-sum{text-align:left}.chr-total strong,.chr-grand strong{font-size:18px}}';
    document.head.appendChild(style);
  }
};
})();
