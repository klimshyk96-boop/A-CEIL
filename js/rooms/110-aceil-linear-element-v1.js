
/* Універсальний лінійний елемент (LinearElement): пряма, Г-, П-подібна та прямокутник. */
(function(){
  "use strict";
  var TYPES=[
    {key:'lightLine',      label:'Світлова лінія',   icon:'💡', width:35},
    {key:'magneticTrack',  label:'Магнітний трек',   icon:'🧲', width:35},
    {key:'surfaceTrack',   label:'Накладний трек',   icon:'▭',  width:35},
    {key:'custom',         label:'Інший',            icon:'⚙️', width:35}
  ];
  var SHAPES={line:{label:'Пряма',segs:1,corners:0},L:{label:'Г-подібна',segs:2,corners:1},U:{label:'П-подібна',segs:3,corners:2},rectangle:{label:'Прямокутник',segs:2,corners:4}};
  var STAGE1=['line','L','U','rectangle'];

  function arr(){
    try{
      if(typeof linearElements!=='undefined'&&Array.isArray(linearElements)){
        window.linearElements=linearElements;
        return linearElements;
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(!Array.isArray(window.linearElements)) window.linearElements=[];
    try{linearElements=window.linearElements;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return window.linearElements;
  }
  function typeDef(k){ for(var i=0;i<TYPES.length;i++) if(TYPES[i].key===k) return TYPES[i]; return TYPES[0]; }
  function uid(){ return 'le_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }
  function num(v,d){ var n=parseFloat(v); return isFinite(n)?n:d; }

  /* ── Розрахунок: одна фігура, не набір відрізків ── */
  function computeTotals(el){
    var s=el.segments||[], t=0, i;
    if(el.shape==='rectangle' && !(el.elementType==='lightLine' && el.lightShapeMode==='free')){ t=2*((num(s[0],0))+(num(s[1],0))); }
    else { for(i=0;i<s.length;i++) t+=num(s[i],0); }
    if(el.elementType==='lightLine' && el.lightShapeMode==='rhombus'){
      t=4*Math.max(1,num(el.rhombusSide,num(s[0],100)));
    }
    el.totalLengthCm=Math.round(t*10)/10;
    el.cornerCount=(el.elementType==='lightLine'&&el.lightShapeMode==='rhombus')?4:
      (el.elementType==='lightLine'&&el.lightShapeMode==='basic'&&el.shape==='U')?2:
      (el.elementType==='lightLine'?Math.max(0,s.length-1):(SHAPES[el.shape]||SHAPES.line).corners);
    return el;
  }
  window.A·CEILLinearElement={ TYPES:TYPES, SHAPES:SHAPES, computeTotals:computeTotals,
    totalFor:function(el){ return computeTotals(Object.assign({},el)).totalLengthCm; } };

  /* ── Геометрія: points рахуються з center+rotation+segments ── */
  function pointsOf(el){
    var cx=num(el.center&&el.center.x,0), cy=num(el.center&&el.center.y,0);
    var rot=(num(el.rotation,0)%360+360)%360*Math.PI/180;
    var cs=Math.cos(rot), sn=Math.sin(rot), seg=el.segments||[];
    function tr(x,y){
      if(el.flipX)x=-x;
      if(el.flipY)y=-y;
      return {x:cx+x*cs-y*sn,y:cy+x*sn+y*cs};
    }
    function centered(raw){
      var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      raw.forEach(function(p){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
      var ox=(minX+maxX)/2,oy=(minY+maxY)/2;
      return raw.map(function(p){return tr(p.x-ox,p.y-oy);});
    }
    var a=Math.max(1,num(seg[0],100)), b=Math.max(1,num(seg[1],100)), c=Math.max(1,num(seg[2],b));
    if(el.elementType==='lightLine' && el.lightShapeMode==='rhombus'){
      var rs=Math.max(1,num(el.rhombusSide,num(seg[0],100)));
      var ra=Math.max(10,Math.min(170,num(el.rhombusAngle,60)))*Math.PI/180;
      return centered([
        {x:0,y:0},
        {x:rs,y:0},
        {x:rs+Math.cos(ra)*rs,y:Math.sin(ra)*rs},
        {x:Math.cos(ra)*rs,y:Math.sin(ra)*rs},
        {x:0,y:0}
      ]);
    }
    if(el.elementType==='lightLine' && el.lightShapeMode==='free' && Array.isArray(el.segmentAngles)){
      var raw=[{x:0,y:0}],rx=0,ry=0;
      for(var li=0;li<seg.length;li++){
        var ln=Math.max(1,num(seg[li],100));
        var an=num(el.segmentAngles[li],0)*Math.PI/180;
        rx+=Math.cos(an)*ln;
        ry+=Math.sin(an)*ln;
        raw.push({x:rx,y:ry});
      }
      return centered(raw);
    }
    if(el.shape==='line') return centered([{x:0,y:0},{x:a,y:0}]);
    if(el.shape==='L') return centered([{x:0,y:0},{x:a,y:0},{x:a,y:b}]);
    if(el.shape==='U') return centered([{x:0,y:a},{x:0,y:0},{x:b,y:0},{x:b,y:a}]);
    if(el.shape==='rectangle') return centered([{x:0,y:0},{x:a,y:0},{x:a,y:b},{x:0,y:b},{x:0,y:0}]);
    return centered([{x:0,y:0},{x:a,y:0}]);
  }
  function syncPoints(el){ el.points=pointsOf(el); return el; }

  /* Canvas-native geometry.
     A linear element is a rigid polyline. We calculate its shape in centimetres,
     but render all nodes from one canvas centre using one px/cm scale.
     This avoids the old wall-relative coordinate conversion bending a straight line. */
  function elementOffsetsCm(el){
    var cx=num(el.center&&el.center.x,0),cy=num(el.center&&el.center.y,0);
    return pointsOf(el).map(function(p){return {x:p.x-cx,y:p.y-cy};});
  }
  function roomCenterPx(){
    try{
      var list=roomCanvasPoints();
      var g=window.A·CEILGeometry;
      if(list.length&&g&&typeof g.centroid==='function'){
        var c=g.centroid(list);
        if(c&&isFinite(c.x)&&isFinite(c.y))return {x:c.x,y:c.y};
      }
      if(list.length)return polygonCentroidPx(list);
      if(typeof cv!=='undefined'&&cv)return {x:cv.width/2,y:cv.height/2};
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return {x:0,y:0};
  }
  function ensureCanvasCenter(el){
    if(el&&el.centerCanvasPx&&isFinite(el.centerCanvasPx.x)&&isFinite(el.centerCanvasPx.y))return el.centerCanvasPx;
    var p=null;
    try{p=toCanvas(el.center||{x:0,y:0},el.baseIndex);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(!p)p=roomCenterPx();
    el.centerCanvasPx={x:num(p.x,0),y:num(p.y,0)};
    return el.centerCanvasPx;
  }
  function syncLogicalCenterFromCanvas(el){
    if(!el||!el.centerCanvasPx)return;
    try{
      var base=Number.isFinite(+el.baseIndex)?+el.baseIndex:0;
      if(typeof _nearestLightBaseIndex==='function')
        base=_nearestLightBaseIndex(el.centerCanvasPx.x,el.centerCanvasPx.y);
      if(typeof canvasToLightCoords==='function'){
        var co=canvasToLightCoords(el.centerCanvasPx.x,el.centerCanvasPx.y,base);
        if(co&&isFinite(co.x)&&isFinite(co.y)){
          el.center={x:+co.x,y:+co.y};
          el.baseIndex=Number.isFinite(+co.baseIndex)?+co.baseIndex:base;
        }
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  function canvasPointsOf(el){
    /* centerCanvasPx and _pxPerCm live in the unscaled drawing coordinate system.
       Apply the same viewport transform as the room geometry in every render mode,
       so light lines/tracks follow zoom and pan instead of remaining screen-fixed. */
    var baseCenter=ensureCanvasCenter(el);
    var scale=typeof viewScale!=='undefined'&&isFinite(viewScale)?viewScale:1;
    var offsetX=typeof viewOffsetX!=='undefined'&&isFinite(viewOffsetX)?viewOffsetX:0;
    var offsetY=typeof viewOffsetY!=='undefined'&&isFinite(viewOffsetY)?viewOffsetY:0;
    var px=1;
    try{if(typeof _pxPerCm==='function'&&_pxPerCm()>0)px=_pxPerCm();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var center={x:baseCenter.x*scale+offsetX,y:baseCenter.y*scale+offsetY};
    px*=scale;
    return elementOffsetsCm(el).map(function(p){
      return {x:center.x+p.x*px,y:center.y+p.y*px};
    });
  }

  function pointInRoomPx(p){
    try{
      var poly=roomCanvasPoints();
      if(!poly||poly.length<3)return true;
      if(typeof pointInPolygon==='function')return !!pointInPolygon(p,poly);
      var inside=false;
      for(var i=0,j=poly.length-1;i<poly.length;j=i++){
        var a=poly[i],b=poly[j];
        var hit=((a.y>p.y)!=(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/((b.y-a.y)||1e-9)+a.x);
        if(hit)inside=!inside;
      }
      return inside;
    }catch(_){return true;}
  }
  function segmentInsideScore(a,b){
    var score=0,samples=12;
    for(var i=0;i<=samples;i++){
      var t=i/samples,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
      if(pointInRoomPx(p))score++;
    }
    return score;
  }
  function candidateScore(el){
    var ps=canvasPointsOf(el),score=0;
    for(var i=0;i<ps.length-1;i++)score+=segmentInsideScore(ps[i],ps[i+1]);
    return score;
  }
  function wallAngles(){
    var poly=roomCanvasPoints(),arr=[];
    if(!poly||poly.length<2)return [0];
    for(var i=0;i<poly.length;i++){
      var a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
      if(len>8)arr.push({angle:Math.atan2(dy,dx)*180/Math.PI,len:len});
    }
    arr.sort(function(x,y){return y.len-x.len;});
    return arr.slice(0,Math.min(8,arr.length)).map(function(x){return x.angle;});
  }
  function smartOrientLinearElement(el){
    if(!el||!['L','U','rectangle','line'].includes(el.shape))return el;
    var center=roomCenterPx();
    el.centerCanvasPx={x:center.x,y:center.y};
    el.anchor=el.anchor||{};el.anchor.sideIndex=-1;
    var angles=wallAngles(),best=null;
    var flips=el.shape==='line'?[{x:false,y:false}]:
      [{x:false,y:false},{x:true,y:false},{x:false,y:true},{x:true,y:true}];
    angles.forEach(function(angle){
      [angle,angle+180].forEach(function(a){
        flips.forEach(function(f){
          el.rotation=a;el.flipX=f.x;el.flipY=f.y;
          var s=candidateScore(el);
          if(!best||s>best.score)best={score:s,rotation:a,flipX:f.x,flipY:f.y};
        });
      });
    });
    if(best){
      el.rotation=((best.rotation%360)+360)%360;
      el.flipX=best.flipX;el.flipY=best.flipY;
    }else{
      el.rotation=0;el.flipX=false;el.flipY=false;
    }
    return syncPoints(el);
  }

  /* ── Точне розташування від стіни ── */
  var POINT_NAMES=['А','Б','В','Г','Д','Е','Є','Ж','З','И','І','Ї','К','Л','М','Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ'];
  function wallLabel(i,n){ return (POINT_NAMES[i]||String(i+1))+(POINT_NAMES[(i+1)%n]||String((i+2))); }
  function roomCanvasPoints(){ try{return typeof pts!=='undefined'&&Array.isArray(pts)?pts:[];}catch(_){return [];} }
  function polygonCentroidPx(list){
    if(!list.length) return {x:0,y:0};
    var x=0,y=0; list.forEach(function(p){x+=num(p.x,0);y+=num(p.y,0);});
    return {x:x/list.length,y:y/list.length};
  }
  function wallOptionsHtml(selected){
    var list=roomCanvasPoints(), html='<option value="-1">Без прив’язки</option>';
    for(var i=0;i<list.length;i++) html+='<option value="'+i+'"'+(+selected===i?' selected':'')+'>Стіна '+wallLabel(i,list.length)+'</option>';
    return html;
  }
  function applyWallAnchor(el){
    var a=el.anchor||{}, side=+a.sideIndex, list=roomCanvasPoints();
    if(!(side>=0&&side<list.length)) return syncPoints(el);
    var p1=list[side],p2=list[(side+1)%list.length]; if(!p1||!p2) return syncPoints(el);
    var dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.hypot(dx,dy); if(!(len>0)) return syncPoints(el);
    var ux=dx/len,uy=dy/len, nx=-uy,ny=ux, cent=polygonCentroidPx(list);
    var mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
    if((cent.x-mid.x)*nx+(cent.y-mid.y)*ny<0){nx=-nx;ny=-ny;}
    var pxPerCm=1;
    try{var realLen=typeof _sideLenCm==='function'?num(_sideLenCm(side),0):0;if(realLen>0)pxPerCm=len/realLen;else if(typeof _pxPerCm==='function'&&_pxPerCm()>0)pxPerCm=_pxPerCm();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var along=Math.max(0,num(a.alongCm,0)), inward=Math.max(0,num(a.inwardCm,0));
    var startPx={x:p1.x+ux*along*pxPerCm+nx*inward*pxPerCm,y:p1.y+uy*along*pxPerCm+ny*inward*pxPerCm};
    var base=side; try{if(typeof _nearestLightBaseIndex==='function')base=_nearestLightBaseIndex(startPx.x,startPx.y);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var startCm=null; try{if(typeof canvasToLightCoords==='function')startCm=canvasToLightCoords(startPx.x,startPx.y,base);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    if(!startCm) return syncPoints(el);
    var wallAngle=Math.atan2(dy,dx)*180/Math.PI;
    el.rotation=wallAngle+(a.direction==='perpendicular'?90:0);
    el.baseIndex=Number.isFinite(+startCm.baseIndex)?+startCm.baseIndex:base;
    el.center=el.center||{x:0,y:0};
    el.center.x=num(startCm.x,0);el.center.y=num(startCm.y,0);
    var pxScale=1;try{if(typeof _pxPerCm==='function'&&_pxPerCm()>0)pxScale=_pxPerCm();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    var offs=elementOffsetsCm(el),first=offs[0]||{x:0,y:0};
    el.centerCanvasPx={x:startPx.x-first.x*pxScale,y:startPx.y-first.y*pxScale};
    return syncPoints(el);
  }

  /* ── Створення по центру кімнати ── */
  function roomCenterCm(){
    try{
      var canvasPts=(typeof pts!=='undefined'&&Array.isArray(pts)?pts:[]);
      var g=window.A·CEILGeometry;
      var centerPx=null, boundsPx=null;

      if(canvasPts.length){
        if(g&&typeof g.centroid==='function') centerPx=g.centroid(canvasPts);
        if(g&&typeof g.bounds==='function') boundsPx=g.bounds(canvasPts);
      }

      if(!centerPx&&typeof cv!=='undefined'&&cv){
        centerPx={x:cv.width/2,y:cv.height/2};
      }

      if(centerPx&&typeof canvasToLightCoords==='function'){
        var baseIndex=0;
        try{
          if(typeof _nearestLightBaseIndex==='function')
            baseIndex=_nearestLightBaseIndex(centerPx.x,centerPx.y);
        }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        var co=canvasToLightCoords(centerPx.x,centerPx.y,baseIndex);
        if(co&&co.x!=null&&co.y!=null){
          var pxPerCm=1;
          try{ if(typeof _pxPerCm==='function'&&_pxPerCm()>0) pxPerCm=_pxPerCm(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
          return {
            x:co.x,
            y:co.y,
            w:boundsPx?boundsPx.width/pxPerCm:200,
            h:boundsPx?boundsPx.height/pxPerCm:200,
            baseIndex:co.baseIndex
          };
        }
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return {x:0,y:0,w:200,h:200,baseIndex:0};
  }
  function putInRoomCenter(el,resetRotation){
    var c=roomCenterCm(),cp=roomCenterPx();
    el.center={x:num(c.x,0),y:num(c.y,0)};
    el.centerCanvasPx={x:num(cp.x,0),y:num(cp.y,0)};
    el.baseIndex=Number.isFinite(+c.baseIndex)?+c.baseIndex:0;
    el.anchor=el.anchor||{};
    el.anchor.sideIndex=-1;
    if(resetRotation!==false) el.rotation=0;
    return syncPoints(el);
  }
  function repaintOnly(){
    try{ if(typeof draw==='function') draw(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  function create(elementType,shape){
    if(STAGE1.indexOf(shape)<0) shape='line';
    var c=roomCenterCm(), td=typeDef(elementType);
    var def=Math.max(40,Math.round((c.w||200)*0.45/10)*10);
    var defB=Math.max(40,Math.round((c.h||200)*0.35/10)*10);
    var segments=shape==='line'?[def]:shape==='L'?[def,defB]:shape==='U'?[defB,def,defB]:[def,defB];
    var el={ id:uid(), type:'linearElement', elementType:td.key, shape:shape,
      center:{x:c.x,y:c.y}, baseIndex:Number.isFinite(+c.baseIndex)?+c.baseIndex:0,
      rotation:0, segments:segments, points:[], profileWidth:td.width,
      anchor:{sideIndex:-1,alongCm:0,inwardCm:30,direction:'parallel'} };
    if(td.key==='lightLine'){
      el.shape='line';
      el.lightShapeMode='basic';
      el.segmentAngles=segments.map(function(_,i){return 0;});
      el.rhombusSide=Math.max(1,num(segments[0],100));
      el.rhombusAngle=60;
    }
    computeTotals(el); putInRoomCenter(el,true); smartOrientLinearElement(el);
    arr().push(el);
    persist(); openEditor(el.id);
    if(typeof showToast==='function') showToast(td.icon+' '+td.label+' додано');
    return el;
  }

  function persist(){
    arr().forEach(function(e){ computeTotals(e); if(e.anchor&&+e.anchor.sideIndex>=0) applyWallAnchor(e); else syncPoints(e); });
    try{ if(typeof draw==='function') draw(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{ if(typeof saveState==='function') saveState(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{ if(typeof recalcElemTotal==='function') recalcElemTotal(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  window._leRepaint=persist;

  /* ── Рендер на полотні ── */
  function toCanvas(p,baseIndex){
    try{
      if(typeof lightCoordsToCanvas==='function'){
        var r=lightCoordsToCanvas(p.x,p.y,Number.isFinite(+baseIndex)?+baseIndex:0);
        if(r) return r;
      }
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return null;
  }
  function roundedRectPath(c,x,y,w,h,r){
    if(typeof c.roundRect==='function'){c.roundRect(x,y,w,h,r);return;}
    r=Math.min(r,w/2,h/2);c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);
  }
  function drawLinearElements(ctx){
    var list=arr(); if(!list.length) return;
    var c=ctx||(typeof cv!=='undefined'&&cv?cv.getContext('2d'):null); if(!c) return;
    var px=1; try{ if(typeof _pxPerCm==='function'){ var v=_pxPerCm(); if(v>0) px=v; } }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    c.save();
    list.forEach(function(el){
      var pts2=canvasPointsOf(el);
      if(pts2.some(function(p){return !p||!isFinite(p.x)||!isFinite(p.y);} )) return;
      /* profileWidth is stored in millimetres. On plan it is a slim path,
         not a filled construction rectangle. */
      var physicalPx=(num(el.profileWidth,35)/10)*px;
      var reportMode=(typeof _reportMode!=='undefined'&&_reportMode)||window.__A·CEILReportRendering===true;
      var w=Math.max(3,Math.min(reportMode?15:9,physicalPx+(reportMode?4:0)));
      var color=el.elementType==='curtainHidden'?'#8b5cf6':(el.elementType==='lightLine'?'#f59e0b':'#64748b');
      c.lineCap='round'; c.lineJoin='round';
      c.strokeStyle='rgba(255,255,255,.95)'; c.lineWidth=w+3;
      c.beginPath(); c.moveTo(pts2[0].x,pts2[0].y); for(var i3=1;i3<pts2.length;i3++) c.lineTo(pts2[i3].x,pts2[i3].y); c.stroke();
      c.strokeStyle=color; c.lineWidth=w;
      c.beginPath(); c.moveTo(pts2[0].x,pts2[0].y); for(var i4=1;i4<pts2.length;i4++) c.lineTo(pts2[i4].x,pts2[i4].y); c.stroke();
      if(!reportMode){
        c.fillStyle='#fff'; c.strokeStyle=color; c.lineWidth=2;
        pts2.forEach(function(p){ c.beginPath(); c.arc(p.x,p.y,4,0,Math.PI*2); c.fill(); c.stroke(); });
      }
      for(var si=0;si<pts2.length-1;si++){
        var p1=pts2[si],p2=pts2[si+1],mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
        var labelCm=0;
        if(el.elementType==='lightLine' && el.lightShapeMode==='rhombus'){
          labelCm=num(el.rhombusSide,0);
        }else if(el.shape==='rectangle'){
          /* 4 сторони: ширина / висота / ширина / висота */
          labelCm=(si%2===0)?num(el.segments&&el.segments[0],0):num(el.segments&&el.segments[1],0);
        }else if(el.shape==='U'){
          /* П-подібна: ліва бокова / перемичка / права бокова */
          labelCm=(si===1)?num(el.segments&&el.segments[1],0):num(el.segments&&el.segments[0],0);
        }else if(el.shape==='L'){
          labelCm=num(el.segments&&el.segments[Math.min(si,1)],0);
        }else if(el.shape==='line'){
          labelCm=num(el.segments&&el.segments[0],0);
        }else{
          labelCm=Math.hypot(p2.x-p1.x,p2.y-p1.y)/Math.max(px,0.000001);
        }
        var label=Math.round(labelCm)+' см';
        var angle=Math.atan2(p2.y-p1.y,p2.x-p1.x);
        var nx=-Math.sin(angle),ny=Math.cos(angle),offset=reportMode?12:0;
        mx+=nx*offset;my+=ny*offset;
        c.font='bold '+(reportMode?'12':'11')+'px Arial'; c.textAlign='center'; c.textBaseline='middle';
        var tw=c.measureText(label).width;
        c.fillStyle='rgba(255,255,255,.96)'; c.fillRect(mx-tw/2-4,my-(reportMode?10:9),tw+8,reportMode?20:18);
        c.fillStyle=reportMode?'#92400e':'#0f172a'; c.fillText(label,mx,my);
      }
    });
    c.restore();
  }
  window._drawLinearElements=drawLinearElements;
  var _prevDraw=window.draw;
  window.draw=function(){
    var r; try{ if(typeof _prevDraw==='function') r=_prevDraw.apply(this,arguments); }
    finally{ try{ drawLinearElements(); }catch(_){window.__diagSilent&&window.__diagSilent(_)} }
    return r;
  };
  try{draw=window.draw;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  /* ── Тап по фігурі: відкрити налаштування ── */
  function pointSegmentDistance(p,a,b){
    var dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return Math.hypot(p.x-a.x,p.y-a.y);
    var t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  function hitLinearElement(x,y){
    var list=arr();
    for(var i=list.length-1;i>=0;i--){
      var e=list[i], ps=canvasPointsOf(e);
      if(ps.some(function(p){return !p||!isFinite(p.x)||!isFinite(p.y);} ))continue;
      for(var j=0;j<ps.length-1;j++)if(pointSegmentDistance({x:x,y:y},ps[j],ps[j+1])<=14)return e;
    }
    return null;
  }
  function attachCanvasTap(){
    try{
      var canvas=typeof cv!=='undefined'&&cv?cv:document.querySelector('canvas'); if(!canvas||canvas.__leTapAttached)return;
      canvas.__leTapAttached=true; var down=null;
      canvas.addEventListener('pointerdown',function(ev){down={x:ev.clientX,y:ev.clientY};},true);
      canvas.addEventListener('pointerup',function(ev){
        if(!down||Math.hypot(ev.clientX-down.x,ev.clientY-down.y)>8){down=null;return;} down=null;
        var r=canvas.getBoundingClientRect(), sx=canvas.width/r.width, sy=canvas.height/r.height;
        var hit=hitLinearElement((ev.clientX-r.left)*sx,(ev.clientY-r.top)*sy);
        if(hit){ev.preventDefault();ev.stopPropagation();openEditor(hit.id);}
      },true);
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }
  if(typeof rmOnReady==='function')rmOnReady(attachCanvasTap);else setTimeout(attachCanvasTap,0);

  /* ── AutoFill: загальна довжина + кількість кутів/обривів ── */
  window.linearElementsSummary=function(state){
    var src=state&&Array.isArray(state.linearElements)?state.linearElements:arr();
    var out={count:0,totalLengthCm:0,cornerCount:0,breakCount:0,byType:{}};
    src.forEach(function(e){
      var el=computeTotals(Object.assign({},e));
      var breaks=el.shape==='rectangle'?0:2;
      out.count++; out.totalLengthCm+=el.totalLengthCm; out.cornerCount+=el.cornerCount; out.breakCount+=breaks;
      var k=el.elementType||'custom';
      if(!out.byType[k]) out.byType[k]={label:typeDef(k).label,lengthCm:0,corners:0,breaks:0,count:0};
      out.byType[k].lengthCm+=el.totalLengthCm; out.byType[k].corners+=el.cornerCount; out.byType[k].breaks+=breaks; out.byType[k].count++;
    });
    out.totalLengthM=Math.round((out.totalLengthCm/100)*100)/100;
    return out;
  };
  function applyLinearNomenclature(){
    try{
      if(typeof elemItems==='undefined'||!Array.isArray(elemItems))return 0;
      var sum=window.linearElementsSummary(),updated=0;
      elemItems.forEach(function(it){
        if(!it)return; var n=String(it.name||'').trim().toLowerCase(),src=String(it.source||'').trim().toLowerCase();
        var related=n.indexOf('світлов')>=0||n.indexOf('ліні')>=0||src.indexOf('linear_')===0;
        if(!related)return;
        if(src==='linear_corner'||n.indexOf('кут')>=0){it.qty=sum.cornerCount;it.unit='шт';updated++;}
        else if(src==='linear_break'||n.indexOf('обрив')>=0||n.indexOf('закінч')>=0){it.qty=sum.breakCount;it.unit='шт';updated++;}
        else if(src==='linear_length'||(n.indexOf('світлов')>=0&&n.indexOf('ліні')>=0)){it.qty=sum.totalLengthM;it.unit='м';updated++;}
        if(updated){it.autoFilled=true;it.autoZero=!(Number(it.qty)>0);}
      });
      if(updated){try{renderElemList();}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{updateElemBadge();}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{recalcElemTotal();}catch(_){window.__diagSilent&&window.__diagSilent(_)}try{saveState();}catch(_){window.__diagSilent&&window.__diagSilent(_)}}
      return updated;
    }catch(_){return 0;}
  }
  window.applyLinearNomenclature=applyLinearNomenclature;
  var _prevAutoFill=window.autoFillNomenclature||(typeof autoFillNomenclature==='function'?autoFillNomenclature:null);
  if(typeof _prevAutoFill==='function'){
    window.autoFillNomenclature=function(){var r=_prevAutoFill.apply(this,arguments);applyLinearNomenclature();return r;};
    try{autoFillNomenclature=window.autoFillNomenclature;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  /* ── Звіт: форма, довжини сегментів, загальна довжина ── */
  window.getLinearElementLines=function(state){
    var src=state&&Array.isArray(state.linearElements)?state.linearElements:arr();
    return src.map(function(e){
      var el=computeTotals(Object.assign({},e));
      var segs=(el.segments||[]).map(function(v){return Math.round(num(v,0))+' см';}).join(' + ');
      var shape=(SHAPES[el.shape]||SHAPES.line).label;
      return typeDef(el.elementType).label+' ('+shape+'): '+segs+' = '+Math.round(el.totalLengthCm)+' см'+(el.cornerCount?', кутів: '+el.cornerCount:'');
    });
  };
  /* ── Модалка редагування (як редактор стін: поле + дії) ── */
  function el(id){ return document.getElementById(id); }
  function ensureModal(){
    if(el('leModal')) return;
    var d=document.createElement('div');
    d.id='leModal';
    d.style.cssText='display:none;position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.45);align-items:flex-end;justify-content:center';
    d.innerHTML='<div class="le-modal-card-v322" style="background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px 16px 22px;box-shadow:0 -8px 32px rgba(0,0,0,.2);max-height:92dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;box-sizing:border-box">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      +'<div id="leTitle" style="font-weight:800;font-size:16px;color:#0f172a"></div>'
      +'<button type="button" onclick="leClose()" style="background:0 0;box-shadow:none;color:#94a3b8;font-size:22px;padding:2px 6px;line-height:1">×</button></div>'
      +'<div id="leBody"></div></div>';
    document.body.appendChild(d);
  }
  function ensureJoystick(){
    if(el('leJoystick')) return;
    var d=document.createElement('div');
    d.id='leJoystick';
    d.style.cssText='display:none;position:fixed;left:0;right:0;bottom:0;z-index:9100;padding:7px 9px calc(7px + env(safe-area-inset-bottom));pointer-events:none';
    d.innerHTML='<div style="pointer-events:auto;max-width:420px;margin:0 auto;background:rgba(255,255,255,.98);border:1px solid #dbeafe;border-radius:20px;padding:9px 10px;box-shadow:0 -8px 28px rgba(15,23,42,.20);backdrop-filter:blur(12px)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><b style="font-size:13px;color:#0f172a">Переміщення</b><span id="leJoyStepLabel" style="font-size:11px;font-weight:900;color:#2563eb">5 см</span></div>'
      +'<div style="display:grid;grid-template-columns:44px 44px 44px;grid-template-rows:40px 40px 40px;gap:4px;justify-content:center">'
      +'<span></span><button class="le-joy-dir" data-dx="0" data-dy="-1" type="button" style="padding:0;font-size:18px;border-radius:11px">▲</button><span></span>'
      +'<button class="le-joy-dir" data-dx="-1" data-dy="0" type="button" style="padding:0;font-size:18px;border-radius:11px">◀</button>'
      +'<button type="button" onclick="leJoyCenter()" style="padding:0;font-size:9px;font-weight:900;background:#eff6ff;color:#1d4ed8;border-radius:11px">ЦЕНТР</button>'
      +'<button class="le-joy-dir" data-dx="1" data-dy="0" type="button" style="padding:0;font-size:18px;border-radius:11px">▶</button>'
      +'<span></span><button class="le-joy-dir" data-dx="0" data-dy="1" type="button" style="padding:0;font-size:18px;border-radius:11px">▼</button><span></span></div>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:6px">'
      +'<button type="button" onclick="leJoyStep(1)" style="min-height:32px;padding:4px;font-size:11px">1 см</button>'
      +'<button type="button" onclick="leJoyStep(5)" style="min-height:32px;padding:4px;font-size:11px">5 см</button>'
      +'<button type="button" onclick="leJoyStep(10)" style="min-height:32px;padding:4px;font-size:11px">10 см</button></div>'
      +'<div style="display:grid;grid-template-columns:.8fr 1fr 1.15fr;gap:5px;margin-top:6px">'
      +'<button type="button" onclick="leJoySmart()" style="min-height:34px;padding:5px;background:#eff6ff;color:#1d4ed8;font-size:11px">Авто</button>'
      +'<button type="button" onclick="leJoyCancel()" style="min-height:34px;padding:5px;background:#fff1f2;color:#be123c;font-size:11px">Скасувати</button>'
      +'<button type="button" onclick="leJoyDone()" style="min-height:34px;padding:5px;background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;font-size:11px;font-weight:900">Готово</button></div></div>';
    document.body.appendChild(d);
    var repeatTimer=null,repeatDelay=null;
    function stopRepeat(){clearTimeout(repeatDelay);clearInterval(repeatTimer);repeatDelay=repeatTimer=null;}
    d.querySelectorAll('.le-joy-dir').forEach(function(btn){
      var run=function(){leJoyMove(num(btn.getAttribute('data-dx'),0),num(btn.getAttribute('data-dy'),0));};
      btn.addEventListener('pointerdown',function(ev){
        ev.preventDefault();run();
        repeatDelay=setTimeout(function(){repeatTimer=setInterval(run,90);},320);
      });
      ['pointerup','pointercancel','pointerleave'].forEach(function(n){btn.addEventListener(n,stopRepeat);});
    });
  }
  var curId=null,joyStepCm=5,joySnapshot=null;
  function find(id){ var a=arr(); for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }
  function linearShapeIcon(shape){
    var common='viewBox="0 0 92 68" width="70" height="50" aria-hidden="true"';
    var path='';
    if(shape==='line') path='<path d="M14 34H78"/>';
    else if(shape==='L') path='<path d="M14 18H68V56"/>';
    else if(shape==='U') path='<path d="M18 14V54H74V14"/>';
    else path='<rect x="18" y="12" width="56" height="44" rx="2"/>';
    return '<svg '+common+'><g fill="none" stroke="#111827" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">'+path+'</g>'
      +'<g fill="none" stroke="#facc15" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">'+path+'</g></svg>';
  }
  function shapeDefaultSegments(shape,current){
    current=Array.isArray(current)?current:[];
    if(shape==='line') return [num(current[0],200)];
    if(shape==='L') return [num(current[0],100),num(current[1],300)];
    if(shape==='U'){
      var leg=num(current[0],100), width=num(current[1],300);
      return [leg,width,leg];
    }
    return [num(current[0],200),num(current[1],200)];
  }
  function openEditor(id){
    ensureModal(); curId=id; var e=find(id); if(!e) return;
    var td=typeDef(e.elementType), sh=(SHAPES[e.shape]||SHAPES.line);
    el('leTitle').textContent=td.icon+' '+td.label;
    var labels=e.shape==='line'?['Довжина']:e.shape==='L'?['Верхня горизонталь','Права вертикаль вниз']:e.shape==='U'?['Ліва сторона','Нижня горизонталь','Права сторона']:['Ширина','Висота'];
    if(e.elementType==='lightLine'){
      if(!Array.isArray(e.segmentAngles))e.segmentAngles=(e.segments||[]).map(function(){return 0;});
      while(e.segmentAngles.length<e.segments.length)e.segmentAngles.push(0);
    }
    if(e.elementType==='lightLine'){
      if(!e.lightShapeMode)e.lightShapeMode='basic';
      if(e.lightShapeMode==='free'){
        e.lightShapeMode='basic';
        e.shape='line';
        e.segments=[Math.max(1,num(e.segments&&e.segments[0],200))];
      }
      if(!(num(e.rhombusSide,0)>0))e.rhombusSide=Math.max(1,num(e.segments&&e.segments[0],100));
      if(!(num(e.rhombusAngle,0)>0))e.rhombusAngle=60;
    }
    var segmentFields=e.elementType==='lightLine'
      ?(e.segments||[]).map(function(v,i){
        var angle=num(e.segmentAngles&&e.segmentAngles[i],0);
        return '<div style="border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin:8px 0;background:#f8fafc">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
          +'<b style="font-size:12px;color:#334155">Сегмент '+(i+1)+'</b>'
          +(e.segments.length>1?'<button type="button" onclick="leRemoveLightSegment('+i+')" style="width:34px;height:34px;padding:0;border-radius:9px;background:#fff1f2;color:#dc2626;border:1px solid #fecaca;box-shadow:none">×</button>':'')
          +'</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
          +'<label style="font-size:11px;color:#64748b;font-weight:800">Довжина, см'
          +'<input class="le-seg" data-index="'+i+'" type="number" inputmode="decimal" min="1" step="0.1" value="'+num(v,0)+'" '
          +'style="width:100%;box-sizing:border-box;height:44px;margin-top:4px;padding:7px 9px;border:2px solid #e2e8f0;border-radius:11px;font-size:16px;font-weight:800;text-align:center"></label>'
          +'<label style="font-size:11px;color:#64748b;font-weight:800">Кут, °'
          +'<input class="le-angle" data-index="'+i+'" type="number" inputmode="decimal" min="-180" max="180" step="1" value="'+angle+'" '
          +'style="width:100%;box-sizing:border-box;height:44px;margin-top:4px;padding:7px 9px;border:2px solid #e2e8f0;border-radius:11px;font-size:16px;font-weight:800;text-align:center"></label>'
          +'</div></div>';
      }).join('')
      +'<button type="button" onclick="leAddLightSegment()" style="width:100%;height:44px;margin:8px 0 4px;border-radius:12px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;box-shadow:none;font-weight:900">＋ Додати сегмент</button>'
      +'<div style="font-size:10px;color:#64748b;line-height:1.35;margin:4px 2px 10px">0° — прямо. Додатний кут повертає сегмент в один бік, від’ємний — в інший. Кожен сегмент має свій кут.</div>'
      :labels.map(function(label,i){
        return '<label style="display:block;font-size:11px;color:#64748b;font-weight:800;margin:6px 0 3px">'+label+', см</label>'
          +'<input class="le-seg" data-index="'+i+'" type="number" inputmode="decimal" min="1" step="1" value="'+Math.round(num(e.segments[i],0))+'" '
          +'style="width:100%;box-sizing:border-box;height:46px;padding:7px 10px;border:2px solid #e2e8f0;border-radius:12px;font-size:17px;font-weight:800;text-align:center">';
      }).join('');
    if(e.elementType==='lightLine'){
      var baseMode=e.lightShapeMode==='basic';
      var choices=[
        {mode:'basic',shape:'line',label:'Пряма',icon:'line'},
        {mode:'basic',shape:'L',label:'Г-подібна',icon:'L'},
        {mode:'basic',shape:'U',label:'П-подібна',icon:'U'},
        {mode:'basic',shape:'rectangle',label:'Квадрат',icon:'rectangle'},
        {mode:'rhombus',shape:'rhombus',label:'Ромб',icon:'rhombus'}
      ];
      function lightPresetIconV313(kind){
        var common='viewBox="0 0 48 34" width="42" height="28" aria-hidden="true"';
        var style='fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
        if(kind==='line'){
          return '<svg '+common+'><path '+style+' d="M10 17 H38"/></svg>';
        }
        if(kind==='L'){
          return '<svg '+common+'><path '+style+' d="M10 10 H32 V28"/></svg>';
        }
        if(kind==='U'){
          return '<svg '+common+'><path '+style+' d="M11 8 V27 M11 8 H37 M37 8 V27"/></svg>';
        }
        if(kind==='rectangle'){
          return '<svg '+common+'><rect '+style+' x="12" y="6" width="24" height="22" rx="1"/></svg>';
        }
        if(kind==='rhombus'){
          return '<svg '+common+'><path '+style+' d="M24 5 L39 17 L24 29 L9 17 Z"/></svg>';
        }
        return linearShapeIcon(kind);
      }
      var modeBar='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:10px">'
        +choices.map(function(item){
          var active=(item.mode==='basic'&&baseMode&&e.shape===item.shape)||(item.mode==='rhombus'&&e.lightShapeMode==='rhombus');
          return '<button type="button" onclick="leSelectLightPreset(\''+item.mode+'\',\''+item.shape+'\')" '
            +'style="min-height:76px;padding:5px 3px;border-radius:12px;border:2px solid '+(active?'#2563eb':'#e2e8f0')+';'
            +'background:'+(active?'#eff6ff':'#fff')+';color:'+(active?'#2563eb':'#475569')+';font-weight:900;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px">'
            +lightPresetIconV313(item.icon)
            +'<span style="font-size:11px;font-weight:900">'+item.label+'</span></button>';
        }).join('')
        +'</div>';

      if(e.lightShapeMode==='rhombus'){
        segmentFields=modeBar
          +'<div style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:14px;padding:11px;margin:8px 0">'
          +'<label style="display:block;font-size:11px;color:#64748b;font-weight:800">Довжина сторони, см'
          +'<input id="leRhombusSide" type="number" inputmode="decimal" min="1" step="0.1" value="'+num(e.rhombusSide,100)+'" style="width:100%;box-sizing:border-box;height:44px;margin-top:4px;padding:7px 9px;border:2px solid #ddd6fe;border-radius:11px;font-size:16px;font-weight:800;text-align:center"></label>'
          +'<div style="font-size:11px;color:#64748b;font-weight:800;margin-top:10px">Гострий кут</div>'
          +'<div style="display:grid;grid-template-columns:52px 1fr 52px;gap:7px;align-items:center;margin-top:5px">'
          +'<button type="button" onclick="leRhombusAngleStep(-1)" style="height:44px;border-radius:11px;border:1px solid #c4b5fd;background:#fff;color:#6d28d9;font-size:24px;font-weight:900;box-shadow:none">−</button>'
          +'<div style="height:44px;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid #c4b5fd;border-radius:11px;font-size:18px;font-weight:950;color:#4c1d95"><span id="leRhombusAngleValue">'+(Math.round(num(e.rhombusAngle,60)*10)/10)+'</span>°</div>'
          +'<button type="button" onclick="leRhombusAngleStep(1)" style="height:44px;border-radius:11px;border:1px solid #c4b5fd;background:#fff;color:#6d28d9;font-size:24px;font-weight:900;box-shadow:none">＋</button>'
          +'</div>'
          +'<div style="margin-top:8px;font-size:10px;line-height:1.35;color:#64748b">Змінюєш один кут — протилежний змінюється так само. Фігура завжди залишається ромбом.</div>'
          +'</div>';
      }else if(e.lightShapeMode==='basic'){
        var basicLabels=e.shape==='line'?['Довжина']:
          e.shape==='L'?['Горизонталь','Вертикаль']:
          e.shape==='U'?['Довжина бокових сторін','Ширина перемички']:
          ['Ширина','Висота'];
        var basicValues=e.shape==='U'
          ?[num(e.segments[0],100),num(e.segments[1],300)]
          :basicLabels.map(function(_,i){return num(e.segments[i],0);});
        segmentFields=modeBar+basicLabels.map(function(label,i){
          return '<label style="display:block;font-size:11px;color:#64748b;font-weight:800;margin:6px 0 3px">'+label+', см</label>'
            +'<input class="le-seg" data-index="'+i+'" type="number" inputmode="decimal" min="1" step="0.1" value="'+basicValues[i]+'" '
            +'style="width:100%;box-sizing:border-box;height:46px;padding:7px 10px;border:2px solid #e2e8f0;border-radius:12px;font-size:17px;font-weight:800;text-align:center">';
        }).join('')
        +(e.shape==='U'?'<div style="font-size:10px;color:#64748b;margin:4px 2px 8px">Ліва і права бокові сторони завжди однакові.</div>':'');
      }else{
        segmentFields=modeBar+segmentFields;
      }
    }

    var shapeButtons=e.elementType==='lightLine'?'':[
      {key:'line',label:'Пряма'},
      {key:'L',label:'Г-подібна'},
      {key:'U',label:'П-подібна'},
      {key:'rectangle',label:'Квадрат'}
    ].map(function(item){
      var active=e.shape===item.key;
      return '<button type="button" onclick="leSelectShape(\''+item.key+'\')" style="min-height:84px;padding:4px 3px;border-radius:15px;border:2px solid '+(active?'#2563eb':'#dbe2ea')+';background:'+(active?'#eff6ff':'#fff')+';box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">'
        +linearShapeIcon(item.key)
        +'<span style="font-size:11px;font-weight:900;color:'+(active?'#2563eb':'#334155')+'">'+item.label+'</span></button>';
    }).join('');

    var width35=Math.round(num(e.profileWidth,35))!==50;
    el('leBody').innerHTML=
      '<div style="font-size:12px;font-weight:900;color:#334155;margin:2px 0 7px">'+(e.elementType==='lightLine'?'Форма світлової лінії':'Форма лінійного елемента')+'</div>'
      +(e.elementType==='lightLine'?'':'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'+shapeButtons+'</div>')
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
      +'<span style="background:#f0fdf4;color:#15803d;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:800">Кутів: '+e.cornerCount+'</span>'
      +'<span id="leTotal" style="background:#f8fafc;color:#334155;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:800">'+Math.round(e.totalLengthCm)+' см</span></div>'
      +segmentFields
      +'<div style="font-size:12px;font-weight:900;color:#334155;margin:14px 0 7px">Ширина профілю</div>'
      +'<input id="leW" type="hidden" value="'+(width35?35:50)+'">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
      +'<button id="leW35" type="button" onclick="leSetWidth(35)" style="min-height:40px;border-radius:12px;border:2px solid '+(width35?'#2563eb':'#dbe2ea')+';background:'+(width35?'#eff6ff':'#fff')+';color:'+(width35?'#2563eb':'#334155')+';font-size:15px;font-weight:900;box-shadow:none">35 мм</button>'
      +'<button id="leW50" type="button" onclick="leSetWidth(50)" style="min-height:40px;border-radius:12px;border:2px solid '+(!width35?'#2563eb':'#dbe2ea')+';background:'+(!width35?'#eff6ff':'#fff')+';color:'+(!width35?'#2563eb':'#334155')+';font-size:15px;font-weight:900;box-shadow:none">50 мм</button></div>'
      +(e.elementType==='lightLine'
        ?'<div style="font-size:12px;font-weight:900;color:#334155;margin:14px 0 7px">Поворот всієї фігури</div>'
          +'<div style="display:grid;grid-template-columns:52px 1fr 52px;gap:7px;align-items:center;margin-bottom:8px">'
          +'<button type="button" onclick="leRotateStep(-5)" style="height:44px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:21px;font-weight:900;box-shadow:none">↺</button>'
          +'<div style="display:flex;align-items:center;gap:6px;height:44px">'
            +'<input id="leRotationDeg" type="number" inputmode="decimal" step="1" min="-360" max="360" value="'+(Math.round(num(e.rotation,0)*10)/10)+'" '
            +'style="width:100%;height:44px;box-sizing:border-box;border:2px solid #e2e8f0;border-radius:11px;padding:6px 8px;text-align:center;font-size:16px;font-weight:900">'
            +'<span style="font-size:14px;font-weight:900;color:#475569">°</span>'
          +'</div>'
          +'<button type="button" onclick="leRotateStep(5)" style="height:44px;border-radius:11px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-size:21px;font-weight:900;box-shadow:none">↻</button>'
          +'</div>'
          +'<button type="button" onclick="leAlignHorizontal()" style="width:100%;height:42px;margin:0 0 8px;border-radius:11px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-weight:900;box-shadow:none">'+(e.lightShapeMode==='rhombus'?'◇ Вирівняти ромб':'↔ Вирівняти по горизонталі')+'</button>'
          +'<button type="button" onclick="leAlignToRoomWalls()" style="width:100%;height:42px;margin:0 0 8px;border-radius:11px;border:1px solid #bbf7d0;background:#f0fdf4;color:#15803d;font-weight:900;box-shadow:none">▱ Вирівняти по стінах кімнати</button>'
          +'<div style="font-size:10px;color:#64748b;margin-bottom:10px">'+(e.lightShapeMode==='rhombus'
            ?'Перша кнопка рівняє ромб по екрану. Друга — по напрямку основних стін кімнати. Внутрішній кут ромба не змінюється.'
            :'Можна вирівняти по екрану або автоматично по напрямку основних стін кімнати.')+'</div>'
        :'')
      +'<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:8px;margin-bottom:10px">'
      +'<button type="button" onclick="leStartMove()" style="background:#eff6ff;color:#1d4ed8;font-weight:900">🎮 Перемістити на плані</button>'
      +'<button type="button" onclick="leCenterNow()" style="background:#f8fafc;color:#334155;font-weight:900">По центру</button></div>'
      +'<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px">'
      +'<button type="button" onclick="leDuplicate()" style="background:#f1f5f9;color:#1e293b;font-weight:850">⧉ Дублювати</button></div>'
      +'<div class="le-save-row-v322" style="display:flex;gap:8px">'
      +'<button type="button" id="leSaveBtnV322" onclick="leApply()" style="flex:2;background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;font-weight:800">Зберегти</button>'
      +'<button type="button" id="leDel" onclick="leDelete(this)" style="flex:1;background:#fef2f2;color:#dc2626;font-weight:800">🗑</button></div>';
    el('leModal').style.display='flex';
  }
  window.openLinearElementEditor=openEditor;
  window.leSelectShape=function(shape){
    var e=find(curId);if(!e)return;
    if(e.elementType==='lightLine')e.lightShapeMode='basic';
    e.shape=shape;
    e.segments=shapeDefaultSegments(shape,e.segments);
    e.rotation=0;e.flipX=false;e.flipY=false;
    computeTotals(e);putInRoomCenter(e,true);smartOrientLinearElement(e);syncLogicalCenterFromCanvas(e);
    repaintOnly();openEditor(curId);
  };
  window.leSelectLightPreset=function(mode,shape){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;
    if(e.lightShapeMode==='free'&&typeof leCaptureLightInputs==='function')leCaptureLightInputs(e);
    if(mode==='basic'){
      e.lightShapeMode='basic';
      e.shape=shape;
      e.segments=shapeDefaultSegments(shape,e.segments);
    }else if(mode==='rhombus'){
      e.lightShapeMode='rhombus';
      e.rhombusSide=Math.max(1,num(e.rhombusSide,num(e.segments&&e.segments[0],100)));
      e.rhombusAngle=Math.max(10,Math.min(170,num(e.rhombusAngle,60)));
    }else{
      e.lightShapeMode='basic';
      e.shape='line';
      e.segments=shapeDefaultSegments('line',e.segments);
    }
    computeTotals(e);syncPoints(e);repaintOnly();openEditor(curId);
  };

  function leCaptureLightInputs(e){
    if(!e||e.elementType!=='lightLine')return;
    var segs=Array.prototype.slice.call(document.querySelectorAll('#leBody .le-seg'));
    var angs=Array.prototype.slice.call(document.querySelectorAll('#leBody .le-angle'));
    if(segs.length){
      e.segments=segs.map(function(inp){return Math.max(1,num(inp.value,1));});
    }
    if(angs.length){
      e.segmentAngles=angs.map(function(inp){return Math.max(-180,Math.min(180,num(inp.value,0)));});
    }
    computeTotals(e);syncPoints(e);
  }
  window.leSetLightShapeMode=function(mode){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;
    if(e.lightShapeMode==='free'&&typeof leCaptureLightInputs==='function')leCaptureLightInputs(e);
    e.lightShapeMode=(mode==='rhombus'?'rhombus':'free');
    if(e.lightShapeMode==='rhombus'){
      e.rhombusSide=Math.max(1,num(e.rhombusSide,num(e.segments&&e.segments[0],100)));
      e.rhombusAngle=Math.max(10,Math.min(170,num(e.rhombusAngle,60)));
    }
    computeTotals(e);syncPoints(e);repaintOnly();openEditor(curId);
  };
  window.leRhombusAngleStep=function(delta){
    var e=find(curId);if(!e||e.elementType!=='lightLine'||e.lightShapeMode!=='rhombus')return;
    var si=el('leRhombusSide');
    if(si)e.rhombusSide=Math.max(1,num(si.value,e.rhombusSide||100));
    e.rhombusAngle=Math.max(10,Math.min(170,num(e.rhombusAngle,60)+num(delta,0)));
    computeTotals(e);syncPoints(e);repaintOnly();
    var av=el('leRhombusAngleValue');if(av)av.textContent=Math.round(e.rhombusAngle*10)/10;
  };
  window.leAddLightSegment=function(){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;
    leCaptureLightInputs(e);
    var lastLen=e.segments.length?num(e.segments[e.segments.length-1],100):100;
    var lastAng=e.segmentAngles&&e.segmentAngles.length?num(e.segmentAngles[e.segmentAngles.length-1],0):0;
    e.segments.push(lastLen);
    e.segmentAngles=e.segmentAngles||[];
    e.segmentAngles.push(lastAng);
    computeTotals(e);syncPoints(e);repaintOnly();openEditor(curId);
  };
  window.leRemoveLightSegment=function(index){
    var e=find(curId);if(!e||e.elementType!=='lightLine'||e.segments.length<=1)return;
    leCaptureLightInputs(e);
    e.segments.splice(index,1);
    if(Array.isArray(e.segmentAngles))e.segmentAngles.splice(index,1);
    computeTotals(e);syncPoints(e);repaintOnly();openEditor(curId);
  };

  function leNormalizeDegV312(a){
    a=num(a,0)%360;
    if(a>180)a-=360;
    if(a<=-180)a+=360;
    return a;
  }
  function leAngleDiff180V312(a,b){
    var d=Math.abs(leNormalizeDegV312(a-b));
    return Math.min(d,Math.abs(180-d));
  }
  function leDominantRoomWallAngleV312(){
    try{
      if(!Array.isArray(pts)||pts.length<2)return 0;
      var candidates=[];
      for(var i=0;i<pts.length;i++){
        var a=pts[i],b=pts[(i+1)%pts.length];
        if(!a||!b)continue;
        var dx=b.x-a.x,dy=b.y-a.y;
        var pxLen=Math.hypot(dx,dy);
        if(!(pxLen>0))continue;
        var cmLen=pxLen;
        try{
          if(typeof _sideLenCm==='function'){
            var sl=num(_sideLenCm(i),0);
            if(sl>0)cmLen=sl;
          }else if(Array.isArray(lengths)&&num(lengths[i],0)>0){
            cmLen=num(lengths[i],pxLen);
          }
        }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        var angle=Math.atan2(dy,dx)*180/Math.PI;
        // Direction of a wall is axial: 0° and 180° are the same.
        while(angle>=90)angle-=180;
        while(angle<-90)angle+=180;
        candidates.push({i:i,len:cmLen,angle:angle});
      }
      if(!candidates.length)return 0;

      // Use the longest wall as the main orientation seed.
      candidates.sort(function(x,y){return y.len-x.len;});
      var seed=candidates[0].angle;

      // Refine by weighted average of walls parallel/near-parallel to the longest one.
      var sx=0,sy=0,weight=0;
      candidates.forEach(function(w){
        if(leAngleDiff180V312(w.angle,seed)<=18){
          var rad=(w.angle*2)*Math.PI/180;
          sx+=Math.cos(rad)*w.len;
          sy+=Math.sin(rad)*w.len;
          weight+=w.len;
        }
      });
      if(weight>0){
        seed=(Math.atan2(sy,sx)/2)*180/Math.PI;
      }
      return seed;
    }catch(_){
      return 0;
    }
  }

  window.leAlignToRoomWalls=function(){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;
    var wallAngle=leDominantRoomWallAngleV312();

    if(e.lightShapeMode==='rhombus'){
      /* Align one rhombus symmetry axis with the dominant room-wall direction.
         The local long diagonal is at alpha/2 relative to the first side. */
      var alpha=Math.max(10,Math.min(170,num(e.rhombusAngle,60)));
      e.rotation=wallAngle-(alpha/2);
    }else if(e.lightShapeMode==='free'&&Array.isArray(e.segmentAngles)&&e.segmentAngles.length){
      e.rotation=wallAngle-num(e.segmentAngles[0],0);
    }else{
      e.rotation=wallAngle;
    }

    e.rotation=leNormalizeDegV312(e.rotation);
    var inp=el('leRotationDeg');
    if(inp)inp.value=Math.round(e.rotation*10)/10;
    syncPoints(e);
    repaintOnly();

    if(typeof showToast==='function'){
      showToast('▱ Вирівняно по стінах · '+(Math.round(wallAngle*10)/10)+'°');
    }
  };

  window.leAlignHorizontal=function(){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;

    if(e.lightShapeMode==='rhombus'){
      /* Для ромба вирівнюємо НЕ сторону, а осі симетрії:
         ліва/права вершини стають на одній горизонталі,
         верхня/нижня — на одній вертикалі.
         У локальній геометрії довга діагональ має кут alpha/2,
         тому для "стоячого" ромба повертаємо її на 90°. */
      var alpha=Math.max(10,Math.min(170,num(e.rhombusAngle,60)));
      e.rotation=90-(alpha/2);
    }else if(e.lightShapeMode==='free'&&Array.isArray(e.segmentAngles)&&e.segmentAngles.length){
      /* Для ламаної — горизонтально по першому сегменту. */
      e.rotation=-num(e.segmentAngles[0],0);
    }else{
      /* Пряма / Г / П / квадрат — по базовій горизонталі. */
      e.rotation=0;
    }

    var inp=el('leRotationDeg');
    if(inp)inp.value=Math.round(e.rotation*10)/10;
    syncPoints(e);
    repaintOnly();

    if(typeof showToast==='function'){
      showToast(e.lightShapeMode==='rhombus'
        ?'◇ Ромб вирівняно по осях'
        :'↔ Вирівняно по горизонталі');
    }
  };
  window.leRotateStep=function(delta){
    var e=find(curId);if(!e||e.elementType!=='lightLine')return;
    var inp=el('leRotationDeg');
    var base=inp?num(inp.value,num(e.rotation,0)):num(e.rotation,0);
    e.rotation=base+num(delta,0);
    while(e.rotation>360)e.rotation-=360;
    while(e.rotation<-360)e.rotation+=360;
    if(inp)inp.value=Math.round(e.rotation*10)/10;
    syncPoints(e);repaintOnly();
  };
  window.leSetWidth=function(width){
    width=width===50?50:35;
    var hidden=el('leW');if(hidden)hidden.value=width;
    ['35','50'].forEach(function(v){
      var b=el('leW'+v);if(!b)return;
      var active=+v===width;
      b.style.borderColor=active?'#2563eb':'#dbe2ea';
      b.style.background=active?'#eff6ff':'#fff';
      b.style.color=active?'#2563eb':'#334155';
    });
  };

  window.leClose=function(){ var m=el('leModal'); if(m) m.style.display='none'; var j=el('leJoystick');if(j)j.style.display='none';joySnapshot=null;curId=null; };
  window.leApply=function(){
    var e=find(curId); if(!e) return;
    if(e.elementType==='lightLine'&&e.lightShapeMode==='rhombus'){
      var si=el('leRhombusSide');
      e.rhombusSide=Math.max(1,num(si&&si.value,e.rhombusSide||100));
      e.rhombusAngle=Math.max(10,Math.min(170,num(e.rhombusAngle,60)));
      e.segments=[e.rhombusSide,e.rhombusSide,e.rhombusSide,e.rhombusSide];
      e.segmentAngles=[0,e.rhombusAngle,180,180+e.rhombusAngle];
    }else{
      var inputs=Array.prototype.slice.call(document.querySelectorAll('#leBody .le-seg'));
      var next=[];
      for(var i=0;i<inputs.length;i++){
        var v=num(inputs[i].value,0);
        if(!(v>0)){ if(typeof showToast==='function') showToast('⚠️ Вкажіть усі довжини'); return; }
        next[+inputs[i].getAttribute('data-index')]=v;
      }
      if(e.elementType==='lightLine'&&e.lightShapeMode==='basic'&&e.shape==='U'){
        var leg=Math.max(1,num(next[0],100));
        var width=Math.max(1,num(next[1],300));
        e.segments=[leg,width,leg];
      }else{
        e.segments=next;
      }
      if(e.elementType==='lightLine'&&e.lightShapeMode==='free'){
        var angleInputs=Array.prototype.slice.call(document.querySelectorAll('#leBody .le-angle'));
        e.segmentAngles=angleInputs.map(function(inp){return Math.max(-180,Math.min(180,num(inp.value,0)));});
        while(e.segmentAngles.length<e.segments.length)e.segmentAngles.push(0);
      }
    }
    if(e.elementType==='lightLine'){
      var rotInput=el('leRotationDeg');
      if(rotInput)e.rotation=num(rotInput.value,num(e.rotation,0));
    }
    e.profileWidth=num(el('leW')&&el('leW').value,35)===50?50:35;
    e.anchor=e.anchor||{};e.anchor.sideIndex=-1;
    computeTotals(e);syncPoints(e);syncLogicalCenterFromCanvas(e);persist();applyLinearNomenclature();
    var t=el('leTotal'); if(t) t.textContent=Math.round(e.totalLengthCm)+' см';
    if(typeof showToast==='function') showToast('✓ Збережено');
    /* v3.22: після успішного збереження закриваємо редактор.
       Якщо валідація довжин не пройшла — код вище робить return і сюди не доходить. */
    window.leClose();
  };
  window.leRotate=function(){ var e=find(curId); if(!e) return; e.rotation=(num(e.rotation,0)+90)%360; e.anchor=e.anchor||{};e.anchor.sideIndex=-1;syncPoints(e);persist(); };
  window.leCenterNow=function(){
    var e=find(curId);if(!e)return;putInRoomCenter(e,true);smartOrientLinearElement(e);syncLogicalCenterFromCanvas(e);repaintOnly();
    if(typeof showToast==='function')showToast('✓ По центру та вздовж стін');
  };
  function moveElementOnScreen(e,dxCm,dyCm){
    if(!e)return;
    var centerPx=ensureCanvasCenter(e),pxPerCm=1;
    try{if(typeof _pxPerCm==='function'&&_pxPerCm()>0)pxPerCm=_pxPerCm();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    e.centerCanvasPx={
      x:centerPx.x+dxCm*pxPerCm,
      y:centerPx.y+dyCm*pxPerCm
    };
    e.anchor=e.anchor||{};e.anchor.sideIndex=-1;
    syncLogicalCenterFromCanvas(e);
    repaintOnly();
  }
  window.leStartMove=function(){
    var e=find(curId);if(!e)return;
    ensureJoystick();joySnapshot=JSON.parse(JSON.stringify(e));
    var m=el('leModal');if(m)m.style.display='none';
    el('leJoystick').style.display='block';
    repaintOnly();
  };
  window.leJoyStep=function(v){joyStepCm=Math.max(1,num(v,5));var t=el('leJoyStepLabel');if(t)t.textContent=joyStepCm+' см';};
  window.leJoyMove=function(dx,dy){var e=find(curId);if(!e)return;moveElementOnScreen(e,dx*joyStepCm,dy*joyStepCm);};
  window.leJoyCenter=function(){var e=find(curId);if(!e)return;putInRoomCenter(e,true);smartOrientLinearElement(e);syncLogicalCenterFromCanvas(e);repaintOnly();};
  window.leJoyRotate=function(){var e=find(curId);if(!e)return;e.rotation=(num(e.rotation,0)+90)%360;e.anchor=e.anchor||{};e.anchor.sideIndex=-1;syncPoints(e);repaintOnly();};
  window.leJoySmart=function(){var e=find(curId);if(!e)return;smartOrientLinearElement(e);repaintOnly();};
  window.leJoyDone=function(){
    var j=el('leJoystick');if(j)j.style.display='none';
    var e=find(curId);if(e)syncLogicalCenterFromCanvas(e);
    joySnapshot=null;persist();applyLinearNomenclature();openEditor(curId);
  };
  window.leJoyCancel=function(){
    var e=find(curId);
    if(e&&joySnapshot){Object.keys(e).forEach(function(k){delete e[k];});Object.keys(joySnapshot).forEach(function(k){e[k]=joySnapshot[k];});}
    joySnapshot=null;var j=el('leJoystick');if(j)j.style.display='none';repaintOnly();openEditor(curId);
  };
  window.leDuplicate=function(){
    var e=find(curId); if(!e) return;
    var c=JSON.parse(JSON.stringify(e)); c.id=uid();
    var cp=ensureCanvasCenter(c),pxScale=1;try{if(typeof _pxPerCm==='function'&&_pxPerCm()>0)pxScale=_pxPerCm();}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    c.centerCanvasPx={x:cp.x+20*pxScale,y:cp.y+20*pxScale};
    computeTotals(c); syncPoints(c); arr().push(c); persist(); openEditor(c.id);
    if(typeof showToast==='function') showToast('⧉ Дубльовано');
  };
  window.leDelete=function(btn){
    var run=function(){
      var a=arr(), i=a.findIndex(function(x){return x.id===curId;});
      if(i<0) return; a.splice(i,1); persist(); applyLinearNomenclature(); window.leClose();
      if(typeof showToast==='function') showToast('🗑 Елемент видалено');
    };
    if(typeof confirmTap==='function') confirmTap(btn,'⚠️ Видалити елемент?',run); else run();
  };

  /* ── Пункт у меню світла: тип → форма → створення ── */
  window.rmOpenLinearElement=function(){
    try{ if(typeof closeRmLightStart==='function') closeRmLightStart(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{ if(typeof closeLightMenu==='function') closeLightMenu(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    ensureModal(); curId=null;
    el('leTitle').textContent='💡 Лінійне освітлення';
    el('leBody').innerHTML='<div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:8px">Оберіть тип</div>'
      +TYPES.map(function(t){ return '<button type="button" onclick="leChooseType(\''+t.key+'\')" style="width:100%;display:flex;align-items:center;gap:10px;background:#f8fafc;color:#0f172a;font-weight:700;margin-bottom:6px;justify-content:flex-start;padding:12px"><span style="font-size:18px">'+t.icon+'</span>'+t.label+'</button>'; }).join('');
    el('leModal').style.display='flex';
  };
  window.leChooseType=function(k){
    if(k==='lightLine'){ create(k,'line'); return; }
    el('leTitle').textContent=typeDef(k).icon+' '+typeDef(k).label;
    el('leBody').innerHTML='<div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:8px">Оберіть форму</div>'
      +Object.keys(SHAPES).map(function(s){
        var on=STAGE1.indexOf(s)>=0;
        return '<button type="button" '+(on?'onclick="leCreate(\''+k+'\',\''+s+'\')"':'disabled')+' style="width:100%;text-align:left;margin-bottom:6px;padding:12px;font-weight:700;'+(on?'background:#f8fafc;color:#0f172a':'background:#f1f5f9;color:#cbd5e1')+'">'+SHAPES[s].label+(on?'':' — скоро')+'</button>';
      }).join('');
  };
  window.leCreate=function(k,s){ create(k,s); };

  /* Пункт у меню світла (renderLightMenu перемальовує меню — доповнюємо після нього) */
  function addMenuItem(){
    var menu=document.getElementById('lightMenu'); if(!menu) return;
    if(menu.querySelector('[data-le-item]')) return;
    var b=document.createElement('button');
    b.type='button'; b.className='quick-menu-card'; b.setAttribute('data-le-item','1');
    b.setAttribute('onclick','rmOpenLinearElement()');
    b.innerHTML='<span class="quick-menu-icon">📏</span><span class="quick-menu-text"><b>Лінійний елемент</b><small>Світлова лінія, трек, карниз</small></span>';
    menu.appendChild(b);
  }
  // Живе меню світла — модалка rmLightStartModal, її наповнює локальна renderLauncher(),
  // тому чіпляємось до window.openRmLightStart (його викликає кнопка світла).
  function addLauncherItem(){
    var modal=document.getElementById('rmLightStartModal'); if(!modal) return;
    var grid=modal.querySelector('.rm-ls-grid'); if(!grid) return;
    if(grid.querySelector('[data-le-item]')) return;
    var b=document.createElement('button');
    b.type='button'; b.className='rm-ls-btn primary'; b.setAttribute('data-le-item','1');
    b.setAttribute('onclick','rmOpenLinearElement()');
    b.innerHTML='<span class="rm-ls-icon">\u2015</span><span><b>Лінійний елемент</b></span>';
    var settings=grid.querySelector('.rm-ls-btn.settings');
    if(settings) grid.insertBefore(b,settings); else grid.appendChild(b);
  }
  var _prevOpenLS=window.openRmLightStart;
  window.openRmLightStart=function(){
    var r; try{ if(typeof _prevOpenLS==='function') r=_prevOpenLS.apply(this,arguments); }
    finally{ try{ addLauncherItem(); }catch(_){window.__diagSilent&&window.__diagSilent(_)} }
    return r;
  };
  try{openRmLightStart=window.openRmLightStart;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

  var _prevRLM=window.renderLightMenu;
  window.renderLightMenu=function(){
    var r; try{ if(typeof _prevRLM==='function') r=_prevRLM.apply(this,arguments); }
    finally{ try{ addMenuItem(); }catch(_){window.__diagSilent&&window.__diagSilent(_)} }
    return r;
  };
  try{renderLightMenu=window.renderLightMenu;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
  try{ addMenuItem(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}

})();
