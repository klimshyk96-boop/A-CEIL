!function(){const OLD_LOAD=window._loadRS,OLD_SAVE=window.saveReportSettings;window._loadRS=function(){const rs=OLD_LOAD?OLD_LOAD():{};return rs.reportAudience=rs.reportAudience||"client",rs.companyName=rs.companyName||"A·CEIL PRO",rs},window.saveReportSettings=function(){"function"==typeof OLD_SAVE&&OLD_SAVE();try{const rs=window._loadRS(),aud=document.getElementById("rsReportAudience");aud&&(rs.reportAudience=aud.value||"client"),localStorage.setItem("reportSettings",JSON.stringify(rs)),window.reportSettings=rs}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}};const OLD_OPEN=window.openReportSettings;function audience(rs){return rs&&rs.reportAudience||"client"}function isClient(rs){return"client"===audience(rs)}function isInstaller(rs){return"installer"===audience(rs)}function isFull(rs){return"full"===audience(rs)}function rr(c,x,y,w,h,r,fill,stroke){c.save(),c.fillStyle=fill||"#fff",stroke&&(c.strokeStyle=stroke),c.beginPath(),c.roundRect?c.roundRect(x,y,w,h,r):(c.moveTo(x+r,y),c.lineTo(x+w-r,y),c.quadraticCurveTo(x+w,y,x+w,y+r),c.lineTo(x+w,y+h-r),c.quadraticCurveTo(x+w,y+h,x+w-r,y+h),c.lineTo(x+r,y+h),c.quadraticCurveTo(x,y+h,x,y+h-r),c.lineTo(x,y+r),c.quadraticCurveTo(x,y,x+r,y)),c.fill(),stroke&&(c.lineWidth=1,c.stroke()),c.restore()}function header(c,W,PAD,rs,projectName,roomName){
  c.fillStyle="#fff";c.fillRect(0,0,W,104);const lx=PAD;
  rr(c,lx,18,52,52,12,"#0f172a","#111827");c.fillStyle="#fff";c.font="900 31px Arial";c.textAlign="center";c.textBaseline="middle";c.fillText("A",lx+26,45);c.fillStyle="#2563eb";c.fillRect(lx+31,52,14,4);
  c.textAlign="left";c.textBaseline="alphabetic";c.fillStyle="#0f172a";c.font="900 27px Arial";c.fillText("A·CEIL",lx+66,40);c.fillStyle="#2563eb";c.font="900 24px Arial";c.fillText("PRO",lx+66,67);c.fillStyle="#64748b";c.font="bold 9px Arial";c.fillText("PROFESSIONAL CEILING DESIGNER",lx+66,84);
  if(projectName){c.fillStyle="#0f172a";c.font="900 22px Arial";c.textAlign="center";c.fillText(String(projectName),W/2,39);if(roomName){c.fillStyle="#64748b";c.font="17px Arial";c.fillText(String(roomName),W/2,67);}}
  c.textAlign="right";c.fillStyle="#0f172a";c.font="900 20px Arial";c.fillText("Монтажний лист",W-PAD,39);c.fillStyle="#64748b";c.font="14px Arial";c.fillText("Дата: "+(new Date).toLocaleDateString("uk-UA"),W-PAD,66);c.textAlign="left";c.strokeStyle="#e2e8f0";c.lineWidth=1;c.beginPath();c.moveTo(PAD,103);c.lineTo(W-PAD,103);c.stroke();
}function quickSummary(c,PAD,y,W,st){
  const bits=[];
  if(st&&st.area!=null)bits.push("Площа: "+st.area+" м²");
  if(st&&st.per!=null)bits.push("Периметр: "+st.per+" м");
  try{if(Array.isArray(pts)&&pts.length)bits.push("Кути: "+pts.length)}catch(_e){}
  if(!bits.length)return;
  c.fillStyle="#64748b";c.font="bold 13px Arial";c.textAlign="left";
  c.fillText(bits.join("  •  "),PAD,y);
  c.strokeStyle="#eef2f7";c.lineWidth=1;c.beginPath();c.moveTo(PAD,y+13);c.lineTo(W-PAD,y+13);c.stroke();
}
function section(c,x,y,t){c.fillStyle="#0043b8",c.font="bold 18px Arial",c.fillText(t,x,y)}function title(c,PAD,y,name,meta,rs){return c.fillStyle="#0f172a",c.font="bold 34px Arial",c.fillText(name||"Звіт заміру",PAD,y),c.fillStyle="#475569",c.font="16px Arial",meta&&c.fillText(meta,PAD,y+34),y+60}

