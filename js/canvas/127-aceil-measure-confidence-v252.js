
(function(){
"use strict";

var lastSignature="";
var timer=null;

function getPoints(){
  try{ if(typeof pts!=="undefined" && Array.isArray(pts)) return pts; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ if(Array.isArray(window.pts)) return window.pts; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return [];
}
function getRealPoints(){
  try{ if(typeof realPts!=="undefined" && Array.isArray(realPts)) return realPts; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ if(Array.isArray(window.realPts)) return window.realPts; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return [];
}
function getLengths(){
  try{ if(typeof lengths!=="undefined" && Array.isArray(lengths)) return lengths; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ if(Array.isArray(window.lengths)) return window.lengths; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return [];
}
function getDiagonalsArr(){
  try{ if(typeof diagonals!=="undefined" && Array.isArray(diagonals)) return diagonals; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ if(Array.isArray(window.diagonals)) return window.diagonals; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return [];
}
function getDiagonalOverrides(){
  try{ if(typeof diagonalOverrides!=="undefined" && diagonalOverrides) return diagonalOverrides; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ if(window.diagonalOverrides) return window.diagonalOverrides; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return {};
}
function isClosed(){
  try{ if(typeof closed!=="undefined") return closed===true; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try{ return window.closed===true; }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return false;
}
function finitePoint(p){
  return !!p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y));
}
function labelPoint(i){
  var s="",n=i+1;
  while(n>0){ n--; s=String.fromCharCode(65+n%26)+s; n=Math.floor(n/26); }
  return s;
}
function distance(a,b){
  return Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
}
function tol(lengthCm){
  var L=Math.max(0,Number(lengthCm)||0);
  return {ok:Math.max(1.5,L*0.012),major:Math.max(3,L*0.025)};
}
function closureCheck(){
  var rp=getRealPoints().filter(finitePoint);
  var lens=getLengths();
  var n=rp.length;
  if(n<4||!isClosed()) return null; // n===3: a triangle's shape is fully set by its 3 sides alone; the sketch's tapped angle carries no real measurement, so a mismatch here is not a proven error — skip it rather than false-flag
  var last=rp[n-1],first=rp[0];
  var enteredCm=Number(lens[n-1])||0;
  if(!(enteredCm>0)) return null;
  var impliedCm=distance(last,first);
  if(!Number.isFinite(impliedCm)) return null;
  return {impliedCm:impliedCm,enteredCm:enteredCm,diffCm:Math.abs(impliedCm-enteredCm),sideLabel:labelPoint(n-1)+labelPoint(0)};
}
function diagonalChecks(){
  var rp=getRealPoints().filter(finitePoint);
  var diagList=getDiagonalsArr();
  var overrides=getDiagonalOverrides()||{};
  var out=[];
  if(rp.length<3||!diagList.length) return out;
  diagList.forEach(function(d){
    if(!Array.isArray(d)||d.length<2) return;
    var a=Math.min(d[0],d[1]),b=Math.max(d[0],d[1]);
    if(!rp[a]||!rp[b]) return;
    var key=labelPoint(a)+labelPoint(b);
    var entered=overrides[key];
    if(entered==null||!(Number(entered)>0)) return;
    var impliedCm=distance(rp[a],rp[b]);
    if(!Number.isFinite(impliedCm)) return;
    out.push({key:key,a:a,b:b,enteredCm:Number(entered),impliedCm:impliedCm,diffCm:Math.abs(impliedCm-Number(entered))});
  });
  return out;
}
function sidesBetween(a,b,n){
  var fwd=[],i=a; while(i!==b){fwd.push(i);i=(i+1)%n;}
  var bwd=[],j=b; while(j!==a){bwd.push(j);j=(j+1)%n;}
  return fwd.length<=bwd.length?fwd:bwd;
}
function computeConflictZone(candidateSets){
  var sets=(candidateSets||[]).filter(function(s){return s&&s.length;});
  if(!sets.length) return null;
  sets.sort(function(a,b){return a.length-b.length;});
  var base=sets[0].slice();
  for(var k=1;k<sets.length;k++){
    var s=sets[k];
    base=base.filter(function(x){return s.indexOf(x)>=0;});
  }
  if(!base.length) base=sets[0].slice(); // evidence conflicts with itself — fall back to the tightest known zone rather than claim nothing
  return base;
}
function zoneLabel(sideIdxs,n){
  if(!sideIdxs||!sideIdxs.length) return "";
  var contiguous=true;
  for(var k=1;k<sideIdxs.length;k++){ if(sideIdxs[k]!==(sideIdxs[k-1]+1)%n){contiguous=false;break;} }
  if(contiguous){
    var verts=[sideIdxs[0]];
    sideIdxs.forEach(function(s){verts.push((s+1)%n);});
    return verts.map(function(v){return labelPoint(v);}).join("–");
  }
  return sideIdxs.map(function(s){return labelPoint(s)+labelPoint((s+1)%n);}).join(", ");
}
function splitIntoGroups(sideIdxs,n){
  var remaining=sideIdxs.slice();
  var groups=[];
  while(remaining.length){
    var group=[remaining.shift()];
    var changed=true;
    while(changed){
      changed=false;
      for(var k=0;k<remaining.length;k++){
        var s=remaining[k];
        if(s===(group[group.length-1]+1)%n){ group.push(s); remaining.splice(k,1); changed=true; break; }
        if((s+1)%n===group[0]){ group.unshift(s); remaining.splice(k,1); changed=true; break; }
      }
    }
    groups.push(group);
  }
  return groups;
}
function recommendZoneDiagonal(sideIdxs,n){
  if(!sideIdxs||sideIdxs.length<2||n<4) return null; // n<4: no diagonal can exist at all (triangle)
  function isRealDiagonal(a,b){
    if(a===b) return false;
    var lo=Math.min(a,b),hi=Math.max(a,b);
    var gapFwd=hi-lo,gapBwd=n-gapFwd;
    return gapFwd>1&&gapBwd>1; // >1 means at least one vertex lies strictly between them on both arcs — a genuine diagonal, not an existing wall
  }
  var groups=splitIntoGroups(sideIdxs,n);
  if(groups.length===1){
    var g=groups[0];
    var verts=[g[0]];
    g.forEach(function(s){verts.push((s+1)%n);});
    if(verts.length<3) return null;
    var mid=Math.floor(verts.length/2);
    var candidates=[];
    if(mid>0&&mid<verts.length-1) candidates.push([verts[mid],verts[0]],[verts[mid],verts[verts.length-1]]);
    candidates.push([verts[0],verts[verts.length-1]]); // fallback: skip straight over the lone interior vertex (narrow zones)
    for(var ci=0;ci<candidates.length;ci++){
      var a=candidates[ci][0],b=candidates[ci][1];
      if(isRealDiagonal(a,b)){
        var lo=Math.min(a,b),hi=Math.max(a,b);
        return {a:lo,b:hi,label:labelPoint(lo)+labelPoint(hi)};
      }
    }
    return null;
  }
  // Disjoint groups (e.g. a rectangle's two opposite sides): connect an endpoint of one group to an endpoint of another.
  for(var gi=0;gi<groups.length;gi++){
    for(var gj=gi+1;gj<groups.length;gj++){
      var vertsA=[groups[gi][0],(groups[gi][groups[gi].length-1]+1)%n];
      var vertsB=[groups[gj][0],(groups[gj][groups[gj].length-1]+1)%n];
      for(var ai=0;ai<vertsA.length;ai++){
        for(var bi=0;bi<vertsB.length;bi++){
          var a2=vertsA[ai],b2=vertsB[bi];
          if(isRealDiagonal(a2,b2)){
            var lo2=Math.min(a2,b2),hi2=Math.max(a2,b2);
            return {a:lo2,b:hi2,label:labelPoint(lo2)+labelPoint(hi2)};
          }
        }
      }
    }
  }
  return null;
}
function orient(a,b,c){
  return (Number(b.x)-Number(a.x))*(Number(c.y)-Number(a.y))-
         (Number(b.y)-Number(a.y))*(Number(c.x)-Number(a.x));
}
function onSegment(a,b,c){
  return Math.min(Number(a.x),Number(c.x))-1e-7<=Number(b.x) &&
         Number(b.x)<=Math.max(Number(a.x),Number(c.x))+1e-7 &&
         Math.min(Number(a.y),Number(c.y))-1e-7<=Number(b.y) &&
         Number(b.y)<=Math.max(Number(a.y),Number(c.y))+1e-7;
}
function segmentsIntersect(a,b,c,d){
  var o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  if((o1>0&&o2<0||o1<0&&o2>0)&&(o3>0&&o4<0||o3<0&&o4>0)) return true;
  if(Math.abs(o1)<1e-7&&onSegment(a,c,b)) return true;
  if(Math.abs(o2)<1e-7&&onSegment(a,d,b)) return true;
  if(Math.abs(o3)<1e-7&&onSegment(c,a,d)) return true;
  if(Math.abs(o4)<1e-7&&onSegment(c,b,d)) return true;
  return false;
}
function hasSelfIntersection(points,closedShape){
  var n=points.length;
  if(n<4) return false;
  var edgeCount=closedShape?n:n-1;
  for(var i=0;i<edgeCount;i++){
    var a=points[i],b=points[(i+1)%n];
    for(var j=i+1;j<edgeCount;j++){
      if(j===i||j===i+1) continue;
      if(closedShape&&i===0&&j===edgeCount-1) continue;
      var c=points[j],d=points[(j+1)%n];
      if(segmentsIntersect(a,b,c,d)) return true;
    }
  }
  return false;
}
function duplicatePairs(points){
  var arr=[];
  for(var i=0;i<points.length;i++){
    for(var j=i+1;j<points.length;j++){
      var d=distance(points[i],points[j]);
      if(d<0.5) arr.push({i:i,j:j,d:d});
    }
  }
  return arr;
}
function interiorAngle(prev,cur,next){
  var ax=Number(prev.x)-Number(cur.x), ay=Number(prev.y)-Number(cur.y);
  var bx=Number(next.x)-Number(cur.x), by=Number(next.y)-Number(cur.y);
  var la=Math.hypot(ax,ay),lb=Math.hypot(bx,by);
  if(!la||!lb) return NaN;
  var c=(ax*bx+ay*by)/(la*lb);
  c=Math.max(-1,Math.min(1,c));
  return Math.acos(c)*180/Math.PI;
}
function allCornersRightAngled(points,tolerance){
  var n=points.length;
  if(n<3) return false;
  for(var i=0;i<n;i++){
    var a=interiorAngle(points[(i-1+n)%n],points[i],points[(i+1)%n]);
    if(!Number.isFinite(a)) return false;
    var d=Math.min(Math.abs(a-90),Math.abs(a-270));
    if(d>tolerance) return false;
  }
  return true;
}
function classifyShape(points,closedShape){
  if(!closedShape||points.length<3) return {type:"open",label:"Незамкнений контур",simple:false};
  var rightAngled=allCornersRightAngled(points,4);
  if(points.length===4 && rightAngled){
    return {type:"rectangle",label:"Прямокутна форма",simple:true};
  }
  if(points.length===6 && rightAngled){
    return {type:"lshape",label:"Г-подібна форма",simple:true};
  }
  if(rightAngled) return {type:"orthogonal",label:"Ортогональна форма",simple:true};
  return {type:"free",label:"Довільна форма з косими",simple:false};
}
function rectangleConsistency(points){
  if(points.length!==4) return null;
  var lens=getLengths();
  var l=[Number(lens[0])||0,Number(lens[1])||0,Number(lens[2])||0,Number(lens[3])||0];
  if(!(l[0]>0&&l[1]>0&&l[2]>0&&l[3]>0)) return null;
  var e1=Math.abs(l[0]-l[2]);
  var e2=Math.abs(l[1]-l[3]);
  return {max:Math.max(e1,e2),pairs:[e1,e2],lengths:l};
}
function orthogonalBalance(points){
  var dx=0,dy=0;
  for(var i=0;i<points.length;i++){
    var a=points[i],b=points[(i+1)%points.length];
    dx+=Number(b.x)-Number(a.x);
    dy+=Number(b.y)-Number(a.y);
  }
  return {dx:dx,dy:dy,total:Math.hypot(dx,dy)};
}
function diagonalCrossesBoundary(points,i,j){
  var n=points.length,a=points[i],b=points[j];
  for(var k=0;k<n;k++){
    var k2=(k+1)%n;
    if(k===i||k2===i||k===j||k2===j) continue;
    if(segmentsIntersect(a,b,points[k],points[k2])) return true;
  }
  return false;
}
function recommendedDiagonals(points,shape){
  var n=points.length;
  if(n<4) return [];
  if(shape.type==="rectangle"){
    return [{priority:1,i:0,j:2,label:labelPoint(0)+"–"+labelPoint(2),length:distance(points[0],points[2]),reason:"достатньо однієї контрольної діагоналі"}];
  }
  if(shape.type==="lshape"||shape.type==="orthogonal"){
    return []; // для простої ортогональної форми не нав'язуємо зайві діагоналі
  }
  var candidates=[];
  for(var i=0;i<n;i++){
    for(var j=i+1;j<n;j++){
      var adjacent=(j===i+1)||(i===0&&j===n-1);
      if(adjacent) continue;
      var d=distance(points[i],points[j]);
      if(!Number.isFinite(d)||d<=0) continue;
      var gap=Math.abs(j-i); gap=Math.min(gap,n-gap);
      var crosses=diagonalCrossesBoundary(points,i,j);
      var score=d*(1+gap/n)*(crosses?0.2:1);
      candidates.push({i:i,j:j,d:d,score:score,crosses:crosses});
    }
  }
  candidates.sort(function(a,b){return b.score-a.score;});
  var wanted=n<=5?1:(n<=8?2:3),selected=[],used={};
  for(var c=0;c<candidates.length&&selected.length<wanted;c++){
    var x=candidates[c];
    if(x.crosses) continue;
    var newEnds=(!used[x.i]?1:0)+(!used[x.j]?1:0);
    if(selected.length&&newEnds===0) continue;
    selected.push(x); used[x.i]=true; used[x.j]=true;
  }
  return selected.map(function(x,idx){
    return {priority:idx+1,i:x.i,j:x.j,label:labelPoint(x.i)+"–"+labelPoint(x.j),length:x.d,reason:"контроль косих стін"};
  });
}
function analyze(){
  var points=getPoints().filter(finitePoint);
  var n=points.length;
  var closedShape=isClosed();
  var enough=n>=3;
  var duplicates=duplicatePairs(points);
  var intersect=enough&&hasSelfIntersection(points,closedShape);
  var shape=classifyShape(points,closedShape);
  var balance=enough?orthogonalBalance(points):{dx:0,dy:0,total:0};
  var rect=shape.type==="rectangle"?rectangleConsistency(points):null;
  var diags=recommendedDiagonals(points,shape);
  var closure=enough&&closedShape?closureCheck():null;
  var diagChecks=diagonalChecks();

  var issues=[];
  if(!enough) issues.push("Недостатньо точок");
  if(enough&&!closedShape) issues.push("Контур не замкнений");
  if(duplicates.length) issues.push("Є точки, що накладаються");
  if(intersect) issues.push("Є самоперетин");

  // ---- 1) Геометрія без помилок — до 40% ----
  var geometryScore=(enough?10:0)+(closedShape?10:0)+((duplicates.length===0&&enough)?10:0)+((!intersect&&enough)?10:0);

  // ---- 2) Замикання периметра — до 25% (лише факти, без звинувачень) ----
  var closureScore=0;
  if(closure){
    var ct=tol(closure.impliedCm);
    if(closure.diffCm<=ct.ok) closureScore=25;
    else if(closure.diffCm<=ct.major) closureScore=12;
    if(closure.diffCm>ct.ok) issues.push("Периметр: за виміряними стінами очікується "+closure.impliedCm.toFixed(0)+" см на стороні "+closure.sideLabel+", введено "+closure.enteredCm.toFixed(0)+" см (різниця "+closure.diffCm.toFixed(1)+" см)");
  }

  // ---- 3) Контрольні діагоналі — до 25% (реальний вимір, або — для прямокутника — самоперевірка протилежних сторін) ----
  var diagonalScore=0;
  if(diagChecks.length){
    var worstRatio=0; // worst diff expressed as a fraction of that diagonal's own "major" tolerance, so different-length diagonals compare fairly
    diagChecks.forEach(function(x){ var dt=tol(x.impliedCm); var ratio=x.diffCm/dt.major; if(ratio>worstRatio) worstRatio=ratio; });
    if(worstRatio<=(1/1.5)) diagonalScore=25; else if(worstRatio<=1) diagonalScore=12; // <=ok-equivalent : full; <=major : partial
    diagChecks.forEach(function(x){
      var dt=tol(x.impliedCm);
      if(x.diffCm>dt.ok) issues.push("Діагональ "+x.key+": за виміром "+x.enteredCm.toFixed(0)+" см, за стінами виходить "+x.impliedCm.toFixed(0)+" см (різниця "+x.diffCm.toFixed(1)+" см)");
    });
  }else if(shape.type==="rectangle"&&rect){
    var rtPair0=tol((rect.lengths[0]+rect.lengths[2])/2),rtPair1=tol((rect.lengths[1]+rect.lengths[3])/2);
    var pair0Bad=rect.pairs[0]>rtPair0.ok,pair1Bad=rect.pairs[1]>rtPair1.ok;
    var pair0Major=rect.pairs[0]>rtPair0.major,pair1Major=rect.pairs[1]>rtPair1.major;
    if(!pair0Bad&&!pair1Bad) diagonalScore=25; else if(!pair0Major&&!pair1Major) diagonalScore=12;
    if(pair0Bad||pair1Bad) issues.push("Протилежні сторони прямокутника різняться на "+rect.max.toFixed(1)+" см");
  }else if(shape.type==="lshape"||shape.type==="orthogonal"){
    diagonalScore=25; // усі кути прямі — форма вже однозначно визначена довжинами стін, діагональ нічого нового не додасть
  }else if(shape.type==="free"){
    issues.push("Косі стіни ще не підтверджені жодною контрольною діагоналлю");
  }

  // ---- 4) Додаткові перевірки — до 10% ----
  var additionalScore=issues.length===0?10:(issues.length<=1?5:0);

  var rawScore=geometryScore+closureScore+diagonalScore+additionalScore;
  var maxScore=100;
  if(shape.type==="free"&&diagChecks.length===0) maxScore=72; // складна форма без жодної контрольної діагоналі — стеля точності
  var score=Math.max(0,Math.min(maxScore,rawScore));
  var level=score>=80?"green":score>=55?"yellow":"red";

  // ---- Чесний вердикт: лише те, що підтверджується перетином реально проваленних перевірок ----
  var candidateSets=[];
  if(closure&&closure.diffCm>tol(closure.impliedCm).ok){ var all=[]; for(var i=0;i<n;i++) all.push(i); candidateSets.push(all); }
  diagChecks.forEach(function(x){ if(x.diffCm>tol(x.impliedCm).ok) candidateSets.push(sidesBetween(x.a,x.b,n)); });
  if(shape.type==="rectangle"&&rect&&diagChecks.length===0){
    if(rect.pairs[0]>tol((rect.lengths[0]+rect.lengths[2])/2).ok) candidateSets.push([0,2]);
    if(rect.pairs[1]>tol((rect.lengths[1]+rect.lengths[3])/2).ok) candidateSets.push([1,3]);
  }
  var zoneSides=computeConflictZone(candidateSets);
  var verdict;
  if(zoneSides&&zoneSides.length===1){
    var s0=zoneSides[0];
    verdict={type:"proven",icon:"🔴",sides:zoneSides,
      text:"Стіна "+labelPoint(s0)+labelPoint((s0+1)%n)+" — похибка підтверджена математично: це єдиний варіант, що узгоджується з усіма введеними розмірами й діагоналями."};
  }else if(zoneSides&&zoneSides.length>1){
    var zLabel=zoneLabel(zoneSides,n);
    var rec=recommendZoneDiagonal(zoneSides,n);
    var overridesNow=getDiagonalOverrides()||{};
    if(rec&&overridesNow[rec.label]!=null) rec=null; // already measured — no new information left to gain from a diagonal
    var recText=rec?" Для уточнення заміряйте "+rec.label+".":
      (zoneSides.length===2?" Подальших діагоналей тут уже недостатньо — залишається повторно виміряти рулеткою одну зі стін у цій зоні напряму.":"");
    verdict={type:"conflict",icon:"🟡",sides:zoneSides,
      text:"Конфліктна зона "+zLabel+". Однозначно визначити неправильний розмір неможливо."+recText,
      recommend:rec};
  }else{
    var testedRobustly=(shape.type!=="free")||diagChecks.length>0;
    if(!testedRobustly&&n===3){
      verdict={type:"insufficient",icon:"⚪",
        text:"Трикутна кімната: 3 сторони однозначно визначають форму, але діагоналі тут неможливі, а кут на ескізі лише приблизний — перевірити точність можна тільки повторним заміром усіх трьох сторін."};
    }else if(!testedRobustly){
      verdict={type:"insufficient",icon:"⚪",
        text:"Форма складна, контрольні діагоналі ще не введені — перевірити точність поки неможливо. Виміряйте хоча б одну діагональ."};
    }else{
      verdict={type:"ok",icon:"✅",text:"Усі введені розміри узгоджені між собою."};
    }
  }

  return {
    score:score,maxScore:maxScore,level:level,points:n,closed:closedShape,
    enough:enough,duplicates:duplicates,intersect:intersect,shape:shape,
    balance:balance,rectangle:rect,diagonals:diags,closure:closure,diagonalChecks:diagChecks,
    verdict:verdict,issues:issues
  };
}
var lastNotifySignature="";

function ensureStyles(){
  if(document.getElementById("rmMeasureStatusStyles")) return;
  var style=document.createElement("style");
  style.id="rmMeasureStatusStyles";
  style.textContent=
    "#rmMeasureConfidenceBtn{position:fixed;top:148px;right:18px;z-index:620;width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 5px 18px rgba(15,23,42,.22);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;transition:.2s transform,.2s background;}" +
    "#rmMeasureConfidenceBtn:active{transform:scale(.94)}" +
    "#rmMeasureConfidenceBtn .rm-status-dot{width:16px;height:16px;border-radius:50%;display:block;box-shadow:0 0 0 5px rgba(255,255,255,.42)}" +
    "#rmMeasureConfidenceBtn.rm-green{background:#dcfce7}.rm-green .rm-status-dot{background:#22c55e}" +
    "#rmMeasureConfidenceBtn.rm-yellow{background:#fef3c7}.rm-yellow .rm-status-dot{background:#f59e0b}" +
    "#rmMeasureConfidenceBtn.rm-red{background:#fee2e2}.rm-red .rm-status-dot{background:#ef4444}" +
    "#rmMeasureConfidenceModal{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.42);backdrop-filter:blur(7px);display:none;align-items:flex-end;justify-content:center;padding:12px}" +
    "#rmMeasureConfidenceModal.rm-open{display:flex}" +
    "#rmMeasureConfidenceCard{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:#fff;border-radius:26px 26px 20px 20px;box-shadow:0 -18px 60px rgba(15,23,42,.28);padding:20px 18px 18px;animation:rmModalUp .2s ease-out}" +
    "@keyframes rmModalUp{from{transform:translateY(35px);opacity:.5}to{transform:none;opacity:1}}" +
    "#rmMeasureConfidenceHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}" +
    "#rmMeasureConfidenceHead strong{font-size:21px;color:#0f172a}" +
    "#rmMeasureConfidenceClose{width:38px;height:38px;border:none;border-radius:50%;background:#f1f5f9;color:#475569;font-size:25px;line-height:1;cursor:pointer}" +
    ".rm-status-hero{border-radius:20px;padding:16px;margin-bottom:14px;border:1px solid transparent}" +
    ".rm-status-hero.green{background:#ecfdf5;border-color:#bbf7d0}.rm-status-hero.yellow{background:#fffbeb;border-color:#fde68a}.rm-status-hero.red{background:#fef2f2;border-color:#fecaca}" +
    ".rm-status-title{font-size:19px;font-weight:850;margin-bottom:5px}.rm-status-sub{font-size:14px;line-height:1.45;color:#475569}" +
    ".rm-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}" +
    ".rm-status-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px}" +
    ".rm-status-box b{display:block;color:#0f172a;font-size:14px;margin-bottom:4px}.rm-status-box span{font-size:13px;color:#64748b}" +
    ".rm-check-list{display:flex;flex-direction:column;gap:9px;margin:12px 0}" +
    ".rm-check-row{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:14px;background:#f8fafc}" +
    ".rm-check-icon{font-size:18px;line-height:1}.rm-check-row b{display:block;font-size:14px;color:#0f172a}.rm-check-row small{display:block;margin-top:2px;font-size:12px;line-height:1.35;color:#64748b}" +
    ".rm-action-card{border-radius:17px;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;margin:12px 0}" +
    ".rm-action-card b{font-size:15px;color:#1e3a8a}.rm-action-card p{font-size:13px;line-height:1.45;color:#475569;margin:7px 0 0}" +
    ".rm-primary-action,.rm-secondary-action{width:100%;border:none;border-radius:15px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-top:9px}" +
    ".rm-primary-action{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;box-shadow:0 7px 18px rgba(37,99,235,.28)}" +
    ".rm-secondary-action{background:#f1f5f9;color:#334155}" +
    ".rm-score-line{display:flex;justify-content:space-between;align-items:center;margin:4px 0 10px;font-size:13px;color:#64748b}" +
    ".rm-score-bar{height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden}.rm-score-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#f59e0b,#22c55e)}";
  document.head.appendChild(style);
}
function ensureUi(){
  ensureStyles();
  var btn=document.getElementById("rmMeasureConfidenceBtn");
  if(!btn){
    btn=document.createElement("button");
    btn.id="rmMeasureConfidenceBtn";
    btn.type="button";
    btn.setAttribute("aria-label","Стан перевірки заміру");
    btn.innerHTML='<span class="rm-status-dot"></span>';
    btn.addEventListener("click",open);
    document.body.appendChild(btn);
  }
  var modal=document.getElementById("rmMeasureConfidenceModal");
  if(!modal){
    modal=document.createElement("div");
    modal.id="rmMeasureConfidenceModal";
    modal.innerHTML='<div id="rmMeasureConfidenceCard" role="dialog" aria-modal="true" aria-labelledby="rmMeasureConfidenceTitle">'+
      '<div id="rmMeasureConfidenceHead"><strong id="rmMeasureConfidenceTitle">Перевірка заміру</strong><button id="rmMeasureConfidenceClose" type="button" aria-label="Закрити">×</button></div>'+
      '<div id="rmMeasureConfidenceBody"></div></div>';
    modal.addEventListener("click",function(e){if(e.target===modal)close();});
    document.body.appendChild(modal);
    document.getElementById("rmMeasureConfidenceClose").addEventListener("click",close);
  }
}
function resultState(r){
  if(!r||!r.verdict) return "yellow";
  if(r.verdict.type==="proven") return "red";
  if(r.verdict.type==="conflict") return "yellow";
  if(r.verdict.type==="insufficient") return "yellow";
  return r.score>=80?"green":(r.score>=55?"yellow":"red");
}
function checkRow(icon,title,detail){
  return '<div class="rm-check-row"><div class="rm-check-icon">'+icon+'</div><div><b>'+title+'</b><small>'+detail+'</small></div></div>';
}
function fmtCm(v){
  var n=Number(v);
  if(!Number.isFinite(n)) return "—";
  return n.toLocaleString("uk-UA",{maximumFractionDigits:1})+" см";
}
function render(force){
  ensureUi();
  var r=analyze();
  var signature=JSON.stringify(r);
  if(!force&&signature===lastSignature) return;
  lastSignature=signature;

  var state=resultState(r);
  var btn=document.getElementById("rmMeasureConfidenceBtn");
  btn.className="rm-"+state;
  btn.title=state==="green"?"Замір перевірено":(state==="yellow"?"Потрібна перевірка":"Є критична помилка");

  var title="",sub="",heroClass=state,actionHtml="";
  if(state==="green"){
    title="✅ Замір перевірено";
    sub="Критичних суперечностей не виявлено. Можна переходити до наступного етапу.";
    actionHtml='<button class="rm-primary-action" type="button" onclick="A·CEILMeasureConfidence.close()">Продовжити</button>';
  }else if(state==="red"){
    title="❌ Замір неузгоджений";
    sub="Є критична геометрична помилка. Перед монтажем потрібно перевірити розміри.";
  }else{
    title="⚠️ Потрібна перевірка";
    sub=(r.verdict&&r.verdict.text)?r.verdict.text:"Є невизначеність у введених розмірах.";
  }

  var html='<div class="rm-status-hero '+heroClass+'"><div class="rm-status-title">'+title+'</div><div class="rm-status-sub">'+sub+'</div></div>';
  html+='<div class="rm-score-line"><span>Рівень перевірки</span><b>'+r.score+'%</b></div>'+
        '<div class="rm-score-bar"><div class="rm-score-fill" style="width:'+Math.max(0,Math.min(100,r.score))+'%"></div></div>';

  html+='<div class="rm-status-grid">'+
        '<div class="rm-status-box"><b>Тип форми</b><span>'+(r.shape&&r.shape.label?r.shape.label:"—")+'</span></div>'+
        '<div class="rm-status-box"><b>Точок</b><span>'+r.points+'</span></div>'+
        '</div>';

  html+='<div class="rm-check-list">';
  html+=checkRow(r.enough?"✅":"⚠️","Точки контуру",r.enough?("Задано: "+r.points):"Потрібно щонайменше 3 точки");
  html+=checkRow(r.closed?"✅":"⚠️","Замикання",r.closed?"Контур замкнений":"Контур не замкнений");
  html+=checkRow(r.duplicates&&r.duplicates.length?"❌":"✅","Накладання точок",r.duplicates&&r.duplicates.length?("Знайдено: "+r.duplicates.length):"Немає");
  html+=checkRow(r.intersect?"❌":"✅","Самоперетини",r.intersect?"Є перетин сторін":"Немає");

  if(r.closure){
    var ci=r.closure.diffCm<=tol(Math.max(r.closure.enteredCm,r.closure.impliedCm)).ok?"✅":"⚠️";
    html+=checkRow(ci,"Замикання периметра",
      "Очікується "+fmtCm(r.closure.impliedCm)+", введено "+fmtCm(r.closure.enteredCm)+", різниця "+fmtCm(r.closure.diffCm));
  }
  if(r.diagonalChecks&&r.diagonalChecks.length){
    r.diagonalChecks.forEach(function(d){
      html+=checkRow(d.diffCm<=tol(Math.max(d.enteredCm,d.impliedCm)).ok?"✅":"⚠️",
        "Діагональ "+d.key,
        "Введено "+fmtCm(d.enteredCm)+", розрахунково "+fmtCm(d.impliedCm)+", різниця "+fmtCm(d.diffCm));
    });
  }
  html+='</div>';

  if(r.verdict&&r.verdict.sides&&r.verdict.sides.length){
    var names=r.verdict.sides.map(function(i){return labelPoint(i)+labelPoint((i+1)%r.points);}).join(", ");
    html+='<div class="rm-action-card"><b>Що перевірити</b><p>Проблемна сторона або зона: <strong>'+names+'</strong>.</p></div>';
  }

  if(r.verdict&&r.verdict.recommend){
    var rec=r.verdict.recommend;
    html+='<div class="rm-action-card"><b>Рекомендований контрольний замір</b>'+
      '<p><strong>'+rec.label+'</strong> допоможе точніше локалізувати помилку.</p></div>'+
      '<button class="rm-primary-action" type="button" id="rmMeasureRecommendedBtn">Виміряти '+rec.label+'</button>'+
      '<button class="rm-secondary-action" type="button" onclick="A·CEILMeasureConfidence.close()">Продовжити без перевірки</button>';
  }else if(state!=="green"){
    html+='<button class="rm-secondary-action" type="button" onclick="A·CEILMeasureConfidence.close()">Закрити</button>';
  }else{
    html+=actionHtml;
  }

  document.getElementById("rmMeasureConfidenceBody").innerHTML=html;

  var recBtn=document.getElementById("rmMeasureRecommendedBtn");
  if(recBtn&&r.verdict&&r.verdict.recommend){
    recBtn.addEventListener("click",function(){
      var rec=r.verdict.recommend;
      close();
      try{
        if(typeof toggleDiagPair==="function"){
          toggleDiagPair(rec.a,rec.b,true);
          return;
        }
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
      try{
        if(typeof autoDiagonals==="function") autoDiagonals();
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    });
  }
}
function open(){render(true);document.getElementById("rmMeasureConfidenceModal").classList.add("rm-open");}
function close(){var m=document.getElementById("rmMeasureConfidenceModal");if(m)m.classList.remove("rm-open");}
function notify(force){
  var r=analyze();
  if(!r||!r.verdict) return false;
  if(r.verdict.type!=="proven"&&r.verdict.type!=="conflict") return false;
  var sig=r.verdict.type+"|"+r.verdict.text;
  if(!force&&sig===lastNotifySignature) return false;
  lastNotifySignature=sig;
  try{
    if(typeof showToast==="function") showToast("⚠️ Перевірте замір — натисніть на кружок стану",4200);
  }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return true;
}
function boot(){
  ensureUi();
  render(true);
  timer=setInterval(function(){
    try{render(false);notify(false);}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  },650);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)render(true);});
}
window.A·CEILMeasureConfidence={
  version:"2.56",
  analyze:analyze,
  render:function(){render(true);},
  open:open,
  close:close,
  notify:notify
};
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
