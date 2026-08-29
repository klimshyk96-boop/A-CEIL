
(function(){
"use strict";
if(window.__A·CEILCurveMeasureV301)return;
window.__A·CEILCurveMeasureV301=true;

var activeSide=-1;
var draft=null;

function n(v){
  v=Number(String(v==null?"":v).replace(",","."));
  return Number.isFinite(v)?v:0;
}
function wallLen(i){
  try{return Math.max(1,n(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i]))}
  catch(_){return 1}
}
function sideName(i){
  try{return N(i)+N((i+1)%pts.length)}
  catch(_){return "№"+(i+1)}
}
function defaultDraft(i){
  var L=wallLen(i);
  return {
    startCorner:i,
    startOffset:+(L*.2).toFixed(1),
    points:[
      {arcLen:+(L*.2).toFixed(1),diagCorner:(i-1+pts.length)%pts.length,diag:0}
    ]
  };
}
function readExisting(i){
  try{
    var raw=Array.isArray(arcPoints[i])?arcPoints[i]:null;
    if(raw&&raw.length&&raw[0]&&raw[0].model==="measure-points"){
      return JSON.parse(JSON.stringify(raw[0].data));
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return defaultDraft(i);
}
function pointLabel(k){return "C"+(k+1)}
function render(){
  if(!draft)return;
  var startSel=document.getElementById("cmStartCornerV301");
  startSel.innerHTML="";
  [activeSide,(activeSide+1)%pts.length].forEach(function(idx){
    var o=document.createElement("option");
    o.value=idx;o.textContent=N(idx);
    if(idx===draft.startCorner)o.selected=true;
    startSel.appendChild(o);
  });
  document.getElementById("cmStartOffsetV301").value=draft.startOffset;

  var box=document.getElementById("cmPointsV301");
  box.innerHTML=draft.points.map(function(p,k){
    var opts="";
    for(var i=0;i<pts.length;i++){
      opts+='<option value="'+i+'" '+(i===p.diagCorner?'selected':'')+'>'+N(i)+'</option>';
    }
    var from=k===0?"початку кривої":pointLabel(k-1);
    return '<div class="cm-point">'+
      '<div class="cm-point-head"><div class="cm-point-name">Точка '+pointLabel(k)+'</div>'+
      '<button type="button" class="cm-del" onclick="rmCurveMeasureDeletePointV301('+k+')">×</button></div>'+
      '<div class="cm-grid">'+
        '<label><span>Відстань від '+from+', см</span>'+
        '<input type="number" inputmode="decimal" step="0.1" value="'+p.arcLen+'" oninput="rmCurveMeasureUpdatePointV301('+k+',\'arcLen\',this.value)"></label>'+
        '<label><span>Діагональ від кута</span>'+
        '<select onchange="rmCurveMeasureUpdatePointV301('+k+',\'diagCorner\',this.value)">'+opts+'</select></label>'+
      '</div>'+
      '<label><span data-cm-diag-label="'+k+'">Діагональ '+N(p.diagCorner)+' → '+pointLabel(k)+', см</span>'+
      '<input type="number" inputmode="decimal" step="0.1" value="'+(p.diag||"")+'" oninput="rmCurveMeasureUpdatePointV301('+k+',\'diag\',this.value)"></label>'+
    '</div>';
  }).join("");

  document.getElementById("cmRemoveV301").style.display=
    (wallTypes[activeSide]==="arc")?"block":"none";
  updatePreview();
}
function updatePreview(){
  if(!draft)return;
  var total=draft.points.reduce(function(s,p){return s+n(p.arcLen)},0);
  var complete=draft.points.filter(function(p){return n(p.arcLen)>0&&n(p.diag)>0}).length;
  document.getElementById("cmPreviewV301").textContent=
    "Початок від "+N(draft.startCorner)+": "+draft.startOffset+
    " см · точок: "+draft.points.length+
    " · сума відрізків: "+total.toFixed(1)+" см"+
    " · заповнено діагоналей: "+complete+"/"+draft.points.length;
}
function open(i){
  activeSide=Number(i);
  if(!(activeSide>=0))return;
  draft=readExisting(activeSide);

  var m=document.getElementById("rmCurveMeasureModalV301");
  document.getElementById("cmWallLabelV301").textContent=
    "Стіна "+sideName(activeSide)+" · "+wallLen(activeSide)+" см";
  render();
  m.classList.add("open");
  m.setAttribute("aria-hidden","false");
}
function close(){
  var m=document.getElementById("rmCurveMeasureModalV301");
  m.classList.remove("open");
  m.setAttribute("aria-hidden","true");
}
function addPoint(){
  if(!draft)return;
  var lastCorner=draft.points.length?draft.points[draft.points.length-1].diagCorner:
    (activeSide-1+pts.length)%pts.length;
  draft.points.push({arcLen:50,diagCorner:lastCorner,diag:0});
  render();
  setTimeout(function(){
    var cards=document.querySelectorAll("#cmPointsV301 .cm-point");
    if(cards.length)cards[cards.length-1].scrollIntoView({behavior:"smooth",block:"center"});
  },30);
}
function deletePoint(k){
  if(!draft)return;
  draft.points.splice(k,1);
  if(!draft.points.length)draft.points.push({arcLen:50,diagCorner:(activeSide-1+pts.length)%pts.length,diag:0});
  render();
}
function updatePoint(k,key,val){
  if(!draft||!draft.points[k])return;
  if(key==="diagCorner"){
    draft.points[k][key]=Number(val);
    var label=document.querySelector('[data-cm-diag-label="'+k+'"]');
    if(label)label.textContent="Діагональ "+N(draft.points[k].diagCorner)+" → "+pointLabel(k)+", см";
  }else{
    draft.points[k][key]=n(val);
  }
  updatePreview();
}
function save(){
  if(!draft||activeSide<0)return;
  draft.startCorner=Number(document.getElementById("cmStartCornerV301").value);
  draft.startOffset=n(document.getElementById("cmStartOffsetV301").value);

  if(draft.startOffset<0||draft.startOffset>wallLen(activeSide)){
    try{showToast("Перевір відстань до початку кривої")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return;
  }
  if(!draft.points.length){
    try{showToast("Додай хоча б одну точку")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return;
  }
  for(var i=0;i<draft.points.length;i++){
    if(!(n(draft.points[i].arcLen)>0)){
      try{showToast("Вкажи довжину до точки "+pointLabel(i))}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      return;
    }
    if(!(n(draft.points[i].diag)>0)){
      try{showToast("Вкажи діагональ до точки "+pointLabel(i))}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      return;
    }
  }

  if(!Array.isArray(wallTypes))wallTypes=[];
  if(!Array.isArray(arcPoints))arcPoints=[];
  wallTypes[activeSide]="arc";
  arcPoints[activeSide]=[{model:"measure-points",data:JSON.parse(JSON.stringify(draft))}];
  window.wallTypes=wallTypes;window.arcPoints=arcPoints;

  if(typeof saveState==="function")saveState();
  if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();
  close();
  try{showToast("Криволінійну ділянку збережено")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function remove(){
  if(activeSide<0)return;
  wallTypes[activeSide]="straight";
  arcPoints[activeSide]=null;
  if(typeof saveState==="function")saveState();
  if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();
  close();
  try{showToast("Криволінійну ділянку видалено")}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}

window.rmCurveOpenV87=open;
window.rmCurveMeasureOpenV301=open;
window.rmCurveMeasureCloseV301=close;
window.rmCurveMeasureAddPointV301=addPoint;
window.rmCurveMeasureDeletePointV301=deletePoint;
window.rmCurveMeasureUpdatePointV301=updatePoint;
window.rmCurveMeasureSaveV301=save;
window.rmCurveMeasureRemoveV301=remove;

window.A·CEILWallCurveV89=function(){
  var side=Number(window.__A·CEILSelectedSideV89);
  var menu=document.getElementById("rmWallTapMenuV84");
  if(menu){
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden","true");
    menu.style.display="none";
    menu.style.pointerEvents="none";
  }
  if(side>=0)open(side);
};

var oldMenuOpen=window.rmWallTapOpenV84;
window.rmWallTapOpenV84=function(side){
  var menu=document.getElementById("rmWallTapMenuV84");
  if(menu){menu.style.display="";menu.style.pointerEvents="auto";}
  return typeof oldMenuOpen==="function"?oldMenuOpen.apply(this,arguments):undefined;
};

var startSel=document.getElementById("cmStartCornerV301");
var startInput=document.getElementById("cmStartOffsetV301");
if(startSel)startSel.addEventListener("change",function(){if(draft){draft.startCorner=Number(this.value);updatePreview()}});
if(startInput)startInput.addEventListener("input",function(){if(draft){draft.startOffset=n(this.value);updatePreview()}});
})();