function infoCards(c,x,y,w,rows,titleText){
  rows=Array.isArray(rows)?rows:[];
  const h=154;
  rr(c,x,y,w,h,18,"#fff","#dbe7f5");
  section(c,x+18,y+32,titleText||"2. Основна інформація");
  const gap=14, cardY=y+52, cardH=84, count=Math.max(1,rows.length), cardW=(w-36-gap*(count-1))/count;
  const icons=["▣","╱","◇","∠"];
  rows.forEach((r,i)=>{
    const cx=x+18+i*(cardW+gap);
    rr(c,cx,cardY,cardW,cardH,13,"#fff","#dbe7f5");
    c.save();c.strokeStyle="#2563eb";c.fillStyle="#2563eb";c.lineWidth=2;c.font="bold 28px Arial";c.textAlign="center";c.fillText(icons[i]||"•",cx+30,cardY+51);c.restore();
    c.fillStyle="#64748b";c.font="13px Arial";c.textAlign="left";c.fillText(String(r[0]||""),cx+55,cardY+28);
    c.fillStyle="#0f172a";c.font="bold 20px Arial";c.fillText(String(r[1]||"—"),cx+55,cardY+58);
  });
  return h;
}
function info(c,x,y,w,rows,titleText){const h=56+42*rows.length;rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,titleText||"Основна інформація");let yy=y+62;return rows.forEach(r=>{c.strokeStyle="#e5e7eb",c.beginPath(),c.moveTo(x+16,yy+17),c.lineTo(x+w-16,yy+17),c.stroke(),c.fillStyle="#475569",c.font="15px Arial",c.fillText(r[0],x+20,yy),c.textAlign="right",c.fillStyle="#0f172a",c.font="bold 16px Arial",c.fillText(r[1],x+w-20,yy),c.textAlign="left",yy+=42}),h}function lines(c,x,y,w,t,lines,empty){lines=Array.isArray(lines)?lines:[];const isWallBlock=/елемент/i.test(String(t||""));function wrap(txt,maxW,maxLines){if(!(txt=String(txt||"").replace(/^•\s*/,"").trim()))return[""];const words=txt.split(/\s+/).filter(Boolean),out=[];let line="";if(words.forEach(word=>{const test=line?line+" "+word:word;if(c.measureText(test).width<=maxW)line=test;else if(line&&out.push(line),c.measureText(word).width>maxW){let cut=word;for(;cut.length>4&&c.measureText(cut+"…").width>maxW;)cut=cut.slice(0,-1);out.push(cut+"…"),line=""}else line=word}),line&&out.push(line),maxLines&&out.length>maxLines){const clipped=out.slice(0,maxLines);let last=clipped[clipped.length-1]||"";for(;last.length>4&&c.measureText(last+"…").width>maxW;)last=last.slice(0,-1);return clipped[clipped.length-1]=last+"…",clipped}return out.length?out:[""]}function splitWallLine(line){const s=String(line||"").replace(/^•\s*/,"").trim(),m=s.match(/^(.*?):\s*([A-ZА-ЯІЇЄҐ]{1,3})\s*—\s*([^—]+)\s*—\s*(.*)$/i);return m?{name:m[1].trim(),meta:m[2].trim()+" • "+m[3].trim()+" • "+m[4].trim()}:{name:s,meta:""}}c.font="15px Arial";let h=58;lines.length?lines.forEach(line=>{if(isWallBlock){const p=splitWallLine(line),nameLines=wrap(p.name,w-98,2);h+=34+19*nameLines.length+(p.meta?20:0)}else{const arr=wrap(line,w-54,2);h+=Math.max(38,20*arr.length+16)}}):h+=38,rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,t);let yy=y+64;return lines.length?lines.forEach(line=>{if(isWallBlock){const p=splitWallLine(line),nameLines=wrap(p.name,w-98,2),rowH=34+19*nameLines.length+(p.meta?20:0);c.strokeStyle="#d7dee9",c.setLineDash([2,2]),c.beginPath(),c.moveTo(x+16,yy+rowH-7),c.lineTo(x+w-16,yy+rowH-7),c.stroke(),c.setLineDash([]),c.fillStyle="#003b91",c.font="bold 22px Arial",c.textAlign="center",c.fillText(function(line){const s=String(line||"").toLowerCase();return s.includes("карниз")?"▥":s.includes("парящ")?"━━":s.includes("профіль")||s.includes("профил")||s.includes("брус")?"▰":s.includes("трек")?"▭":"•"}(line),x+38,yy+22),c.textAlign="left",c.fillStyle="#0f172a",c.font="bold 15px Arial",nameLines.forEach((ln,i)=>c.fillText(ln,x+64,yy+14+19*i)),p.meta&&(c.fillStyle="#334155",c.font="bold 14px Arial",c.fillText(p.meta,x+64,yy+16+19*nameLines.length)),yy+=rowH}else{const arr=wrap(line,w-54,2),rowH=Math.max(38,20*arr.length+16);c.strokeStyle="#e5e7eb",c.beginPath(),c.moveTo(x+16,yy+rowH-8),c.lineTo(x+w-16,yy+rowH-8),c.stroke(),c.fillStyle="#0f172a",c.font="bold 15px Arial",arr.forEach((ln,i)=>c.fillText("• "+ln,x+22,yy+14+20*i)),yy+=rowH}}):(c.fillStyle="#94a3b8",c.font="15px Arial",c.fillText(empty||"Немає даних",x+22,yy)),h}function wallDimensionsList(c,x,y,w,items,empty,titleText){
  items=Array.isArray(items)?items:[];
  const h=items.length?92+items.length*34:104;
  rr(c,x,y,w,h,18,"#fff","#e2e8f0");
  section(c,x+18,y+32,titleText||"Розміри стін");
  if(!items.length){c.fillStyle="#94a3b8";c.font="15px Arial";c.fillText(empty||"Розміри не задані",x+22,y+76);return h;}
  const rows=items.map(v=>{const t=String(v||"").replace(/^•\s*/,"").trim(),m=t.match(/^([^—-]+)\s*[—-]\s*(.+)$/);return m?[m[1].trim(),m[2].trim()]:[t,""];});
  const top=y+52,left=x+16,inner=w-32,col1=Math.round(inner*.34);
  c.fillStyle="#f1f5f9";c.fillRect(left,top,inner,32);
  c.fillStyle="#64748b";c.font="bold 13px Arial";c.fillText("СТОРОНА",left+12,top+21);c.fillText("ДОВЖИНА",left+col1+12,top+21);
  rows.forEach((r,i)=>{const yy=top+32+i*34;c.strokeStyle="#e2e8f0";c.beginPath();c.moveTo(left,yy+34);c.lineTo(left+inner,yy+34);c.stroke();c.fillStyle="#0f172a";c.font="bold 15px Arial";c.fillText(r[0],left+12,yy+22);c.font="15px Arial";c.fillText(r[1],left+col1+12,yy+22);});
  return h;
}

