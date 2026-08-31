
(function(){
"use strict";
if(window.__A_CEIL_ManagerReportV2)return;
window.__A_CEIL_ManagerReportV2=true;

function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return v}}
function parse(v){try{return typeof v==="string"?JSON.parse(v||"{}"):(v&&typeof v==="object"?v:{});}catch(_){return{}}}
function n(v){var x=parseFloat(String(v==null?"":v).replace(/\s/g,"").replace(",",".").replace(/[^\d.-]/g,""));return Number.isFinite(x)?x:0}
function fmt(v,d){return new Intl.NumberFormat("uk-UA",{minimumFractionDigits:d||0,maximumFractionDigits:d==null?2:d}).format(n(v))}
function money(v){return fmt(v,2)+" грн"}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function projects(){try{return window.A·CEIL.ProjectRepository.list({clone:true})}catch(_){try{return clone(getProjects())||[]}catch(__){return[]}}}
function match(p,id){return !!p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){return v!=null&&String(v)===String(id)})}
function activeObject(){
  var id=null;
  try{if(typeof _activeObjectId!=="undefined"&&_activeObjectId!=null)id=_activeObjectId}catch(_){}
  try{if(id==null&&typeof _currentProjectId!=="undefined"&&_currentProjectId!=null)id=_currentProjectId}catch(_){}
  try{if(id==null&&window.__A·CEILPendingMultiRoomReportId!=null)id=window.__A·CEILPendingMultiRoomReportId}catch(_){}
  var list=projects(),hit=list.find(function(p){return match(p,id)})||null;
  if(hit)return hit;
  try{
    if(typeof getProjects==="function"&&typeof _currentProjName!=="undefined"&&_currentProjName){
      return (getProjects()||[]).find(function(p){return p&&p.multiRoom&&String(p.name||"")===String(_currentProjName||"")})||null;
    }
  }catch(_){}
  return null;
}
function sbClient(){
  try{if(typeof _sb!=="undefined"&&_sb)return _sb}catch(_){}
  return window._sb||null;
}
function signedUser(){
  try{if(typeof _sbUser!=="undefined"&&_sbUser)return _sbUser}catch(_){}
  return window._sbUser||null;
}
function appReturnUrl(){
  try{
    var u=new URL(window.location.href);
    u.search="";u.hash="";
    if(/^\/report\/[a-f0-9]{20}\/?$/i.test(u.pathname))u.pathname="/";
    return u.href;
  }catch(_){return "https://a-ceil.pp.ua/"}
}
function groupRows(st){
  try{if(typeof _modernGetNomenclatureGroupsFromState==="function")return clone(_modernGetNomenclatureGroupsFromState(st||{}))||[]}catch(_){}
  var items=Array.isArray(st&&st.elemItems)?st.elemItems:[],groups=Array.isArray(st&&st.elemGroups)?st.elemGroups:[],by={},out=[];
  items.filter(function(i){return n(i&&i.qty)>0}).forEach(function(it){var gid=String(it.groupId||"_none");(by[gid]||(by[gid]=[])).push(it)});
  groups.forEach(function(g){if(by[String(g.id)]&&by[String(g.id)].length)out.push({name:g.name||"Група",items:by[String(g.id)]})});
  if(by._none&&by._none.length)out.push({name:"Інше",items:by._none});
  return out;
}
function category(groupName,itemName){
  var g=String(groupName||"").toLowerCase(),i=String(itemName||"").toLowerCase();
  if(/захист.*стін|стін.*захист|захис.*плів|укрит.*стін/.test(i))return"other";
  if(/додатков|робот|матеріал|захист|сервіс/.test(g))return"other";
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(g))return"profiles";
  if(/плів|полотн|premium|msd|teqtum|pongs|clipso|ткан/.test(g))return"canvas";
  if(/встав|шнур|маскув/.test(g))return"insert";
  if(/освіт|світ|люстр|трек|бра|led|ламп|світиль|точков/.test(g))return"lighting";
  if(g)return"other";
  if(/проф|карниз|багет|тіньов|парящ|паряч|shadow/.test(i))return"profiles";
  if(/плів|полотн|premium|msd|teqtum|pongs|clipso|ткан/.test(i))return"canvas";
  if(/встав|шнур|маскув/.test(i))return"insert";
  if(/освіт|світ|люстр|трек|бра|led|ламп|світиль|точков/.test(i))return"lighting";
  return"other";
}
function unitNorm(v){return String(v||"шт").replace(/\s+/g," ").trim()}
function addAgg(map,key,row){
  var k=String(key||"Позиція").trim()+"|"+unitNorm(row.unit);
  if(!map[k])map[k]={name:String(key||"Позиція"),unit:unitNorm(row.unit),qty:0,sum:0};
  map[k].qty+=n(row.qty);map[k].sum+=n(row.total);
}
function vals(map){return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.qty-a.qty})}
function roomStats(room){
  var st=parse(room&&room.state),area=n(room&&room.area),per=n(room&&room.per),inC=n(room&&room.inC),outC=n(room&&room.outC);
  var groups=groupRows(st),total=0,profiles={},canvas={},insert={},lighting={},other={};
  groups.forEach(function(g){(g.items||[]).forEach(function(it){var qty=n(it.qty),price=n(it.price),sum=qty*price;if(qty<=0)return;total+=sum;var row={qty:qty,unit:it.unit||"шт",total:sum},c=category(g.name,it.name);addAgg(c==="profiles"?profiles:c==="canvas"?canvas:c==="insert"?insert:c==="lighting"?lighting:other,it.name,row)})});
  var lightCount=0;try{lightCount=window.A·CEILFixtureLightCount?window.A·CEILFixtureLightCount(st.lightMarks||[]):(st.lightMarks||[]).length}catch(_){}
  return{name:String(room&&room.name||"Кімната"),area:area,per:per,corners:inC+outC,lights:lightCount,total:total,profiles:profiles,canvas:canvas,insert:insert,lighting:lighting,other:other};
}
function aggregate(obj){
  var rooms=(obj.rooms||[]).map(roomStats),a={area:0,per:0,corners:0,lights:0,total:0,profiles:{},canvas:{},insert:{},lighting:{},other:{}};
  rooms.forEach(function(r){a.area+=r.area;a.per+=r.per;a.corners+=r.corners;a.lights+=r.lights;a.total+=r.total;["profiles","canvas","insert","lighting","other"].forEach(function(k){Object.keys(r[k]).forEach(function(key){var row=r[k][key];addAgg(a[k],row.name,row)})})});
  return{rooms:rooms,total:a};
}
function block(title,map,totalLabel){
  var rows=vals(map),total=rows.reduce(function(s,r){return s+r.qty},0),max=rows.reduce(function(m,r){return Math.max(m,r.qty)},0)||1;
  return '<section class="md-card"><div class="md-card-title">'+esc(title)+(totalLabel?'<small>'+esc(totalLabel)+'</small>':'')+'</div>'+
    (rows.length?rows.map(function(r){
      var pct=Math.max(4,Math.round(r.qty/max*100));
      return '<div class="md-metric-row"><div><strong>'+esc(r.name)+'</strong><div class="md-bar"><i style="width:'+pct+'%"></i></div></div><b>'+fmt(r.qty,2)+' '+esc(r.unit)+'</b></div>';
    }).join(""):'<div class="md-empty">Немає даних</div>')+
    (rows.length?'<div class="md-card-total"><span>Разом</span><b>'+fmt(total,2)+'</b></div>':'')+'</section>';
}
function makeHtml(obj,data){
  var a=data.total,rooms=data.rooms,returnUrl=appReturnUrl();
  var fin=[
    ["Профілі",vals(a.profiles).reduce(function(s,x){return s+x.sum},0),"#3b82f6"],
    ["Полотно",vals(a.canvas).reduce(function(s,x){return s+x.sum},0),"#22c55e"],
    ["Освітлення",vals(a.lighting).reduce(function(s,x){return s+x.sum},0),"#f59e0b"],
    ["Інше",vals(a.insert).concat(vals(a.other)).reduce(function(s,x){return s+x.sum},0),"#8b5cf6"]
  ].filter(function(x){return x[1]>0});
  var finTotal=fin.reduce(function(s,x){return s+x[1]},0)||1;
  var roomsHtml=rooms.map(function(r,i){
    var prof=vals(r.profiles).reduce(function(s,x){return s+x.qty},0);
    return '<div class="md-room"><div class="md-room-num">'+(i+1)+'</div><div class="md-room-name">'+esc(r.name)+'</div><div><small>Площа</small><b>'+fmt(r.area,2)+' м²</b></div><div><small>Периметр</small><b>'+fmt(r.per,2)+' м</b></div><div><small>Світло</small><b>'+fmt(r.lights,0)+' шт</b></div><div><small>Профілі</small><b>'+fmt(prof,2)+' м</b></div><div class="md-room-sum">'+money(r.total)+'</div></div>';
  }).join("");
  var finLegend=fin.map(function(x){return '<div class="md-fin-item"><i style="background:'+x[2]+'"></i><span>'+esc(x[0])+'</span><b>'+money(x[1])+'</b><small>'+Math.round(x[1]/finTotal*100)+'%</small></div>'}).join("");
  var lightingRows=vals(a.lighting).slice(0,8).map(function(r){return '<div class="md-simple-row"><span>'+esc(r.name)+'</span><b>'+fmt(r.qty,2)+' '+esc(r.unit)+'</b></div>'}).join("")||'<div class="md-empty">Немає даних</div>';
  var otherRows=vals(a.insert).concat(vals(a.other)).slice(0,8).map(function(r){return '<div class="md-simple-row"><span>'+esc(r.name)+'</span><b>'+fmt(r.qty,2)+' '+esc(r.unit)+'</b></div>'}).join("")||'<div class="md-empty">Немає даних</div>';

  return '<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>Менеджерський звіт</title><style>'+
  '*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.md-wrap{max-width:1180px;margin:auto;padding:18px}.md-top{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-bottom:14px}.md-brand{font-weight:950;font-size:22px}.md-brand b{color:#2563eb}.md-titlebox h1{font-size:24px;margin:0}.md-titlebox .md-brand{margin-bottom:2px}.md-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.md-actions button,.md-back{border:1px solid #dbe4ef;background:#fff;border-radius:12px;padding:10px 13px;font-weight:850;color:#0f172a;box-shadow:none}.md-actions .blue{background:#2563eb;color:#fff;border-color:#2563eb}.md-actions .cloud{background:#eef6ff;color:#1d4ed8;border-color:#bfdbfe}.md-back{min-width:44px;padding:10px}.md-cloudbox{display:none;margin:-2px 0 14px;background:#fff;border:1px solid #bfdbfe;border-radius:15px;padding:10px;grid-template-columns:1fr auto;gap:8px;align-items:center}.md-cloudbox.show{display:grid}.md-cloudbox input{width:100%;border:0;background:#f8fafc;border-radius:10px;padding:10px;color:#334155;font-size:12px;min-width:0}.md-cloudbox button{border:0;background:#dbeafe;color:#1d4ed8;border-radius:10px;padding:10px 12px;font-weight:850}.md-object{background:#fff;border:1px solid #dbe4ef;border-radius:20px;padding:18px;display:grid;grid-template-columns:1.4fr repeat(4,.7fr);gap:16px;align-items:center}.md-object-main small,.md-object div small{display:block;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase}.md-object-main h2{margin:4px 0 4px;font-size:23px}.md-object-main p{margin:2px 0;color:#64748b}.md-object b{display:block;margin-top:4px}.md-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.md-kpi{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:16px}.md-kpi small{font-size:10px;font-weight:950;text-transform:uppercase}.md-kpi b{display:block;font-size:28px;margin-top:7px}.md-kpi.blue{background:#eff6ff}.md-kpi.green{background:#f0fdf4}.md-kpi.orange{background:#fff7ed}.md-kpi.violet{background:#f5f3ff}.md-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.md-grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1.2fr;gap:12px;margin-top:12px}.md-card{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:15px}.md-card-title{font-size:15px;font-weight:950;color:#1e3a8a;margin-bottom:12px}.md-card-title small{font-weight:800;color:#64748b;margin-left:6px}.md-metric-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:8px 0}.md-metric-row strong{font-size:13px}.md-metric-row>b{font-size:13px}.md-bar{height:4px;background:#eef2f7;border-radius:99px;margin-top:6px;overflow:hidden}.md-bar i{display:block;height:100%;background:#2563eb;border-radius:99px}.md-card-total{margin-top:8px;padding:10px 11px;border:1px solid #dbeafe;background:#f8fbff;border-radius:12px;display:flex;justify-content:space-between;color:#1d4ed8;font-weight:900}.md-simple-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #edf2f7;font-size:13px}.md-simple-row:last-child{border-bottom:0}.md-fin{display:grid;grid-template-columns:130px 1fr;gap:15px;align-items:center}.md-donut{width:120px;height:120px;border-radius:50%;background:conic-gradient(#3b82f6 0 50%,#22c55e 50% 82%,#f59e0b 82% 95%,#8b5cf6 95% 100%);position:relative}.md-donut:after{content:"";position:absolute;inset:27px;background:#fff;border-radius:50%}.md-fin-item{display:grid;grid-template-columns:10px 1fr auto;gap:7px;align-items:center;font-size:12px;margin:8px 0}.md-fin-item i{width:9px;height:9px;border-radius:3px}.md-fin-item small{grid-column:2/4;color:#94a3b8}.md-fin-total{margin-top:12px;border:1px solid #dbeafe;border-radius:12px;padding:10px;text-align:right;color:#1d4ed8;font-size:23px;font-weight:950}.md-rooms{margin-top:12px;background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:15px}.md-rooms h3{margin:0 0 12px;color:#1e3a8a}.md-room{display:grid;grid-template-columns:30px 1.2fr repeat(4,.8fr) 1fr;gap:10px;align-items:center;padding:11px 8px;border-bottom:1px solid #edf2f7}.md-room:last-child{border-bottom:0}.md-room-num{width:25px;height:25px;border-radius:8px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;font-weight:900}.md-room-name{font-weight:900}.md-room small{display:block;color:#94a3b8;font-size:9px;text-transform:uppercase;font-weight:900}.md-room b{display:block;margin-top:3px;font-size:12px}.md-room-sum{text-align:right;color:#1d4ed8;font-weight:950}.md-empty{color:#94a3b8;font-size:13px;padding:8px 0}@media(max-width:780px){.md-wrap{padding:8px}.md-top{grid-template-columns:auto 1fr;align-items:start}.md-titlebox h1{font-size:20px}.md-actions{grid-column:1/-1;justify-content:stretch}.md-actions button{flex:1;padding:9px 8px;font-size:12px}.md-cloudbox{grid-template-columns:1fr auto}.md-object{grid-template-columns:1fr 1fr}.md-object-main{grid-column:1/-1}.md-kpis{grid-template-columns:1fr 1fr}.md-grid3,.md-grid4{grid-template-columns:1fr}.md-room{grid-template-columns:28px 1fr 1fr}.md-room>div:nth-child(4),.md-room>div:nth-child(5),.md-room>div:nth-child(6){display:none}.md-room-sum{text-align:left}.md-fin{grid-template-columns:100px 1fr}.md-donut{width:90px;height:90px}.md-donut:after{inset:21px}}@media print{body{background:#fff}.md-actions{display:none}.md-wrap{max-width:none;padding:0}.md-card,.md-object,.md-kpi,.md-rooms{break-inside:avoid}}'+
  '</style></head><body><div class="md-wrap"><div class="md-top"><button class="md-back" id="mdBack" type="button" aria-label="Назад у A·CEIL">← Назад</button><div class="md-titlebox"><div class="md-brand">A·CEIL <b>PRO</b></div><h1>МЕНЕДЖЕРСЬКИЙ ЗВІТ</h1></div><div class="md-actions"><button onclick="window.print()">🖨 Друк / PDF</button><button class="cloud" id="mdCloud">🔗 Хмарне посилання</button><button class="blue" id="mdShare">↗ Поділитися</button></div></div><div class="md-cloudbox" id="mdCloudBox"><input id="mdCloudUrl" readonly><button id="mdCopy" type="button">Копіювати</button></div>'+
  '<section class="md-object"><div class="md-object-main"><small>Обʼєкт</small><h2>'+esc(obj.name||"—")+'</h2><p>'+esc(obj.addr||"")+'</p><p>'+esc(obj.phone||"")+'</p></div><div><small>Кімнат</small><b>'+rooms.length+'</b></div><div><small>Дата</small><b>'+new Date().toLocaleDateString("uk-UA")+'</b></div><div><small>Режим</small><b>Багатокімнатний</b></div><div><small>Статус</small><b>Актуальний</b></div></section>'+
  '<section class="md-kpis"><div class="md-kpi blue"><small>Загальна площа</small><b>'+fmt(a.area,2)+' м²</b></div><div class="md-kpi green"><small>Загальний периметр</small><b>'+fmt(a.per,2)+' м</b></div><div class="md-kpi orange"><small>Кількість кутів</small><b>'+fmt(a.corners,0)+' шт</b></div><div class="md-kpi violet"><small>Загальна сума</small><b>'+money(a.total)+'</b></div></section>'+
  '<section class="md-grid3">'+block("Профілі",a.profiles,"по всьому обʼєкту")+block("Полотно",a.canvas,"по всьому обʼєкту")+block("Вставка",a.insert,"по всьому обʼєкту")+'</section>'+
  '<section class="md-grid4"><section class="md-card"><div class="md-card-title">Освітлення</div>'+lightingRows+'</section><section class="md-card"><div class="md-card-title">Додаткові роботи / матеріали</div>'+otherRows+'</section><section class="md-card"><div class="md-card-title">Підсумок</div><div class="md-simple-row"><span>Площа</span><b>'+fmt(a.area,2)+' м²</b></div><div class="md-simple-row"><span>Периметр</span><b>'+fmt(a.per,2)+' м</b></div><div class="md-simple-row"><span>Профілі</span><b>'+fmt(vals(a.profiles).reduce(function(s,x){return s+x.qty},0),2)+' м</b></div><div class="md-simple-row"><span>Світло</span><b>'+fmt(a.lights,0)+' шт</b></div></section><section class="md-card"><div class="md-card-title">Фінанси</div><div class="md-fin"><div class="md-donut"></div><div>'+finLegend+'</div></div><div class="md-fin-total">'+money(a.total)+'</div></section></section>'+
  '<section class="md-rooms"><h3>Розбивка по кімнатах</h3>'+roomsHtml+'</section></div><script>(function(){var appUrl='+JSON.stringify(returnUrl)+',back=document.getElementById("mdBack"),cloud=document.getElementById("mdCloud"),share=document.getElementById("mdShare"),box=document.getElementById("mdCloudBox"),inp=document.getElementById("mdCloudUrl"),copy=document.getElementById("mdCopy");function appHost(){try{if(window.parent&&window.parent!==window&&typeof window.parent.A_CEIL_PublishManagerReport==="function")return window.parent}catch(e){}try{if(window.opener&&!window.opener.closed&&typeof window.opener.A_CEIL_PublishManagerReport==="function")return window.opener}catch(e){}return null}back.onclick=function(){var h=appHost();if(h&&typeof h.A_CEIL_CloseManagerReport==="function"){h.A_CEIL_CloseManagerReport();return}try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close()}}catch(e){}setTimeout(function(){if(!window.closed)location.replace(appUrl||"/")},180)};async function getCloud(){if(inp.value)return inp.value;if(/^\/report\/[a-f0-9]{20}\/?$/i.test(location.pathname)){inp.value=location.href;box.classList.add("show");cloud.textContent="✓ Хмарне посилання";return inp.value}var h=appHost();if(!h)throw new Error("Відкрийте звіт з A·CEIL");cloud.disabled=true;cloud.textContent="⏳ Завантаження…";try{var u=await h.A_CEIL_PublishManagerReport();inp.value=u;box.classList.add("show");cloud.textContent="✓ Хмарне посилання";return u}finally{cloud.disabled=false}}cloud.onclick=async function(){try{await getCloud()}catch(e){cloud.textContent="⚠️ "+(e.message||e)}};copy.onclick=async function(){try{await navigator.clipboard.writeText(inp.value);copy.textContent="✓ Скопійовано";setTimeout(function(){copy.textContent="Копіювати"},1500)}catch(e){inp.focus();inp.select()}};share.onclick=async function(){try{var u=await getCloud();if(navigator.share)await navigator.share({title:"Менеджерський звіт A·CEIL",url:u});else{await navigator.clipboard.writeText(u);share.textContent="✓ Скопійовано";setTimeout(function(){share.textContent="↗ Поділитися"},1500)}}catch(e){share.textContent="⚠️ Помилка"}};})();<\/script></body></html>';
}
window.A_CEIL_PublishManagerReport=async function(){
  var obj=activeObject();
  if(!obj||!obj.multiRoom||!Array.isArray(obj.rooms)||!obj.rooms.length)throw new Error("Немає багатокімнатного обʼєкта");
  var client=sbClient(),user=signedUser();
  if(!client)throw new Error("Supabase ще не підключений");
  if(!user||!user.id)throw new Error("Потрібна авторизація");
  var html=makeHtml(obj,aggregate(obj));
  var bytes=new Uint8Array(10);try{crypto.getRandomValues(bytes)}catch(_){for(var i=0;i<bytes.length;i++)bytes[i]=Math.floor(256*Math.random())}
  var token=Array.from(bytes).map(function(x){return x.toString(16).padStart(2,"0")}).join("");
  var payload={version:3,createdAt:new Date().toISOString(),reportType:"manager",managerHtml:html,meta:{name:String(obj.name||"Менеджерський звіт")}};
  var blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
  var result=await client.storage.from("roomator-reports").upload("r/"+token+".json",blob,{contentType:"application/json",upsert:false,cacheControl:"3600"});
  if(result.error)throw result.error;
  return "https://a-ceil.pp.ua/report/"+token;
};
window.A_CEIL_CloseManagerReport=function(){
  var overlay=document.getElementById("A_CEIL_ManagerReportOverlay");
  if(!overlay)return;
  var previous=overlay.getAttribute("data-prev-overflow");
  overlay.remove();
  document.body.style.overflow=previous==null?"":previous;
};
window.A_CEIL_OpenManagerReport=async function(){
  var obj=activeObject();
  if(!obj||!obj.multiRoom||!Array.isArray(obj.rooms)||!obj.rooms.length){try{showToast("Менеджерський звіт доступний для багатокімнатного обʼєкта")}catch(_){}return}
  window.A_CEIL_CloseManagerReport();
  var overlay=document.createElement("div"),frame=document.createElement("iframe");
  overlay.id="A_CEIL_ManagerReportOverlay";
  overlay.setAttribute("data-prev-overflow",document.body.style.overflow||"");
  overlay.style.cssText="position:fixed;inset:0;z-index:2147483600;background:#f7f9fc";
  frame.title="Менеджерський звіт A·CEIL";
  frame.setAttribute("allow","clipboard-write; web-share");
  frame.style.cssText="display:block;width:100%;height:100%;border:0;background:#f7f9fc";
  overlay.appendChild(frame);document.body.appendChild(overlay);document.body.style.overflow="hidden";
  frame.srcdoc=makeHtml(obj,aggregate(obj));
};
function injectManagerCard(){
  var modal=document.getElementById("reportSettingsModal");if(!modal)return;
  var obj=activeObject(),old=document.getElementById("A_CEIL_ManagerReportCard");
  if(!obj||!obj.multiRoom||!Array.isArray(obj.rooms)||!obj.rooms.length){if(old)old.remove();return}
  if(old)return;
  var target=document.getElementById("reportAudienceCard")||document.getElementById("rsToggles")||modal.firstElementChild;
  var card=document.createElement("div");card.id="A_CEIL_ManagerReportCard";
  card.innerHTML='<div class="mr-kicker">Багатокімнатний режим</div><div class="mr-title">📊 Менеджерський звіт</div><div class="mr-sub">Ключові показники обʼєкта, профілі, полотно, вставка, освітлення, фінанси та кімнати одним екраном.</div><button type="button">Відкрити менеджерський звіт</button>';
  card.querySelector("button").onclick=function(){try{if(typeof closeReportSettings==="function")closeReportSettings()}catch(_){}setTimeout(window.A_CEIL_OpenManagerReport,60)};
  if(target&&target.parentNode)target.parentNode.insertBefore(card,target);else modal.appendChild(card);
}
var prev=window.openReportSettings;
if(typeof prev==="function"&&!prev.__managerReportV2){var wrapped=function(){var r=prev.apply(this,arguments);setTimeout(injectManagerCard,30);setTimeout(injectManagerCard,160);return r};wrapped.__managerReportV2=true;window.openReportSettings=wrapped;try{openReportSettings=wrapped}catch(_){}}
document.addEventListener("click",function(e){try{var m=document.getElementById("reportSettingsModal");if(m&&m.style.display!=="none")setTimeout(injectManagerCard,20)}catch(_){}},true);
setTimeout(injectManagerCard,500);
})();
