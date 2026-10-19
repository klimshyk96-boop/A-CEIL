(function(){
"use strict";
if(window.__A·CEILCurveMeasureV301)return;
window.__A·CEILCurveMeasureV301=true;
var activeSide=-1,draft=null;
function n(v){v=Number(String(v==null?"":v).replace(",","."));return Number.isFinite(v)?v:0}
function geometry(){return window.A·CEILCurveGeometryV306}
function uid(){return "curve_"+(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random().toString(36).slice(2))}
function freshPoint(){return{id:uid(),chordCm:0,curveCm:0,diagCorner:(activeSide-1+pts.length)%pts.length,diag:0}}
function maps(){return geometry().labels(null,activeSide,draft)}
function pointLabel(k){return maps().controls[activeSide][k]}
function endLabel(){return maps().corners[(activeSide+1)%pts.length]}
function previousLabel(k){return k?pointLabel(k-1):maps().corners[activeSide]}
function sideName(){return maps().corners[activeSide]+endLabel()}
function readExisting(i){
  var raw=arcPoints[i],data=raw&&raw[0]&&raw[0].model==="measure-points"&&raw[0].data;
  if(data&&Number(data.version)===3)return JSON.parse(JSON.stringify(data));
  var out={version:3,startCorner:i,startOffset:0,endOffset:0,points:[],endChordCm:n(typeof _sideLenCm==="function"?_sideLenCm(i):lengths[i]),endCurveCm:0};
  // Old projects remain untouched until Apply. Old distances were chords;
  // never present spline-derived tape lengths as measurements.
  if(!data)data=geometry().legacyToMeasure(i,raw);
  if(data){
    var solved=geometry().solveData(i,data);
    if(solved.ok){
      var route=[solved.start].concat(solved.controls,[solved.end]);
      if(solved.startCorner!==i)route.reverse();
      var rp=solved.real,a=rp[i],b=rp[(i+1)%rp.length];
      if(Math.hypot(route[0].x-a.x,route[0].y-a.y)>.01)route.unshift(a);
      if(Math.hypot(route[route.length-1].x-b.x,route[route.length-1].y-b.y)>.01)route.push(b);
      out.points=route.slice(1,-1).map(function(p,k){
        var prior=route[k],original=solved.controls.indexOf(p),item=original>=0?data.points[original]:{};
        return{id:uid(),chordCm:+Math.hypot(p.x-prior.x,p.y-prior.y).toFixed(2),curveCm:0,diagCorner:item.diagCorner==null?(i-1+pts.length)%pts.length:item.diagCorner,diag:n(item.diag)};
      });
      var prior=route[route.length-2];out.endChordCm=+Math.hypot(b.x-prior.x,b.y-prior.y).toFixed(2);
    }
  }
  return out;
}
function input(k,key,value){return '<input type="number" min="0" inputmode="decimal" step="0.1" placeholder="Не задано" value="'+(Number(n(value).toFixed(2))||"")+'" oninput="rmCurveMeasureUpdatePointV301('+k+',\''+key+'\',this.value)">'}
function render(){
  var map=maps(),box=document.getElementById("cmPointsV301");
  document.getElementById("cmWallLabelV301").textContent="Стіна "+sideName()+" · точки вздовж контуру";
  var outside=geometry().outwardSign(),direction=document.getElementById("cmDirectionV3");
  direction.innerHTML='<option value="'+outside+'">Назовні приміщення</option><option value="'+(-outside)+'">Усередину приміщення</option>';
  direction.value=String(n(draft.bulgeSign)||outside);
  box.innerHTML=draft.points.map(function(p,k){
    var options=map.corners.map(function(label,i){return '<option value="'+i+'" '+(i===Number(p.diagCorner)?'selected':'')+'>'+label+'</option>'}).join("");
    return '<div class="cm-point" data-curve-point="'+k+'"><div class="cm-point-head"><div class="cm-point-name">Ділянка '+previousLabel(k)+pointLabel(k)+'</div><button type="button" class="cm-del" aria-label="Видалити точку" onclick="rmCurveMeasureDeletePointV301('+k+')">×</button></div>'+
      '<div class="cm-grid"><label><span>По прямій, см</span>'+input(k,"chordCm",p.chordCm)+'</label><label><span>По кривій, см</span>'+input(k,"curveCm",p.curveCm)+'</label></div>'+
      '<div class="cm-grid"><label><span>Діагональ до '+pointLabel(k)+' від кута</span><select onchange="rmCurveMeasureUpdatePointV301('+k+',\'diagCorner\',this.value)">'+options+'</select></label>'+
      '<label><span data-cm-diag-label="'+k+'">'+map.corners[Number(p.diagCorner)]+pointLabel(k)+', см · необов’язково</span>'+input(k,"diag",p.diag)+'</label></div></div>';
  }).join("")+
    '<div class="cm-point"><div class="cm-point-name">'+(draft.points.length?'Остання ділянка '+pointLabel(draft.points.length-1)+endLabel():'Ділянка '+sideName())+'</div><div class="cm-grid"><label><span>По прямій, см</span>'+input(-1,"endChordCm",draft.endChordCm)+'</label><label><span>По кривій, см</span>'+input(-1,"endCurveCm",draft.endCurveCm)+'</label></div></div>';
  document.getElementById("cmRemoveV301").style.display=wallTypes[activeSide]==="arc"?"block":"none";
  updatePreview();
}
function updatePreview(){
  var chords=draft.points.reduce(function(s,p){return s+n(p.chordCm)},n(draft.endChordCm)),tape=draft.points.reduce(function(s,p){return s+n(p.curveCm)},n(draft.endCurveCm)),diags=draft.points.filter(function(p){return n(p.diag)>0}).length;
  document.getElementById("cmPreviewV301").textContent=draft.points.length
    ?"Хорди: "+chords.toFixed(1)+" см · по кривій введено: "+tape.toFixed(1)+" см · діагоналей: "+diags+"/"+draft.points.length+". Без усіх діагоналей або довжин кривої форма наближена."
    :"Одна дуга · по прямій: "+chords.toFixed(1)+" см · по кривій: "+(tape>0?tape.toFixed(1)+" см":"не задано")+". Проміжні точки не потрібні для простої кругової дуги.";
}
function open(i){
  activeSide=Number(i);if(!(activeSide>=0&&activeSide<pts.length))return;
  draft=readExisting(activeSide);
  draft.points.forEach(function(p){if(!p.id)p.id=uid()});
  render();var m=document.getElementById("rmCurveMeasureModalV301");m.classList.add("open");m.setAttribute("aria-hidden","false");
}
function close(){var m=document.getElementById("rmCurveMeasureModalV301");m.classList.remove("open");m.setAttribute("aria-hidden","true")}
function addPoint(){
  if(!draft||draft.points.length>=24)return;
  draft.points.push(freshPoint());draft.endChordCm=0;draft.endCurveCm=0;render();
  var cards=document.querySelectorAll("#cmPointsV301 .cm-point");
  if(cards.length)cards[cards.length-2].scrollIntoView({behavior:"smooth",block:"center"});
}
function deletePoint(k){
  if(!draft||!draft.points[k])return;
  var removed=draft.points[k],next=draft.points[k+1],last=k===draft.points.length-1;
  var followingTape=last?n(draft.endCurveCm):n(next.curveCm),mergedTape=n(removed.curveCm)>0&&followingTape>0?n(removed.curveCm)+followingTape:0;
  draft.points.splice(k,1);
  if(last){draft.endChordCm=draft.points.length?0:n(typeof _sideLenCm==="function"?_sideLenCm(activeSide):lengths[activeSide]);draft.endCurveCm=mergedTape}
  else{draft.points[k].chordCm=0;draft.points[k].curveCm=mergedTape}
  render();
}
function updatePoint(k,key,value){
  if(!draft)return;
  if(k<0)draft[key]=n(value);
  else if(draft.points[k])draft.points[k][key]=n(value);
  if(key==="diagCorner"){
    var label=document.querySelector('[data-cm-diag-label="'+k+'"]');
    if(label)label.textContent=maps().corners[n(value)]+pointLabel(k)+", см · необов’язково";
  }
  updatePreview();
}
function save(){
  if(!draft||activeSide<0)return;
  draft.version=3;draft.startCorner=activeSide;draft.bulgeSign=n(document.getElementById("cmDirectionV3").value);
  var checked=geometry().solveData(activeSide,draft);
  if(!checked.ok){
    var messages={invalid_chord:"Вкажи розмір по прямій для кожної ділянки, включно з останньою.",invalid_arc:"По кривій має бути не менше, ніж по прямій. Для вигину понад півколо додай проміжну точку.",invalid_diagonal:"Перевір вибраний кут діагоналі.",no_intersection:"Ці хорди й діагоналі не складаються в контур. Перевір заміри."};
    showToast(messages[checked.error]||"Не вдалося побудувати криву.",6000);return;
  }
  wallTypes[activeSide]="arc";arcPoints[activeSide]=[{model:"measure-points",data:JSON.parse(JSON.stringify(draft))}];
  window.wallTypes=wallTypes;window.arcPoints=arcPoints;geometry().stabilize(activeSide);
  if(typeof saveState==="function")saveState();
  if(typeof requestDraw==="function")requestDraw();else draw();
  geometry().updateStats();close();
  showToast(checked.approximate?"Криву збережено. Жовтий знак пояснить, які заміри ще потрібні.":"Криву збережено за введеними замірами.",4200);
}
function remove(){
  if(activeSide<0)return;
  wallTypes[activeSide]="straight";arcPoints[activeSide]=null;
  if(typeof saveState==="function")saveState();
  if(typeof requestDraw==="function")requestDraw();else draw();
  geometry().updateStats();close();
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
  var side=Number(window.__A·CEILSelectedSideV89),menu=document.getElementById("rmWallTapMenuV84");
  if(menu){menu.classList.remove("open");menu.style.display="none"}
  if(side>=0)open(side);
};
})();