function _reportLinearMountingLines(){
  const src=(typeof linearElements!=="undefined"&&Array.isArray(linearElements))?linearElements:(Array.isArray(window.linearElements)?window.linearElements:[]);
  const room=(typeof pts!=="undefined"&&Array.isArray(pts))?pts:[];
  if(room.length<2||!src.length)return[];
  const names="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function n(v,d){v=parseFloat(v);return isFinite(v)?v:d;}
  function offsets(el){
    const seg=el.segments||[],rot=n(el.rotation,0)*Math.PI/180,cs=Math.cos(rot),sn=Math.sin(rot),flipX=!!el.flipX,flipY=!!el.flipY;
    function tr(p){let x=p.x,y=p.y;if(flipX)x=-x;if(flipY)y=-y;return{x:x*cs-y*sn,y:x*sn+y*cs};}
    let raw=[],a=Math.max(1,n(seg[0],100)),b=Math.max(1,n(seg[1],100)),cc=Math.max(1,n(seg[2],b));
    if(el.elementType==='lightLine'&&el.lightShapeMode==='rhombus'){let q=Math.max(1,n(el.rhombusSide,a)),ang=Math.max(10,Math.min(170,n(el.rhombusAngle,60)))*Math.PI/180;raw=[{x:0,y:0},{x:q,y:0},{x:q+Math.cos(ang)*q,y:Math.sin(ang)*q},{x:Math.cos(ang)*q,y:Math.sin(ang)*q},{x:0,y:0}];}
    else if(el.elementType==='lightLine'&&el.lightShapeMode==='free'&&Array.isArray(el.segmentAngles)){let x=0,y=0;raw=[{x:0,y:0}];seg.forEach((ln,i)=>{let an=n(el.segmentAngles[i],0)*Math.PI/180;x+=Math.cos(an)*n(ln,100);y+=Math.sin(an)*n(ln,100);raw.push({x,y});});}
    else if(el.shape==='L')raw=[{x:0,y:0},{x:a,y:0},{x:a,y:b}];
    else if(el.shape==='U')raw=[{x:0,y:a},{x:0,y:0},{x:b,y:0},{x:b,y:a}];
    else if(el.shape==='rectangle')raw=[{x:0,y:0},{x:a,y:0},{x:a,y:b},{x:0,y:b},{x:0,y:0}];
    else raw=[{x:0,y:0},{x:a,y:0}];
    let minX=Math.min(...raw.map(p=>p.x)),maxX=Math.max(...raw.map(p=>p.x)),minY=Math.min(...raw.map(p=>p.y)),maxY=Math.max(...raw.map(p=>p.y)),ox=(minX+maxX)/2,oy=(minY+maxY)/2;
    return raw.map(p=>tr({x:p.x-ox,y:p.y-oy}));
  }
  function canvasPoints(el){
    const cen=el.centerCanvasPx;if(!cen||!isFinite(cen.x)||!isFinite(cen.y))return null;
    let px=1;try{if(typeof _pxPerCm==='function'&&_pxPerCm()>0)px=_pxPerCm();}catch(_e){}
    return offsets(el).map(p=>({x:cen.x+p.x*px,y:cen.y+p.y*px}));
  }
  function bind(p){let best=null;for(let i=0;i<room.length;i++){let a=room[i],b=room[(i+1)%room.length],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)continue;let t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),qx=a.x+t*dx,qy=a.y+t*dy,dist=Math.hypot(p.x-qx,p.y-qy);if(!best||dist<best.dist){let cm=(Array.isArray(lengths)&&isFinite(+lengths[i]))?+lengths[i]:Math.sqrt(l2);best={dist,side:i,cm:Math.round(cm*t)};}}return best;}
  const out=[];let no=0;
  src.forEach(el=>{if(!el||el.visible===false||el.elementType!=='lightLine')return;let ps=canvasPoints(el);if(!ps||ps.length<2)return;no++;let total=n(el.totalLengthCm,0);if(!(total>0))total=(el.segments||[]).reduce((a,v)=>a+n(v,0),0);let a=bind(ps[0]),b=bind(ps[ps.length-1]);let fmt=q=>q?`${q.cm} см від т. ${names[q.side]||q.side+1} по ${names[q.side]||''}${names[(q.side+1)%room.length]||''}`:'—';out.push(`Світлова лінія ${no} — ${Math.round(total)} см; початок: ${fmt(a)}; кінець: ${fmt(b)}`);});
  return out;
}
function legend(c,x,y,w,legendLightMarks,cornices,titleText,legendWallMarks,legendWallTypes,legendLinearElements){const _legendLightMarks=Array.isArray(legendLightMarks)?legendLightMarks:Array.isArray(lightMarks)?lightMarks:[],_legendWallMarks=Array.isArray(legendWallMarks)?legendWallMarks:(Array.isArray(window.wallMarks)?window.wallMarks:[]),_legendWallTypes=Array.isArray(legendWallTypes)?legendWallTypes:(Array.isArray(window.wallTypes)?window.wallTypes:[]),_legendLinearElements=Array.isArray(legendLinearElements)?legendLinearElements:(Array.isArray(window.linearElements)?window.linearElements:[]);function _rmIsExhaustLegend(m){const type=String(m&&m.type||"").toLowerCase(),label=String(m&&(m.label||m.name||m.title)||"").toLowerCase();return!(!m||!m._exhaust)||"vent"===type||"exhaust"===type||"hood"===type||/витяж|вытяж|вентиляц|\bvent\b|hood|exhaust/.test(type+" "+label)}function _rmIsMagneticExhaust(m){if(!m)return false;const t=String(m.type||"").toLowerCase();if("ce_magnetic_exhaust"===t)return true;let svgId="";try{svgId=String(m.svgId||m.iconSvgId||("function"==typeof _lightType?(_lightType(m.type)||{}).svgId:"")||"").toLowerCase()}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}const label=String(m.label||m.name||("function"==typeof _lightType?(_lightType(m.type)||{}).label:"")||"").toLowerCase();return"vent_grille"===svgId||/магнітн|магнитн/.test(label)}const hasLinearLight=(()=>{try{if(_legendLinearElements.length)return _legendLinearElements.some(e=>e&&!1!==e.visible);const s="function"==typeof window.linearElementsSummary?window.linearElementsSummary():null;return!!(s&&Number(s.count)>0)}catch{return!1}})(),hasExhaustMagnetic=_legendLightMarks.some(m=>_rmIsExhaustLegend(m)&&_rmIsMagneticExhaust(m)),hasExhaustRegular=_legendLightMarks.some(m=>_rmIsExhaustLegend(m)&&!_rmIsMagneticExhaust(m)),hasDoubleSpot=_legendLightMarks.some(m=>{if(!m||_rmIsExhaustLegend(m))return!1;const t=String(m.type||"").toLowerCase(),label=String(m.label||m.name||m.title||"").toLowerCase();return t==="double_spot"||/подвійний точков/.test(label)}),hasSpot=_legendLightMarks.some(m=>{if(!m||_rmIsExhaustLegend(m))return!1;const t=String(m.type||"spot").toLowerCase(),label=String(m.label||m.name||m.title||"").toLowerCase();return t==="spot"||(!t.includes("double_spot")&&!/подвійний точков/.test(label)&&/спот|точков/.test(t+" "+label))}),hasChandelier=_legendLightMarks.some(m=>{if(!m||_rmIsExhaustLegend(m))return!1;const t=String(m.type||"").toLowerCase(),label=String(m.label||m.name||"").toLowerCase();let ico="";try{"function"==typeof window._lightIcon&&(ico=String(window._lightIcon(m.type||"spot")||""))}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return/[✶✳✢✣✤✥✺✹✷❉☼⚛✲*]/.test(ico)||"chandelier"===t||label.includes("люстр")}),customRows=(()=>{const out=[],seen={};_legendLightMarks.forEach(m=>{if(!m||_rmIsExhaustLegend(m))return;const t=String(m.type||"").toLowerCase(),label=String(m.label||m.name||m.title||("function"==typeof _lightType?(_lightType(m.type)||{}).label:"")||m.type||"").trim(),low=label.toLowerCase();if(t==="spot"||t==="double_spot"||t==="chandelier"||/спот|точков|люстр/.test(t+" "+low))return;let typeObj=null;try{typeObj="function"==typeof _lightType?_lightType(m.type):null}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}const key=(t||low);if(!key||seen[key])return;seen[key]=1;out.push({kind:"custom",label:label||String(typeObj&&typeObj.label||"Елемент стелі"),icon:String(m.icon||typeObj&&typeObj.icon||"●")})});return out})(),rows=[{kind:"wall",color:"#0f172a",label:"Звичайна стіна"},...(_legendWallTypes.some(function(v){return v==="arc"})?[{kind:"curve",color:"#2563eb",label:"Криволінійна стіна"}]:[]),...function(){const out=[],seen={};try{_legendWallMarks.forEach((m,i)=>{if(!m)return;const color=function(m,i){const v=String(m&&m.color||"").trim();if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v))return v;const fb=["#16a34a","#7c3aed","#f59e0b","#2563eb","#ef4444","#0f766e"];return fb[Math.abs(i||0)%fb.length]}(m,i),label=(t=m.type||m.name||m.title||"Елемент на стіні",(t=String(t||"").replace(/\s+/g," ").trim())?t.replace(/\s*[-•·]\s*\d+(?:[.,]\d+)?\s*см\s*$/i,"").trim()||t:"Елемент на стіні"),key=color+"|"+label.toLowerCase();var t;seen[key]||(seen[key]=1,out.push({kind:"wallElement",color:color,label:label}))})}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return out}(),...hasSpot?[{kind:"spot",label:(window.aceilCatalogLabel?window.aceilCatalogLabel("spot","Точковий світильник"):"Точковий світильник")}]:[],...hasDoubleSpot?[{kind:"doubleSpot",label:(window.aceilCatalogLabel?window.aceilCatalogLabel("double_spot","Подвійний точковий світильник"):"Подвійний точковий світильник")}]:[],...hasChandelier?[{kind:"chandelier",label:(window.aceilCatalogLabel?window.aceilCatalogLabel("chandelier","Люстра"):"Люстра")}]:[],...hasExhaustRegular?[{kind:"exhaust",label:(window.aceilCatalogLabel?window.aceilCatalogLabel("vent","Витяжка"):"Витяжка"),svgId:"vent_round"}]:[],...hasExhaustMagnetic?[{kind:"exhaust",label:"Витяжка магнітна",svgId:"vent_grille"}]:[],...hasLinearLight?[{kind:"lightLine",label:(window.aceilCatalogLabel?window.aceilCatalogLabel("linear","Світлова лінія"):"Світлова лінія")}]:[],...customRows,...reportCorniceLegendRows(cornices),{kind:"corner",label:"Кут приміщення"}],h=58+36*rows.length+16;rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,titleText||"Умовні позначення");let yy=y+70;return rows.forEach(r=>{const sx=x+28,sy=yy-13;c.save(),c.lineWidth=2,c.strokeStyle="#0f172a",c.fillStyle="#0f172a","wall"===r.kind?(c.strokeStyle=r.color,c.lineWidth=4.8,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke()):"curve"===r.kind?(c.strokeStyle=r.color,c.lineWidth=4.2,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+14),c.quadraticCurveTo(sx+21,sy-2,sx+42,sy+14),c.stroke()):"wallElement"===r.kind?(c.strokeStyle=r.color,c.lineWidth=5.8,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke()):"spot"===r.kind?(c.fillStyle="#ffffff",c.beginPath(),c.arc(sx+20,sy+10,9,0,2*Math.PI),c.fill(),c.lineWidth=2.6,c.strokeStyle="#facc15",c.stroke()):"doubleSpot"===r.kind?(c.fillStyle="#ffffff",c.lineWidth=2.6,c.strokeStyle="#facc15",c.beginPath(),c.arc(sx+14,sy+10,7,0,2*Math.PI),c.fill(),c.stroke(),c.beginPath(),c.arc(sx+28,sy+10,7,0,2*Math.PI),c.fill(),c.stroke()):"chandelier"===r.kind?(c.fillStyle="#facc15",c.beginPath(),c.arc(sx+20,sy+10,10,0,2*Math.PI),c.fill(),c.lineWidth=1.5,c.strokeStyle="#ca8a04",c.stroke()):"exhaust"===r.kind?window.rmDrawExhaustLegendIcon?window.rmDrawExhaustLegendIcon(c,sx+20,sy+10,r.svgId||null):(c.strokeStyle="#0891b2",c.lineWidth=2.4,c.beginPath(),c.arc(sx+20,sy+10,11,0,2*Math.PI),c.stroke()):"lightLine"===r.kind?(c.strokeStyle="#f59e0b",c.lineWidth=5,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke(),c.fillStyle="#f59e0b",c.beginPath(),c.arc(sx,sy+10,3.5,0,2*Math.PI),c.arc(sx+42,sy+10,3.5,0,2*Math.PI),c.fill()):"custom"===r.kind?(c.strokeStyle="#475569",c.fillStyle="#334155",c.lineWidth=1.8,c.beginPath(),c.arc(sx+20,sy+10,11,0,2*Math.PI),c.stroke(),c.font="bold 13px Arial",c.textAlign="center",c.textBaseline="middle",c.fillText(String(r.icon||"●"),sx+20,sy+11)):"cornice"===r.kind?(c.lineCap="round",c.strokeStyle="#f97316",c.lineWidth=7,c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke(),c.strokeStyle=r.color==="white"?"#ffffff":"#111827",c.lineWidth=3.5,c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke()):"corner"===r.kind&&(c.strokeStyle="#22c55e",c.lineWidth=2.3,c.beginPath(),c.arc(sx+20,sy+18,15,Math.PI,1.5*Math.PI),c.stroke()),c.restore(),c.fillStyle="#334155",c.font="14.5px Arial",c.textAlign="left",c.textBaseline="alphabetic";const label=String(r.label||""),maxW=w-100;if(c.measureText(label).width<=maxW)c.fillText(label,x+88,yy+2);else{let cut=label;for(;cut.length>4&&c.measureText(cut+"…").width>maxW;)cut=cut.slice(0,-1);c.fillText(cut+"…",x+88,yy+2)}yy+=36}),h}function table(c,x,y,w,groups,clientMode,titleText){
  const rs="function"==typeof _loadRS?_loadRS():window.reportSettings||{},
        showQty=!1!==rs.qty,
        showPrice=!0===rs.unitPrice,
        showRow=!1!==rs.rowTotal,
        showTotal=!0===rs.grandTotal;

  function fmtNum(v){
    return Math.round(Number(v)||0).toLocaleString("uk-UA");
  }
  function fmtQty(v,unit){
    const n=Math.round((Number(v)||0)*100)/100;
    return n.toLocaleString("uk-UA")+(unit?" "+unit:"");
  }
  function wrap(txt,maxW,maxLines){
    txt=String(txt||"").trim();
    if(!txt)return[""];
    const words=txt.split(/\s+/).filter(Boolean),out=[];
    let line="";
    words.forEach(word=>{
      const test=line?line+" "+word:word;
      if(c.measureText(test).width<=maxW)line=test;
      else{
        if(line)out.push(line);
        if(c.measureText(word).width>maxW){
          let cut=word;
          while(cut.length>4&&c.measureText(cut+"…").width>maxW)cut=cut.slice(0,-1);
          out.push(cut+"…");line="";
        }else line=word;
      }
    });
    if(line)out.push(line);
    if(maxLines&&out.length>maxLines){
      const clipped=out.slice(0,maxLines);
      let last=clipped[clipped.length-1]||"";
      while(last.length>4&&c.measureText(last+"…").width>maxW)last=last.slice(0,-1);
      clipped[clipped.length-1]=last+"…";
      return clipped;
    }
    return out;
  }

  const rows=[];
  (groups||[]).forEach(g=>{
    const items=(g.items||[]).filter(it=>(Number(it.qty)||0)>0);
    if(items.length){
      rows.push({group:true,name:(g.name||"ГРУПА").toUpperCase()});
      items.forEach(it=>{
        const qty=Number(it.qty)||0,price=Number(it.price)||0;
        rows.push({name:it.name||"",unit:it.unit||"",qty:qty,price:price,sum:qty*price});
      });
    }
  });

  const total=(groups||[]).reduce((s,g)=>s+(g.items||[]).reduce((a,it)=>a+(Number(it.qty)||0)*(Number(it.price)||0),0),0),
        innerX=x+18,
        innerW=w-36,
        narrow=w<500;

  /* PAYMENT: the settings modal is still open while the report is generated.
     Read the actual inputs FIRST. This bypasses every reportSettings wrapper/load-order issue. */
  function _payNumber(v){
    v=Number(String(v==null?"":v).trim().replace(",","."));
    return Number.isFinite(v)?v:0;
  }
  function _paymentNow(){
    let d=null,a=null;
    const de=document.getElementById("rsDiscountPercent");
    const ae=document.getElementById("rsAdvanceAmount");
    if(de && String(de.value).trim()!=="") d=de.value;
    if(ae && String(ae.value).trim()!=="") a=ae.value;
    let saved={};
    try{saved=JSON.parse(localStorage.getItem("reportSettings")||"{}")||{}}catch(_e){}
    if(d==null)d=saved.discountPercent;
    if(a==null)a=saved.advanceAmount;
    return {
      discount:Math.max(0,Math.min(100,_payNumber(d))),
      advance:Math.max(0,_payNumber(a))
    };
  }
  const _pay=_paymentNow(),
        _pct=_pay.discount,
        _disc=total*_pct/100,
        _due=Math.max(0,total-_disc),
        _adv=Math.max(0,Math.min(_pay.advance,_due)),
        _rest=Math.max(0,_due-_adv),
        _payExtra=_pct>0||_adv>0;

  c.font=narrow?"13px Arial":"14px Arial";
  let h=82;
  rows.forEach(r=>{
    if(r.group)h+=30;
    else{
      const nameLines=wrap(r.name,innerW-8,narrow?3:2);
      h+=Math.max(54,28+18*nameLines.length);
    }
  });
  if(!rows.length)h+=44;
  if(showTotal&&total>0)h+=146;

  rr(c,x,y,w,h,18,"#fff","#e2e8f0");
  section(c,x+18,y+32,titleText||"Кошторис");
  let yy=y+54;

  if(!rows.length){
    c.fillStyle="#94a3b8";
    c.font="14px Arial";
    c.fillText("Немає позицій для відображення",innerX,yy+28);
    return h;
  }

  rows.forEach(r=>{
    if(r.group){
      const gGrad=c.createLinearGradient(x+12,yy,x+w-12,yy+28);
      gGrad.addColorStop(0,"#edf4ff");
      gGrad.addColorStop(1,"#f7fbff");
      c.fillStyle=gGrad;
      c.fillRect(x+12,yy,w-24,28);
      c.fillStyle="#003b91";
      c.font="bold 13px Arial";
      c.fillText(wrap(r.name,w-56,1)[0],innerX,yy+19);
      yy+=30;
      return;
    }

    c.font=narrow?"13px Arial":"14px Arial";
    const nameLines=wrap(r.name,innerW-8,narrow?3:2);
    const rowH=Math.max(54,28+18*nameLines.length);

    c.fillStyle="#e5e7eb";
    c.fillRect(x+12,yy-1,w-24,1);

    c.fillStyle="#0f172a";
    nameLines.forEach((ln,i)=>c.fillText(ln,innerX,yy+17+18*i));

    const metricsY=yy+rowH-13;
    const metrics=[];
    if(showQty)metrics.push("К-ть: "+fmtQty(r.qty,r.unit||"шт"));
    if(showPrice)metrics.push("Ціна: "+(r.price?fmtNum(r.price):"—"));
    if(showRow)metrics.push("Сума: "+(r.sum?fmtNum(r.sum):"—"));

    c.font=narrow?"bold 11px Arial":"bold 12px Arial";
    let mx=innerX;
    metrics.forEach((item,i)=>{
      c.fillStyle=i===metrics.length-1&&showRow?"#15803d":"#475569";
      c.fillText(item,mx,metricsY);
      mx+=c.measureText(item).width+12;
      if(mx>x+w-20&&i<metrics.length-1){
        mx=innerX;
      }
    });

    yy+=rowH;
  });

  if(showTotal&&total>0){
    yy+=10;
    const boxH=126;
    rr(c,x+12,yy,w-24,boxH,12,"#fbfdff","#dbe7f5");
    const rowsPay=[
      ["Загальна сума",fmtNum(total)+" грн","#0f172a"],
      ["Знижка"+(_pct>0?" "+String(_pct).replace(".",",")+"%":""),_pct>0?"− "+fmtNum(_disc)+" грн":"0 грн","#dc2626"],
      ["Аванс",fmtNum(_adv)+" грн","#475569"],
      ["ЗАЛИШОК",fmtNum(_rest)+" грн","#15803d"]
    ];
    rowsPay.forEach((r,i)=>{
      const ry=yy+26+i*27;
      if(i===3){c.fillStyle="#f0fdf4";c.fillRect(x+13,ry-20,w-26,31);}
      c.fillStyle=r[2];c.font=i===3?"bold 17px Arial":"bold 14px Arial";c.textAlign="left";c.fillText(r[0],x+26,ry);
      c.textAlign="right";c.font=i===3?"bold 22px Arial":"bold 15px Arial";c.fillText(r[1],x+w-26,ry);c.textAlign="left";
    });
  }
  return h;
}async function plan(c,x,y,w,h,imgSrc,titleText){
  rr(c,x,y,w,h,18,"#fff","#e2e8f0");
  section(c,x+18,y+32,titleText||"1. План приміщення");
  await new Promise(res=>{
    if(!imgSrc)return void res();
    const img=new Image;
    img.onload=()=>{
      const aw=w-54,ah=h-72;
      let sx=0,sy=0,sw=img.width,sh=img.height;
      try{
        const t=document.createElement("canvas");t.width=img.width;t.height=img.height;
        const tc=t.getContext("2d",{willReadFrequently:true});tc.drawImage(img,0,0);
        const d=tc.getImageData(0,0,t.width,t.height).data;
        let minX=t.width,minY=t.height,maxX=-1,maxY=-1;
        const step=Math.max(1,Math.floor(Math.max(t.width,t.height)/900));
        for(let yy=0;yy<t.height;yy+=step)for(let xx=0;xx<t.width;xx+=step){
          const i=(yy*t.width+xx)*4,a=d[i+3],r=d[i],g=d[i+1],b=d[i+2];
          if(a>30 && (r<242||g<242||b<242)){
            if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy;
          }
        }
        if(maxX>minX&&maxY>minY){
          const pad=Math.max(18,Math.round(Math.max(maxX-minX,maxY-minY)*.06));
          sx=Math.max(0,minX-pad);sy=Math.max(0,minY-pad);
          sw=Math.min(t.width-sx,maxX-minX+pad*2);sh=Math.min(t.height-sy,maxY-minY+pad*2);
        }
      }catch(_e){}
      const sc=Math.min(aw/sw,ah/sh),dw=sw*sc,dh=sh*sc;
      c.drawImage(img,sx,sy,sw,sh,x+(w-dw)/2,y+48+(ah-dh)/2,dw,dh);
      res();
    };
    img.onerror=res;img.src=imgSrc;
  });
  return h;
}function totalBar(c,PAD,y,W,total,rs){
  const w=W-2*PAD;
  function num(v){v=Number(String(v==null?"":v).replace(",","."));return Number.isFinite(v)?v:0}
  function paymentSettings(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem("reportSettings")||"{}")||{}}catch(_e){}
    let live={};
    try{live=(typeof window._loadRS==="function"?window._loadRS():window.reportSettings)||{}}catch(_e){live=window.reportSettings||{}}
    let d=null,a=null;
    try{const el=document.getElementById("rsDiscountPercent");if(el&&String(el.value).trim()!=="")d=el.value}catch(_e){}
    try{const el=document.getElementById("rsAdvanceAmount");if(el&&String(el.value).trim()!=="")a=el.value}catch(_e){}
    if(d==null)d=saved.discountPercent!=null?saved.discountPercent:(live.discountPercent!=null?live.discountPercent:(rs&&rs.discountPercent));
    if(a==null)a=saved.advanceAmount!=null?saved.advanceAmount:(live.advanceAmount!=null?live.advanceAmount:(rs&&rs.advanceAmount));
    return{discount:Math.max(0,Math.min(100,num(d))),advance:Math.max(0,num(a))};
  }
  const pay=paymentSettings(),installer=isInstaller(rs),pct=installer?0:pay.discount,discountAmount=total*pct/100,afterDiscount=Math.max(0,total-discountAmount),advance=installer?0:Math.min(pay.advance,afterDiscount),remainder=Math.max(0,afterDiscount-advance),hasExtra=!installer&&(pct>0||advance>0),barH=hasExtra?174:118;
  const g=c.createLinearGradient(PAD,y,PAD+w,y+barH);g.addColorStop(0,"#00399d");g.addColorStop(1,"#0066ff");rr(c,PAD,y,w,barH,20,g);
  const money=function(v){try{return typeof _fmtMoneyModern==="function"?_fmtMoneyModern(v):Math.round(v||0).toLocaleString("uk-UA")+" грн"}catch{return String(v||0)+" грн"}};
  c.fillStyle="rgba(255,255,255,.80)";c.font="bold 17px Arial";c.fillText(installer?"ВАРТІСТЬ ОБʼЄКТА":"ЗАГАЛОМ ДО СПЛАТИ",PAD+34,y+40);
  c.textAlign="right";c.fillStyle="#fff";c.font="bold 44px Arial";c.fillText(money(afterDiscount),W-PAD-34,y+64);
  if(hasExtra){
    c.font="bold 18px Arial";c.fillStyle="rgba(255,255,255,.96)";
    let yy=y+102;
    if(pct>0){c.fillText("Знижка "+String(pct).replace(".",",")+"%: −"+money(discountAmount)+"  ·  було "+money(total),W-PAD-34,yy);yy+=26}
    if(advance>0){c.fillText("Аванс: "+money(advance)+"  ·  залишок: "+money(remainder),W-PAD-34,yy)}
  }
  c.textAlign="left";return y+barH+42
}function _finalizeReportCanvas(out,W,contentBottom,rs){
  const scale=Math.max(1,Number(out&&out.dataset&&out.dataset.hdScale)||1);
  const H=Math.max(1,Math.ceil(contentBottom+78));
  const cropped=document.createElement("canvas");
  cropped.width=Math.max(1,Math.round(W*scale));cropped.height=Math.max(1,Math.round(H*scale));
  cropped.dataset.logicalWidth=String(W);cropped.dataset.logicalHeight=String(H);cropped.dataset.hdScale=String(scale);
  const cc=cropped.getContext("2d");
  if(!cc)return out;
  cc.drawImage(out,0,0,cropped.width,Math.min(cropped.height,out.height),0,0,cropped.width,Math.min(cropped.height,out.height));
  try{cc.setTransform(scale,0,0,scale,0,0)}catch(_e){}
  footer(cc,W,H,rs);
  return cropped;
}
function footer(c,W,H,rs){c.fillStyle="#94a3b8",c.font="12px Arial",c.textAlign="center",c.fillText((rs.companyName||"A·CEIL PRO")+" • "+[rs.companyPhone,rs.companySite].filter(Boolean).join(" • "),W/2,H-26),c.textAlign="left"}function _overallDims(st,rs){try{if(!0!==(rs||{}).overall)return"";if(!window.A·CEILGeometry||"function"!=typeof window.A·CEILGeometry.calculate)return"";var data=null;if(st&&(st.realPts||st.points||st.pts))data=st;if(!data)try{if(typeof realPts!=="undefined"&&Array.isArray(realPts)&&realPts.length>1)data={points:realPts}}catch(_e){}if(!data)try{if(typeof pts!=="undefined"&&Array.isArray(pts)&&pts.length>1)data={points:pts}}catch(_e){}if(!data)return"";const b=window.A·CEILGeometry.calculate(data).boundsM;if(!b||!(b.width>0)||!(b.height>0))return"";const a=Math.max(b.width,b.height),s=Math.min(b.width,b.height);return a.toFixed(2)+" × "+s.toFixed(2)+" м"}catch(e){return""}}
function _allWallDimensionLines(st){
  try{
    st=st||{};
    var p=Array.isArray(st.pts)?st.pts:[];
    var rp=Array.isArray(st.realPts)?st.realPts:[];
    var ls=Array.isArray(st.lengths)?st.lengths:[];
    if(!p.length) return [];
    var out=[];
    for(var i=0;i<p.length;i++){
      var j=(i+1)%p.length;
      var value=Number(ls[i]);
      if(!(value>0)&&rp[i]&&rp[j]){
        value=Math.hypot(Number(rp[j].x||0)-Number(rp[i].x||0),Number(rp[j].y||0)-Number(rp[i].y||0));
      }
      if(!(value>0)&&p[i]&&p[j]){
        value=Math.hypot(Number(p[j].x||0)-Number(p[i].x||0),Number(p[j].y||0)-Number(p[i].y||0));
      }
      if(value>0){
        var a=typeof N==="function"?N(i):String.fromCharCode(65+i);
        var b=typeof N==="function"?N(j):String.fromCharCode(65+j);
        out.push(a+b+" — "+window._formatReportCm(value)+" см");
      }
    }
    return out;
  }catch(e){return [];}
}

