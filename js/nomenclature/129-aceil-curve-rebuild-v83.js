
(function(){
"use strict";
if(window.__A·CEILCurveRebuildV83)return;
window.__A·CEILCurveRebuildV83=true;

function num(v){v=Number(String(v).replace(",","."));return Number.isFinite(v)?v:0;}
function chord(i){
  try{return Math.max(1,num(typeof _sideLenCm==="function"?_sideLenCm(i):(lengths||[])[i]));}
  catch(_){return 1;}
}
function ensure(){
  try{
    if(!Array.isArray(window.wallTypes))window.wallTypes=[];
    if(!Array.isArray(window.arcPoints))window.arcPoints=[];
    if(typeof wallTypes!=="undefined")while(wallTypes.length<(pts||[]).length)wallTypes.push("straight");
    if(typeof arcPoints!=="undefined")while(arcPoints.length<(pts||[]).length)arcPoints.push(null);
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function normalize(i){
  var L=chord(i),src=[];
  try{src=Array.isArray(arcPoints[i])?arcPoints[i]:[]}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  var start=null,end=null,controls=[];
  src.forEach(function(p){
    if(!p)return;
    if(p.role==="start")start=Math.max(0,Math.min(L,num(p.d)));
    else if(p.role==="end")end=Math.max(0,Math.min(L,num(p.d)));
    else if(p.role==="control")controls.push({d:num(p.d),o:num(p.o)});
    else if(Number.isFinite(Number(p.d)))controls.push({d:num(p.d),o:num(p.o)});
  });
  if(start===null)start=0;
  if(end===null)end=L;
  if(end<start){var t=start;start=end;end=t;}
  if(end-start<1)end=Math.min(L,start+1);
  controls=controls.map(function(p){
    return {d:Math.max(start,Math.min(end,p.d)),o:p.o};
  }).sort(function(a,b){return a.d-b.d;});
  return {start:start,end:end,controls:controls};
}
function save(i,data){
  ensure();
  var out=[
    {role:"start",d:+data.start.toFixed(2),o:0},
    {role:"end",d:+data.end.toFixed(2),o:0}
  ].concat((data.controls||[]).map(function(p){
    return {role:"control",d:+p.d.toFixed(2),o:+p.o.toFixed(2)};
  }));
  arcPoints[i]=out;
  window.arcPoints[i]=out;
}
function active(i){
  try{var d=normalize(i);return wallTypes[i]==="arc"&&d.end-d.start>0&&d.controls.length>0}catch(_){return false}
}

/* Smooth Catmull–Rom curve only between start and end. */
function sampleCurve(i,steps){
  var d=normalize(i),knots=[{d:d.start,o:0}].concat(d.controls).concat([{d:d.end,o:0}]);
  if(knots.length<3)return knots;
  var res=[knots[0]],count=Math.max(10,steps||20);
  function get(k){
    if(k<0){
      var a=knots[0],b=knots[1];
      return {d:2*a.d-b.d,o:2*a.o-b.o};
    }
    if(k>=knots.length){
      var z=knots[knots.length-1],y=knots[knots.length-2];
      return {d:2*z.d-y.d,o:2*z.o-y.o};
    }
    return knots[k];
  }
  function tj(t,p,q){return t+Math.pow(Math.max(Math.hypot(q.d-p.d,q.o-p.o),.001),.5)}
  function lerp(p,q,a,b,t){
    var den=b-a||1;
    return {d:(b-t)/den*p.d+(t-a)/den*q.d,o:(b-t)/den*p.o+(t-a)/den*q.o};
  }
  for(var s=0;s<knots.length-1;s++){
    var p0=get(s-1),p1=get(s),p2=get(s+1),p3=get(s+2);
    var t0=0,t1=tj(t0,p0,p1),t2=tj(t1,p1,p2),t3=tj(t2,p2,p3);
    for(var k=1;k<=count;k++){
      var t=t1+(t2-t1)*(k/count);
      var A1=lerp(p0,p1,t0,t1,t),A2=lerp(p1,p2,t1,t2,t),A3=lerp(p2,p3,t2,t3,t);
      var B1=lerp(A1,A2,t0,t2,t),B2=lerp(A2,A3,t1,t3,t);
      var C=lerp(B1,B2,t1,t2,t);
      C.d=Math.max(p1.d,Math.min(p2.d,C.d));
      res.push(C);
    }
  }
  return res;
}
function canvasPoints(i){
  try{
    var a=pts[i],b=pts[(i+1)%pts.length];
    if(!a||!b)return[];
    var L=chord(i),dx=b.x-a.x,dy=b.y-a.y,px=Math.hypot(dx,dy)||1;
    var ux=dx/px,uy=dy/px,nx=-uy,ny=ux,scale=px/L;
    var d=normalize(i);
    var local=[{d:d.start,o:0}].concat(sampleCurve(i,22).slice(1,-1)).concat([{d:d.end,o:0}]);
    return local.map(function(p){
      return {x:a.x+ux*p.d*scale+nx*p.o*scale,y:a.y+uy*p.d*scale+ny*p.o*scale};
    });
  }catch(_){return[]}
}
function curveOnlyLength(i){
  var arr=sampleCurve(i,32),sum=0;
  for(var k=1;k<arr.length;k++)sum+=Math.hypot(arr[k].d-arr[k-1].d,arr[k].o-arr[k-1].o);
  return sum;
}
function effectiveLength(i){
  var d=normalize(i),L=chord(i);
  return d.start+curveOnlyLength(i)+(L-d.end);
}
function totalCurve(){
  var sum=0;
  try{for(var i=0;i<(pts||[]).length;i++)if(active(i))sum+=curveOnlyLength(i)}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  return sum;
}
function refresh(i){
  try{
    var el=document.getElementById("sideArcLen_"+i);
    if(el)el.textContent=(curveOnlyLength(i)/100).toFixed(2);
    var per=document.getElementById("per");
    if(per&&typeof _totalPerimeterCm==="function")per.textContent=(_totalPerimeterCm()/100).toFixed(2);
    if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();
    if(typeof autoFillNomenclature==="function")autoFillNomenclature({silent:true});
    if(typeof saveState==="function")saveState();
  }catch(e){console.warn("Partial curve refresh",e)}
}
function rerender(i){
  var box=document.getElementById("sideArcEditor_"+i);
  if(box){
    box.style.display=active(i)?"":"none";
    box.innerHTML=active(i)?editor(i):"";
  }
  var btn=document.getElementById("sideArcBtn_"+i);
  if(btn){
    btn.textContent=active(i)?"〜 Крива":"〜 Пряма";
    btn.style.background=active(i)?"linear-gradient(135deg,#7c3aed,#a78bfa)":"#f1f5f9";
    btn.style.color=active(i)?"#fff":"#475569";
  }
}
function editor(i){
  var d=normalize(i),L=chord(i);
  var rows=d.controls.map(function(p,k){
    return '<div class="rm-curve-point-row">'+
      '<div class="rm-curve-point-num">'+(k+1)+'</div>'+
      '<label><span>Від початку стіни</span><input type="number" inputmode="decimal" step="0.1" value="'+p.d+'" oninput="updateArcPoint('+i+','+k+',\'d\',this.value)"></label>'+
      '<label><span>Відхилення</span><input type="number" inputmode="decimal" step="0.1" value="'+p.o+'" oninput="updateArcPoint('+i+','+k+',\'o\',this.value)"></label>'+
      '<button type="button" class="rm-curve-remove" onclick="removeArcPoint('+i+','+k+')">×</button>'+
    '</div>';
  }).join("");
  return '<div class="rm-curve-editor">'+
    '<div class="rm-curve-head"><b>Криволінійна ділянка</b><span>Довжина кривої <strong id="sideArcLen_'+i+'">'+(curveOnlyLength(i)/100).toFixed(2)+'</strong> м</span></div>'+
    '<div class="rm-curve-help">Стіна лишається одна. Вкажіть, де починається та закінчується крива. До і після неї залишаться прямі ділянки.</div>'+
    '<div class="rm-curve-range">'+
      '<label><span>Початок кривої від '+N(i)+', см</span><input type="number" inputmode="decimal" step="0.1" value="'+d.start+'" oninput="setCurveBoundary('+i+',\'start\',this.value)"></label>'+
      '<label><span>Кінець кривої від '+N(i)+', см</span><input type="number" inputmode="decimal" step="0.1" value="'+d.end+'" oninput="setCurveBoundary('+i+',\'end\',this.value)"></label>'+
    '</div>'+
    '<div class="rm-curve-mini">Стіна '+N(i)+N((i+1)%pts.length)+' — '+window._formatReportCm(L)+' см</div>'+
    rows+
    '<div class="rm-curve-actions">'+
      '<button type="button" onclick="addArcPoint('+i+')">＋ Додати точку вигину</button>'+
      '<button type="button" onclick="setSimpleArc('+i+')">Одна точка по центру</button>'+
      '<button type="button" class="danger" onclick="removeCurveFromSide('+i+')">Зробити прямою</button>'+
    '</div>'+
  '</div>';
}
function toggle(i){
  ensure();
  if(active(i))return removeCurve(i);
  var L=chord(i),start=+(L*.2).toFixed(1),end=+(L*.8).toFixed(1);
  wallTypes[i]="arc";
  save(i,{start:start,end:end,controls:[{d:+((start+end)/2).toFixed(1),o:20}]});
  rerender(i);refresh(i);
}
function setBoundary(i,key,val){
  var d=normalize(i),L=chord(i),v=Math.max(0,Math.min(L,num(val)));
  if(key==="start"){
    d.start=Math.min(v,d.end-1);
    d.controls.forEach(function(p){if(p.d<d.start)p.d=d.start});
  }else{
    d.end=Math.max(v,d.start+1);
    d.controls.forEach(function(p){if(p.d>d.end)p.d=d.end});
  }
  save(i,d);rerender(i);refresh(i);
}
function addPoint(i){
  var d=normalize(i),best=(d.start+d.end)/2;
  if(d.controls.length){
    var list=[d.start].concat(d.controls.map(function(p){return p.d})).concat([d.end]),gap=-1;
    for(var k=1;k<list.length;k++)if(list[k]-list[k-1]>gap){gap=list[k]-list[k-1];best=(list[k]+list[k-1])/2}
  }
  d.controls.push({d:+best.toFixed(1),o:20});
  save(i,d);rerender(i);refresh(i);
}
function removePoint(i,k){
  var d=normalize(i);d.controls.splice(k,1);
  if(!d.controls.length)return removeCurve(i);
  save(i,d);rerender(i);refresh(i);
}
function updatePoint(i,k,key,val){
  var d=normalize(i);if(!d.controls[k])return;
  if(key==="d")d.controls[k].d=Math.max(d.start,Math.min(d.end,num(val)));
  else d.controls[k].o=num(val);
  save(i,d);refresh(i);
}
function simple(i){
  var d=normalize(i),offset=d.controls.length?d.controls[0].o:20;
  d.controls=[{d:+((d.start+d.end)/2).toFixed(1),o:offset||20}];
  save(i,d);rerender(i);refresh(i);
}
function removeCurve(i){
  ensure();wallTypes[i]="straight";arcPoints[i]=null;window.arcPoints[i]=null;rerender(i);refresh(i);
}

/* One source of truth for draw, perimeter, report and nomenclature. */
window._sideArcPts=function(i){return normalize(i).controls};
window._isArcSide=active;
window._sideArcCanvasPts=canvasPoints;
window._sideCurveLenCm=effectiveLength;
window._sideEffectiveLenCm=function(i){return active(i)?effectiveLength(i):num(lengths[i])||chord(i)};
window._totalCurveLengthCm=totalCurve;
window.totalCurveLength=function(){return Math.round(totalCurve())/100};
window.getArcSidesCount=function(){var n=0;for(var i=0;i<(pts||[]).length;i++)if(active(i))n++;return n};
try{
  _sideArcPts=window._sideArcPts;
  _isArcSide=active;
  _sideArcCanvasPts=canvasPoints;
  _sideCurveLenCm=effectiveLength;
  _sideEffectiveLenCm=window._sideEffectiveLenCm;
  _totalCurveLengthCm=totalCurve;
}catch(_){window.__diagSilent&&window.__diagSilent(_)}

window.renderArcPointsEditor=editor;
window.toggleSideArcType=toggle;
window.setCurveBoundary=setBoundary;
window.addArcPoint=addPoint;
window.removeArcPoint=removePoint;
window.updateArcPoint=updatePoint;
window.setSimpleArc=simple;
window.removeCurveFromSide=removeCurve;
try{
  renderArcPointsEditor=editor;
  toggleSideArcType=toggle;
  addArcPoint=addPoint;
  removeArcPoint=removePoint;
  updateArcPoint=updatePoint;
}catch(_){window.__diagSilent&&window.__diagSilent(_)}

var oldOpen=window.openSideInputModal;
if(typeof oldOpen==="function"){
  window.openSideInputModal=function(){
    ensure();
    var r=oldOpen.apply(this,arguments);
    setTimeout(function(){for(var i=0;i<(pts||[]).length;i++)rerender(i)},0);
    return r;
  };
  try{openSideInputModal=window.openSideInputModal}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
ensure();
})();
