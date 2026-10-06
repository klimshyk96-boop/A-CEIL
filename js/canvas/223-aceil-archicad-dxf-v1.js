(function(){
  "use strict";
  if(window.__A_CEIL_ARCHICAD_DXF_V1)return;
  window.__A_CEIL_ARCHICAD_DXF_V1=true;

  var STORAGE_KEY="aceil-archicad-shrink-percent";
  var SOURCE_LAYER="A_CEIL_SOURCE";
  var SHRUNK_LAYER="A_CEIL_SHRUNK";
  var currentShape=null;

  function lang(){
    try{return window["A·CEIL"]&&window["A·CEIL"].I18n&&window["A·CEIL"].I18n.currentLanguage||"uk"}
    catch(_){return"uk"}
  }
  function text(key){
    var copy={
      uk:{menu:"Експорт в Archicad",hint:"DXF з урахуванням усадки",title:"Експорт у Archicad",shrink:"Усадка (зменшення), %",source:"Вихідний контур",result:"Після усадки",size:"Габарит",perimeter:"Периметр",area:"Площа",layers:"У DXF буде два шари: вихідний контур і зменшений контур.",units:"Одиниці файлу — міліметри. Archicad відкриває DXF без додаткового масштабування.",cancel:"Скасувати",save:"Зберегти DXF",phone:"На телефоні відкриється меню збереження або надсилання файлу.",closed:"Спочатку замкніть контур",dimensions:"Спочатку введіть усі розміри стін",invalid:"Контур має помилку вимірів. Виправте її перед експортом",failed:"Не вдалося створити DXF",done:"DXF для Archicad створено",circle:"Діаметр",badPercent:"Вкажіть усадку від 0 до 30%"},
      en:{menu:"Export to Archicad",hint:"DXF with shrink allowance",title:"Export to Archicad",shrink:"Shrink (reduction), %",source:"Source contour",result:"After shrink",size:"Overall size",perimeter:"Perimeter",area:"Area",layers:"The DXF contains two layers: source contour and reduced contour.",units:"File units are millimetres. Archicad opens the DXF at full scale.",cancel:"Cancel",save:"Save DXF",phone:"On a phone, the save or share sheet will open.",closed:"Close the contour first",dimensions:"Enter all wall dimensions first",invalid:"The contour has a measurement error. Fix it before export",failed:"Could not create DXF",done:"Archicad DXF created",circle:"Diameter",badPercent:"Enter shrink from 0 to 30%"},
      pl:{menu:"Eksport do Archicada",hint:"DXF z uwzględnieniem skurczu",title:"Eksport do Archicada",shrink:"Skurcz (zmniejszenie), %",source:"Kontur źródłowy",result:"Po skurczu",size:"Wymiar całkowity",perimeter:"Obwód",area:"Powierzchnia",layers:"Plik DXF zawiera dwie warstwy: kontur źródłowy i zmniejszony.",units:"Jednostką pliku są milimetry. Archicad otwiera DXF w skali 1:1.",cancel:"Anuluj",save:"Zapisz DXF",phone:"Na telefonie otworzy się menu zapisu lub udostępniania.",closed:"Najpierw zamknij kontur",dimensions:"Najpierw wpisz wszystkie wymiary ścian",invalid:"Kontur ma błąd pomiaru. Popraw go przed eksportem",failed:"Nie udało się utworzyć DXF",done:"Utworzono DXF dla Archicada",circle:"Średnica",badPercent:"Podaj skurcz od 0 do 30%"}
    };
    var selected=copy[lang()]||copy.uk;
    return selected[key]||copy.uk[key]||key;
  }
  function toast(message,duration){
    try{if(typeof showToast==="function")showToast(message,duration||3000)}catch(_){/* UI may not be ready. */}
  }
  function finitePoint(p){return p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))}
  function clonePoints(list){return list.map(function(p){return{x:Number(p.x),y:Number(p.y)}})}
  function distance(a,b){return Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y))}
  function polygonArea(points){
    var sum=0;
    for(var i=0;i<points.length;i++){
      var next=points[(i+1)%points.length];
      sum+=points[i].x*next.y-next.x*points[i].y;
    }
    return Math.abs(sum)/2;
  }
  function polygonCentroid(points){
    var twiceArea=0,x=0,y=0;
    for(var i=0;i<points.length;i++){
      var a=points[i],b=points[(i+1)%points.length],cross=a.x*b.y-b.x*a.y;
      twiceArea+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross;
    }
    if(Math.abs(twiceArea)<1e-8){
      return points.reduce(function(out,p){out.x+=p.x/points.length;out.y+=p.y/points.length;return out},{x:0,y:0});
    }
    return{x:x/(3*twiceArea),y:y/(3*twiceArea)};
  }
  function bounds(points){
    var xs=points.map(function(p){return p.x}),ys=points.map(function(p){return p.y});
    return{minX:Math.min.apply(null,xs),maxX:Math.max.apply(null,xs),minY:Math.min.apply(null,ys),maxY:Math.max.apply(null,ys)};
  }
  function perimeter(points){
    var total=0;
    for(var i=0;i<points.length;i++)total+=distance(points[i],points[(i+1)%points.length]);
    return total;
  }
  function catmull(points,steps){
    if(points.length<3)return points.slice();
    var out=[{x:points[0].x,y:points[0].y}],count=steps||16;
    function at(index){return points[Math.max(0,Math.min(points.length-1,index))]}
    for(var i=0;i<points.length-1;i++){
      var p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
      for(var s=1;s<=count;s++){
        var t=s/count,t2=t*t,t3=t2*t;
        out.push({
          x:.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
          y:.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
        });
      }
    }
    return out;
  }
  function measuredCurvePoints(side,base){
    try{
      var api=window["A·CEILCurveFixedEndsV305"];
      var solution=api&&typeof api.solve==="function"?api.solve(side):null;
      if(solution&&solution.ok){
        var route=[solution.start].concat(solution.controls||[]).concat([solution.end]);
        if(solution.startCorner!==side)route.reverse();
        return catmull(route,16);
      }
    }catch(_){/* Fall through to the basic curve model. */}
    var raw=[];
    try{raw=Array.isArray(arcPoints[side])?arcPoints[side]:[]}catch(_){raw=[]}
    if(!raw.length||raw[0]&&raw[0].model==="measure-points")return[];
    var start=base[side],end=base[(side+1)%base.length];
    var dx=end.x-start.x,dy=end.y-start.y,chord=Math.hypot(dx,dy)||1;
    var ux=dx/chord,uy=dy/chord,nx=-uy,ny=ux;
    var entered=chord;
    try{entered=Number(lengths[side])||chord}catch(_){entered=chord}
    var controls=raw.slice().sort(function(a,b){return(Number(a.d)||0)-(Number(b.d)||0)}).map(function(item){
      var along=Math.max(0,Math.min(entered,Number(item.d)||0))/entered*chord;
      var offset=Number(item.o)||0;
      return{x:start.x+ux*along+nx*offset,y:start.y+uy*along+ny*offset};
    });
    return[start].concat(controls).concat([end]);
  }
  function expandedPolygon(base){
    var output=[];
    for(var i=0;i<base.length;i++){
      if(!output.length)output.push({x:base[i].x,y:base[i].y});
      var isCurve=false;
      try{isCurve=wallTypes[i]==="arc"}catch(_){isCurve=false}
      if(isCurve){
        var curve=measuredCurvePoints(i,base);
        for(var k=1;k<curve.length-1;k++)output.push({x:curve[k].x,y:curve[k].y});
      }
      if(i<base.length-1)output.push({x:base[i+1].x,y:base[i+1].y});
    }
    return output;
  }
  function readCurrentShape(){
    try{
      if(circleMode&&Number(circleDiamCm)>0){
        var radius=Number(circleDiamCm)/2;
        return{type:"circle",center:{x:radius,y:radius},radius:radius};
      }
      if(!closed||!Array.isArray(pts)||pts.length<3)throw new Error(text("closed"));
      if(!Array.isArray(lengths)||lengths.length<pts.length||lengths.slice(0,pts.length).some(function(value){return!(Number(value)>0)}))throw new Error(text("dimensions"));
      var result=window.A_CEIL_HonestGeometry&&window.A_CEIL_HonestGeometry.lastResult;
      if(result&&result.invalid)throw new Error(text("invalid"));
      if(!Array.isArray(realPts)||realPts.length!==pts.length||!realPts.every(finitePoint)){
        if(typeof rebuild==="function")rebuild();
      }
      if(!Array.isArray(realPts)||realPts.length!==pts.length||!realPts.every(finitePoint))throw new Error(text("dimensions"));
      return{type:"polygon",points:expandedPolygon(clonePoints(realPts))};
    }catch(error){throw error instanceof Error?error:new Error(text("failed"))}
  }
  function shrinkShape(shape,percent){
    var factor=1-percent/100;
    if(shape.type==="circle")return{type:"circle",center:{x:shape.center.x,y:shape.center.y},radius:shape.radius*factor};
    var center=polygonCentroid(shape.points);
    return{type:"polygon",points:shape.points.map(function(p){return{x:center.x+(p.x-center.x)*factor,y:center.y+(p.y-center.y)*factor}})};
  }
  function shapeStats(shape){
    if(shape.type==="circle"){
      return{width:shape.radius*2,height:shape.radius*2,perimeter:2*Math.PI*shape.radius,area:Math.PI*shape.radius*shape.radius};
    }
    var box=bounds(shape.points);
    return{width:box.maxX-box.minX,height:box.maxY-box.minY,perimeter:perimeter(shape.points),area:polygonArea(shape.points)};
  }
  function dxfNumber(value){
    var fixed=(Math.round(Number(value)*1000)/1000).toFixed(3);
    return fixed.replace(/\.000$/,"").replace(/(\.\d*?)0+$/,"$1");
  }
  function dxfPair(lines,code,value){lines.push(String(code),String(value))}
  function addPolyline(lines,points,layer,origin){
    dxfPair(lines,0,"LWPOLYLINE");dxfPair(lines,100,"AcDbEntity");dxfPair(lines,8,layer);dxfPair(lines,100,"AcDbPolyline");
    dxfPair(lines,90,points.length);dxfPair(lines,70,1);
    points.forEach(function(p){dxfPair(lines,10,dxfNumber((p.x-origin.minX)*10));dxfPair(lines,20,dxfNumber((origin.maxY-p.y)*10))});
  }
  function addCircle(lines,shape,layer,origin){
    dxfPair(lines,0,"CIRCLE");dxfPair(lines,100,"AcDbEntity");dxfPair(lines,8,layer);dxfPair(lines,100,"AcDbCircle");
    dxfPair(lines,10,dxfNumber((shape.center.x-origin.minX)*10));dxfPair(lines,20,dxfNumber((origin.maxY-shape.center.y)*10));dxfPair(lines,30,0);dxfPair(lines,40,dxfNumber(shape.radius*10));
  }
  function buildDxf(source,shrunk){
    var sourcePoints=source.type==="circle"?[
      {x:source.center.x-source.radius,y:source.center.y-source.radius},
      {x:source.center.x+source.radius,y:source.center.y+source.radius}
    ]:source.points;
    var origin=bounds(sourcePoints),lines=[];
    dxfPair(lines,0,"SECTION");dxfPair(lines,2,"HEADER");dxfPair(lines,9,"$ACADVER");dxfPair(lines,1,"AC1015");dxfPair(lines,9,"$INSUNITS");dxfPair(lines,70,4);dxfPair(lines,0,"ENDSEC");
    dxfPair(lines,0,"SECTION");dxfPair(lines,2,"TABLES");dxfPair(lines,0,"TABLE");dxfPair(lines,2,"LAYER");dxfPair(lines,70,2);
    dxfPair(lines,0,"LAYER");dxfPair(lines,2,SOURCE_LAYER);dxfPair(lines,70,0);dxfPair(lines,62,8);dxfPair(lines,6,"CONTINUOUS");
    dxfPair(lines,0,"LAYER");dxfPair(lines,2,SHRUNK_LAYER);dxfPair(lines,70,0);dxfPair(lines,62,1);dxfPair(lines,6,"CONTINUOUS");
    dxfPair(lines,0,"ENDTAB");dxfPair(lines,0,"ENDSEC");dxfPair(lines,0,"SECTION");dxfPair(lines,2,"ENTITIES");
    if(source.type==="circle"){addCircle(lines,source,SOURCE_LAYER,origin);addCircle(lines,shrunk,SHRUNK_LAYER,origin)}
    else{addPolyline(lines,source.points,SOURCE_LAYER,origin);addPolyline(lines,shrunk.points,SHRUNK_LAYER,origin)}
    dxfPair(lines,0,"ENDSEC");dxfPair(lines,0,"EOF");
    return lines.join("\r\n")+"\r\n";
  }
  function formatCm(value){return(Number(value)||0).toFixed(1)+" см"}
  function formatArea(value){return((Number(value)||0)/10000).toFixed(2)+" м²"}
  function formatPercent(value){return(Number(value)||0).toFixed(1).replace(/\.0$/,"")+"%"}
  function loadPercent(){
    try{var value=Number(localStorage.getItem(STORAGE_KEY));return value>=0&&value<=30?value:7}catch(_){return 7}
  }
  function savePercent(value){try{localStorage.setItem(STORAGE_KEY,String(value))}catch(_){}}
  function renderSummary(){
    var input=document.getElementById("aceilArchicadShrink"),box=document.getElementById("aceilArchicadSummary");
    if(!input||!box||!currentShape)return;
    var percent=Number(String(input.value).replace(",","."));
    if(!Number.isFinite(percent)||percent<0||percent>30){box.innerHTML='<div class="aceil-dxf-error">'+text("badPercent")+'</div>';return}
    var before=shapeStats(currentShape),after=shapeStats(shrinkShape(currentShape,percent));
    var sizeLabel=currentShape.type==="circle"?text("circle"):text("size");
    box.innerHTML='<div class="aceil-dxf-col"><small>'+text("source")+'</small><b>'+sizeLabel+': '+formatCm(before.width)+(currentShape.type==="circle"?'':' × '+formatCm(before.height))+'</b><span>'+text("perimeter")+': '+formatCm(before.perimeter)+' · '+text("area")+': '+formatArea(before.area)+'</span></div>'+
      '<div class="aceil-dxf-arrow">→</div><div class="aceil-dxf-col result"><small>'+text("result")+' '+formatPercent(percent)+'</small><b>'+sizeLabel+': '+formatCm(after.width)+(currentShape.type==="circle"?'':' × '+formatCm(after.height))+'</b><span>'+text("perimeter")+': '+formatCm(after.perimeter)+' · '+text("area")+': '+formatArea(after.area)+'</span></div>';
  }
  function projectName(){
    var name="A-CEIL";
    try{name=String(_currentProjName||document.getElementById("rpcProjectName")&&document.getElementById("rpcProjectName").textContent||name).trim()}catch(_){/* Use fallback. */}
    var room="room";
    try{room=String(_currentProjComment||document.getElementById("rpcRoomName")&&document.getElementById("rpcRoomName").textContent||room).trim()}catch(_){/* Use fallback. */}
    return name+"_"+room;
  }
  function safeFileName(value){
    var map={а:"a",б:"b",в:"v",г:"h",ґ:"g",д:"d",е:"e",є:"ye",ж:"zh",з:"z",и:"y",і:"i",ї:"yi",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ь:"",ю:"yu",я:"ya",ы:"y",э:"e",ё:"yo",ъ:""};
    return String(value||"A-CEIL").toLowerCase().split("").map(function(ch){return Object.prototype.hasOwnProperty.call(map,ch)?map[ch]:ch}).join("").replace(/[^a-z0-9._-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90)||"A-CEIL";
  }
  function triggerDownload(blob,fileName){
    var url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},2000);
  }
  async function exportDxf(){
    try{
      var input=document.getElementById("aceilArchicadShrink");
      var percent=Number(String(input&&input.value||"").replace(",","."));
      if(!Number.isFinite(percent)||percent<0||percent>30){toast(text("badPercent"));return}
      var source=currentShape||readCurrentShape(),reduced=shrinkShape(source,percent);
      savePercent(percent);
      var content=buildDxf(source,reduced),fileName=safeFileName(projectName())+"_shrink-"+String(percent).replace(".","-")+"pct.dxf";
      var blob=new Blob([content],{type:"application/dxf"}),file=new File([blob],fileName,{type:"application/dxf"});
      closeModal();
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:"A·CEIL — Archicad DXF"});toast(text("done"));return}catch(error){if(error&&error.name==="AbortError")return}
      }
      triggerDownload(blob,fileName);toast(text("done"));
    }catch(error){toast(error&&error.message||text("failed"),4200)}
  }
  function ensureUi(){
    if(document.getElementById("aceilArchicadModal"))return;
    var style=document.createElement("style");style.id="aceilArchicadStyles";
    style.textContent='#aceilArchicadModal{position:fixed;inset:0;z-index:10020;display:none;align-items:flex-end;justify-content:center;padding:14px;background:rgba(15,23,42,.46);box-sizing:border-box}#aceilArchicadModal.open{display:flex}#aceilArchicadModal .aceil-dxf-card{width:min(100%,420px);max-height:calc(100dvh - 28px);overflow:auto;background:#fff;border-radius:22px;padding:18px;box-sizing:border-box;box-shadow:0 24px 70px rgba(15,23,42,.28);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1e293b}#aceilArchicadModal .aceil-dxf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px}#aceilArchicadModal h3{margin:0;font-size:18px;line-height:1.2;font-weight:800}#aceilArchicadModal .aceil-dxf-close{width:36px;height:36px;min-height:36px;padding:0;border:0;border-radius:11px;background:#f1f5f9;color:#64748b;font-size:24px;line-height:1;box-shadow:none}#aceilArchicadModal label{display:block;margin:0 0 7px;font-size:12px;font-weight:750;color:#475569;text-transform:none;letter-spacing:0}#aceilArchicadModal input{width:100%;height:48px;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:13px;padding:8px 12px;background:#fff;color:#0f172a;font:750 17px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}#aceilArchicadModal input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}#aceilArchicadModal .aceil-dxf-summary{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin:14px 0;padding:12px;border:1px solid #dbeafe;border-radius:15px;background:#f8fbff}#aceilArchicadModal .aceil-dxf-col{min-width:0}#aceilArchicadModal .aceil-dxf-col small{display:block;margin-bottom:4px;color:#64748b;font-size:10px;font-weight:750}#aceilArchicadModal .aceil-dxf-col b{display:block;font-size:12px;line-height:1.3}#aceilArchicadModal .aceil-dxf-col span{display:block;margin-top:4px;color:#64748b;font-size:10px;line-height:1.35}#aceilArchicadModal .aceil-dxf-col.result b{color:#1d4ed8}#aceilArchicadModal .aceil-dxf-arrow{color:#2563eb;font-weight:900}#aceilArchicadModal .aceil-dxf-note{margin:8px 0;padding:10px 11px;border-radius:12px;background:#f1f5f9;color:#475569;font-size:11px;line-height:1.4;font-weight:600}#aceilArchicadModal .aceil-dxf-error{grid-column:1/-1;color:#b91c1c;font-size:12px;font-weight:750;text-align:center}#aceilArchicadModal .aceil-dxf-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px;margin-top:14px}#aceilArchicadModal .aceil-dxf-actions button{min-height:46px;padding:10px;border:0;border-radius:13px;font-size:13px;font-weight:800;box-shadow:none}#aceilArchicadModal .aceil-dxf-cancel{background:#f1f5f9;color:#475569}#aceilArchicadModal .aceil-dxf-save{background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff}@media(min-width:600px){#aceilArchicadModal{align-items:center}}@media(max-width:390px){#aceilArchicadModal{padding:8px}#aceilArchicadModal .aceil-dxf-card{padding:15px;border-radius:18px}#aceilArchicadModal .aceil-dxf-summary{grid-template-columns:1fr;padding:10px}#aceilArchicadModal .aceil-dxf-arrow{display:none}}';
    document.head.appendChild(style);
    var modal=document.createElement("div");modal.id="aceilArchicadModal";modal.setAttribute("aria-hidden","true");
    modal.innerHTML='<div class="aceil-dxf-card" role="dialog" aria-modal="true" aria-labelledby="aceilArchicadTitle"><div class="aceil-dxf-head"><h3 id="aceilArchicadTitle"></h3><button type="button" class="aceil-dxf-close" aria-label="Close">×</button></div><label for="aceilArchicadShrink" id="aceilArchicadShrinkLabel"></label><input id="aceilArchicadShrink" type="number" inputmode="decimal" min="0" max="30" step="0.1"><div id="aceilArchicadSummary" class="aceil-dxf-summary"></div><div class="aceil-dxf-note" id="aceilArchicadLayers"></div><div class="aceil-dxf-note" id="aceilArchicadUnits"></div><div class="aceil-dxf-note" id="aceilArchicadPhone"></div><div class="aceil-dxf-actions"><button type="button" class="aceil-dxf-cancel"></button><button type="button" class="aceil-dxf-save"></button></div></div>';
    document.body.appendChild(modal);
    modal.querySelector(".aceil-dxf-close").addEventListener("click",closeModal);
    modal.querySelector(".aceil-dxf-cancel").addEventListener("click",closeModal);
    modal.querySelector(".aceil-dxf-save").addEventListener("click",exportDxf);
    modal.addEventListener("click",function(event){if(event.target===modal)closeModal()});
    document.getElementById("aceilArchicadShrink").addEventListener("input",renderSummary);
  }
  function translateUi(){
    var set=function(selector,value){var el=document.querySelector(selector);if(el)el.textContent=value};
    set("#aceilArchicadTitle",text("title"));set("#aceilArchicadShrinkLabel",text("shrink"));set("#aceilArchicadLayers",text("layers"));set("#aceilArchicadUnits",text("units"));set("#aceilArchicadPhone",text("phone"));set("#aceilArchicadModal .aceil-dxf-cancel",text("cancel"));set("#aceilArchicadModal .aceil-dxf-save",text("save"));
    var title=document.querySelector("#A·CEILArchicadExportAction b"),hint=document.querySelector("#A·CEILArchicadExportAction small");
    if(title)title.textContent=text("menu");if(hint)hint.textContent=text("hint");
  }
  function openModal(){
    try{
      currentShape=readCurrentShape();ensureUi();translateUi();
      var input=document.getElementById("aceilArchicadShrink");input.value=String(loadPercent());renderSummary();
      var modal=document.getElementById("aceilArchicadModal");modal.classList.add("open");modal.setAttribute("aria-hidden","false");
      try{if(typeof window["closeA·CEILRoomMenu"]==="function")window["closeA·CEILRoomMenu"]()}catch(_){/* Menu is optional. */}
      setTimeout(function(){input.focus();input.select()},80);
    }catch(error){toast(error&&error.message||text("failed"),4200)}
  }
  function closeModal(){
    var modal=document.getElementById("aceilArchicadModal");
    if(modal){modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}
    currentShape=null;
  }
  function installMenuAction(){
    var menu=document.getElementById("A·CEILRoomMenuPopup");
    if(!menu||document.getElementById("A·CEILArchicadExportAction"))return;
    var button=document.createElement("button");button.type="button";button.id="A·CEILArchicadExportAction";button.className="rm-room-menu-action";
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 13h8M12 10v6M9 18h6"/></svg><span><b></b><small></small></span>';
    button.addEventListener("click",openModal);
    var separator=menu.querySelector(".rm-room-menu-separator");menu.insertBefore(button,separator||menu.lastChild);
    translateUi();
  }
  function boot(){ensureUi();installMenuAction();translateUi()}
  document.addEventListener("A·CEIL-language-changed",translateUi);
  document.addEventListener("keydown",function(event){if(event.key==="Escape")closeModal()});
  window.A_CEIL_OpenArchicadExport=openModal;
  window.A_CEIL_ArchicadDXF={readCurrentShape:readCurrentShape,shrinkShape:shrinkShape,shapeStats:shapeStats,buildDxf:buildDxf,open:openModal,close:closeModal};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