function reportCornices(st){
  let source=[];
  if(arguments.length)source=st&&Array.isArray(st.ceilingCornices)?st.ceilingCornices:[];
  else if(Array.isArray(window.ceilingCornices))source=window.ceilingCornices;
  return source.filter(Boolean);
}
function reportCorniceLegendRows(cornices){
  const rows=[],seen={};
  reportCornices({ceilingCornices:Array.isArray(cornices)?cornices:[]}).forEach(item=>{
    const color=item.color==="black"?"black":"white";
    if(seen[color])return;
    seen[color]=true;
    rows.push({kind:"cornice",color:color,label:"Карниз "+(item.profileName||"UNO")+" — "+(color==="black"?"чорний":"білий")});
  });
  return rows;
}
function reportCorniceLines(cornices,wallCount){
  const out=[];
  reportCornices({ceilingCornices:Array.isArray(cornices)?cornices:[]}).forEach((item,index)=>{
    const isL=item.shape==="L",a=Math.max(0,Number(item.lengthA)||0),b=Math.max(0,Number(item.lengthB)||0);
    const total=Number(item.totalLengthM)>0?Number(item.totalLengthM):(a+(isL?b:0))/100;
    const profile=String(item.profileName||"UNO").trim()||"UNO";
    const dimensions=isL?(Math.round(a)+" × "+Math.round(b)+" см"):(Math.round(a)+" см");
    const base=Math.max(0,Number(item.baseIndex)||0),next=wallCount>1?(base+1)%wallCount:base+1;
    const location=isL?("кут "+String.fromCharCode(65+Math.max(0,Number(item.cornerIndex)||0))):("стіна "+String.fromCharCode(65+base)+String.fromCharCode(65+next));
    const offset=!isL&&Number(item.offsetY)>0?(" · відступ "+Math.round(Number(item.offsetY))+" см"):"";
    out.push((index+1)+". "+profile+" · "+(isL?"Г-подібний":"прямий")+" · "+dimensions+" · "+(item.color==="black"?"чорний":"білий"));
    out.push(location+offset+" · "+total.toFixed(2).replace(".",",")+" м · кути "+Math.max(0,Math.round(Number(item.cornerCount)||0))+" · обриви "+Math.max(0,Math.round(Number(item.breakCount)||2)));
  });
  return out;
}
function reportSectionTitles(flags){
  let number=0;
  const next=label=>(++number)+". "+label;
  const titles={plan:next("План приміщення"),info:next("Основна інформація")};
  if(flags.dimensions)titles.dimensions=next("Розміри стін");
  titles.placement=next(flags.showTech?"Монтажні елементи":"Розташування елементів");
  titles.light=next(flags.showTech?"Світло та координати":"Світло");
  if(flags.ceilings)titles.ceilings=next("Елементи стелі");
  if(flags.exhausts)titles.exhausts=next("Витяжка");
  if(flags.cornices)titles.cornices=next("Карниз ванної");
  if(flags.diags)titles.diags=next("Діагоналі приміщення");
  if(flags.legend)titles.legend=next("Умовні позначення");
  if(flags.table)titles.table=next("Кошторис");
  return titles;
}

function rmReportCreateHQCanvas(W,H){
  const requested=3,maxPixels=24e6,maxDimension=12000;
  const byPixels=Math.sqrt(maxPixels/Math.max(1,W*H)),byWidth=maxDimension/Math.max(1,W),byHeight=maxDimension/Math.max(1,H);
  let scale=Math.min(requested,byPixels,byWidth,byHeight);
  scale=Math.max(1,Math.floor(scale*4)/4);
  const out=document.createElement("canvas");
  out.width=Math.max(1,Math.round(W*scale));out.height=Math.max(1,Math.round(H*scale));
  out.dataset.logicalWidth=String(W);out.dataset.logicalHeight=String(H);out.dataset.hdScale=String(scale);
  const c=out.getContext("2d");if(!c)throw new Error("Canvas 2D context unavailable");
  try{c.setTransform(scale,0,0,scale,0,0)}catch(_e){c.scale(scale,scale)}
  try{c.imageSmoothingEnabled=true;c.imageSmoothingQuality="high"}catch(_e){}
  return{out,c,scale};
}
async function alphaSingle(rs){
  const W=1080,st=_modernRoomStatsFromCurrent();
  const allDimLines=!1!==rs.dimensionsList?_allWallDimensionLines({pts:pts,lengths:lengths,realPts:realPts}):[];
  const groups=_modernGetNomenclatureGroupsFromState({elemItems:elemItems,elemGroups:elemGroups});
  const lightLines=!0===rs.showLightCoords&&Array.isArray(lightMarks)&&lightMarks.length?getLightCoordLines({pts:pts,lengths:lengths,realPts:realPts,circleMode:circleMode,circleDiamCm:circleDiamCm,lightMarks:lightMarks.filter(m=>window.rmIsFixtureMarkV326?window.rmIsFixtureMarkV326(m):true)}):[];
  const linearMountLines=_reportLinearMountingLines(); linearMountLines.forEach(v=>lightLines.push(v));
  const ceilingLines=!0===rs.showLightCoords&&Array.isArray(lightMarks)&&lightMarks.length&&window.getCeilingElementCoordLinesV326?window.getCeilingElementCoordLinesV326():[];
  const exhaustLines=!0===rs.showLightCoords&&"function"==typeof getExhaustCoordLines&&Array.isArray(lightMarks)&&lightMarks.length?getExhaustCoordLines({pts:pts,lengths:lengths,realPts:realPts,circleMode:circleMode,circleDiamCm:circleDiamCm,lightMarks:lightMarks}):[];
  const wallLines=!1!==rs.showWallCoords&&Array.isArray(wallMarks)&&wallMarks.length?getWallCoordLines({pts:pts,lengths:lengths,realPts:realPts,wallMarks:wallMarks}):[];
  const diagLines=!0===rs.diagonals?getCurrentReportDiagLines(rs.diagMode||"manual"):[],cornices=reportCornices(),corniceLines=reportCorniceLines(cornices,Array.isArray(pts)?pts.length:0);
  const showTech=!isClient(rs),showPrice=!isInstaller(rs)||isFull(rs),showTable=(showPrice||showTech)&&!1!==rs.nomenclature;

  /* v30 presentation-only redesign. Data/calculations stay untouched. */
  const titles={plan:"1. План приміщення",info:"2. Основна інформація",dimensions:"3. Розміри стін",legend:"4. Умовні позначення",light:"5. Світло",placement:"6. Розташування елементів",table:"7. Кошторис",ceilings:"Елементи стелі",exhausts:"Витяжка",cornices:"Карниз ванної",diags:"Діагоналі приміщення"};
  const PAD=28,GAP=18,COL=(W-PAD*2-GAP)/2,RIGHT_X=PAD+COL+GAP,PLAN_H=560;
  const infoRows=!1!==rs.area?[["Площа полотна",st.area+" м²"],["Периметр",st.per+" м"]]:[];
  const od=_overallDims(st,rs);od&&infoRows.push(["Габаритні розміри",od]);
  if(Array.isArray(pts)&&pts.length)infoRows.push(["Кількість кутів",String(pts.length)]);

  /* generous work canvas; _finalizeReportCanvas crops it to real content */
  const _hd=rmReportCreateHQCanvas(W,5200),out=_hd.out,c=_hd.c;
  c.fillStyle="#ffffff";c.fillRect(0,0,W,5200);
  header(c,W,PAD,rs,_currentProjName||"Звіт заміру",_currentProjComment||"");

  quickSummary(c,PAD,122,W,st);
  let y=148;
  y+=await plan(c,PAD,y,W-PAD*2,PLAN_H,!1!==rs.drawing?_modernCaptureCurrentDrawing(rs):null,titles.plan)+18;
  y+=infoCards(c,PAD,y,W-PAD*2,infoRows,titles.info)+18;

  let leftY=y,rightY=y;
  if(!1!==rs.dimensionsList)leftY+=wallDimensionsList(c,PAD,leftY,COL,allDimLines,"Розміри не задані",titles.dimensions);
  if(!0===rs.showLegend)rightY+=legend(c,RIGHT_X,rightY,COL,Array.isArray(lightMarks)?lightMarks:[],cornices,titles.legend,Array.isArray(wallMarks)?wallMarks:[],Array.isArray(wallTypes)?wallTypes:[],Array.isArray(linearElements)?linearElements:[]);
  y=Math.max(leftY,rightY)+18;

  y+=lines(c,PAD,y,W-PAD*2,titles.light,lightLines,"Світло не задано")+18;
  y+=lines(c,PAD,y,W-PAD*2,titles.placement,wallLines,"Елементи не задані")+18;

  /* Technical optional blocks remain presentation-only and do not alter source data. */
  if(ceilingLines.length)y+=lines(c,PAD,y,W-PAD*2,titles.ceilings,ceilingLines,"")+18;
  if(exhaustLines.length)y+=lines(c,PAD,y,W-PAD*2,titles.exhausts,exhaustLines,"")+18;
  if(corniceLines.length)y+=lines(c,PAD,y,W-PAD*2,titles.cornices,corniceLines,"")+18;
  if(showTech&&diagLines.length)y+=lines(c,PAD,y,W-PAD*2,titles.diags,diagLines,"")+18;

  if(showTable)y+=table(c,PAD,y,W-PAD*2,groups,isClient(rs),titles.table)+18;
  if(!showPrice){
    rr(c,PAD,y,W-PAD*2,70,18,"#fff7ed","#fed7aa");
    c.fillStyle="#9a3412";c.font="bold 18px Arial";c.fillText("Монтажний лист: ціни приховано",58,y+43);y+=88;
  }
  const finalOut=_finalizeReportCanvas(out,W,y+8,rs);
  _modernOpenPreview(finalOut,`A·CEIL_pro_${audience(rs)}_${(_currentProjName||"steli").replace(/\s+/g,"_")}.png`);
}
async function alphaObject(obj,rs){
  const W=1080,rooms=obj.rooms||[];let data=[],totalAll=0,H=180;const showTech=!isClient(rs),showPrice=!isInstaller(rs)||isFull(rs);
  for(const r of rooms){
    let st=null;try{st=r.state?"string"==typeof r.state?JSON.parse(r.state):r.state:null}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}
    const groups=_modernGetNomenclatureGroupsFromState(st||{}),total=_modernGroupsTotal(groups);totalAll+=total;
    const dimensions=!1!==rs.dimensionsList?_allWallDimensionLines(st||{}):[];
    const lights=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length?getLightCoordLines(Object.assign({},st,{lightMarks:st.lightMarks.filter(m=>window.rmIsFixtureMarkV326?window.rmIsFixtureMarkV326(m):true)})):[];
    const ceilings=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length&&window.getCeilingElementCoordLinesV326?window.getCeilingElementCoordLinesV326(st):[];
    const exhausts=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length&&"function"==typeof getExhaustCoordLines?getExhaustCoordLines(st):[];
    const walls=st&&st.wallMarks&&st.wallMarks.length?getWallCoordLines(st):[],diags=!0===rs.diagonals&&st?_getReportDiagLines(st,rs.diagMode||"manual"):[],cornices=reportCornices(st),corniceLines=reportCorniceLines(cornices,st&&Array.isArray(st.pts)?st.pts.length:st&&Array.isArray(st.points)?st.points.length:0);
    data.push({r:r,st:st,groups:groups,total:total,dimensions:dimensions,lights:lights,ceilings:ceilings,exhausts:exhausts,walls:walls,diags:diags,cornices:cornices,corniceLines:corniceLines});
    H+=790+Math.max(160+(dimensions.length?56+42*dimensions.length:0)+(lights.length?56+42*lights.length:98)+(ceilings.length?56+42*ceilings.length:0)+(exhausts.length?56+42*exhausts.length:0)+(corniceLines.length?74+38*corniceLines.length:0)+(showTech&&diags.length?56+42*diags.length:0),240+(walls.length?56+42*walls.length:98)+(64+62*Math.max(1,_modernCountRows(groups))+140))+44;
  }
  H+=180;H=Math.max(H,1850);const _hd=rmReportCreateHQCanvas(W,H),out=_hd.out,c=_hd.c;c.fillStyle="#f8fafc";c.fillRect(0,0,W,H);header(c,W,28,rs,obj.name||"Звіт обʼєкта",obj.addr||"");let y=126;
  for(const rd of data){
    const showTable=(showPrice||showTech)&&!1!==rs.nomenclature,titles=reportSectionTitles({dimensions:!1!==rs.dimensionsList,showTech:showTech,ceilings:rd.ceilings.length,exhausts:rd.exhausts.length,cornices:rd.cornices.length,diags:showTech&&rd.diags.length,legend:!0===rs.showLegend,table:showTable});
    c.fillStyle="#0f172a";c.font="bold 26px Arial";c.fillText(rd.r.name||"Кімната",28,y+32);y+=54;const planY=y,planH=700,rx=686;
    await plan(c,28,planY,1024,planH,!1!==rs.drawing?_renderRoomForReport(rd.r,rs):null,titles.plan);
    let ry=planY+planH+18;const rows=!1!==rs.area?[["Площа полотна",(rd.r.area||"—")+" м²"],["Периметр",(rd.r.per||"—")+" м"]]:[];const _od=_overallDims(rd.st,rs);_od&&rows.push(["Габаритні розміри",_od]);
    ry+=info(c,rx,ry,366,rows,titles.info)+18;ry+=lines(c,rx,ry,366,titles.placement,rd.walls,"Елементи не задані")+18;
    if(!0===rs.showLegend)ry+=legend(c,rx,ry,366,rd.st&&rd.st.lightMarks||[],rd.cornices,titles.legend,rd.st&&rd.st.wallMarks||[],rd.st&&rd.st.wallTypes||[],rd.st&&rd.st.linearElements||[])+18;
    let ly=planY+planH+18;if(!1!==rs.dimensionsList)ly+=wallDimensionsList(c,28,ly,640,rd.dimensions,"Розміри не задані",titles.dimensions)+18;
    ly+=lines(c,28,ly,640,titles.light,rd.lights,"Світло не задано")+18;
    if(rd.ceilings.length)ly+=lines(c,28,ly,640,titles.ceilings,rd.ceilings,"")+18;
    if(rd.exhausts.length)ly+=lines(c,28,ly,640,titles.exhausts,rd.exhausts,"")+18;
    if(rd.corniceLines.length)ly+=lines(c,28,ly,640,titles.cornices,rd.corniceLines,"")+18;
    if(showTech&&rd.diags.length)ly+=lines(c,28,ly,640,titles.diags,rd.diags,"")+18;
    if(showTable)ry+=table(c,rx,ry,366,rd.groups,isClient(rs),titles.table)+18;y=Math.max(ly,ry)+24;
  }
  let contentBottom=y;if(showPrice)contentBottom=totalBar(c,28,y,W,totalAll,rs);const finalOut=_finalizeReportCanvas(out,W,contentBottom,rs);_modernOpenPreview(finalOut,`A·CEIL_pro_${audience(rs)}_${(obj.name||"obekt").replace(/\s+/g,"_")}.png`);
}
function ensureAddRoomButton(){return A·CEILUtils.ensureAddRoom()}window.openReportSettings=function(){"function"==typeof OLD_OPEN&&OLD_OPEN(),setTimeout(()=>{try{const modal=document.getElementById("reportSettingsModal");if(!modal)return;const h=modal.querySelector("h3");h&&(h.innerHTML="📄 Report PRO 3.0");let card=document.getElementById("reportAudienceCard");if(!card){const wrap=document.getElementById("rsToggles")||modal.querySelector("div");card=document.createElement("div"),card.id="reportAudienceCard",card.className="report-audience-card",card.innerHTML='\n<label>ТИП ЗВІТУ</label><select id="rsReportAudience" onchange="saveReportSettings()"><option value="client">Для клієнта — красиво, без зайвої технічки</option><option value="installer">Для монтажника — максимум координат і технічних даних</option><option value="full">Повний — клієнт + монтаж + кошторис</option></select>\n',wrap&&wrap.parentNode&&wrap.parentNode.insertBefore(card,wrap)}const rs=window._loadRS(),aud=document.getElementById("rsReportAudience");aud&&(aud.value=rs.reportAudience||"client")}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}},40)},generateModernSingleReport=alphaSingle,generateModernObjectReport=alphaObject,window.generateModernSingleReport=alphaSingle,window.generateModernObjectReport=alphaObject,document.addEventListener("click",e=>{e.target&&"cv"===e.target.id&&setTimeout(ensureAddRoomButton,250)},!0),setTimeout(ensureAddRoomButton,500)}()
