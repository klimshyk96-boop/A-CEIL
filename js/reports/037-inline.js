!function(){const OLD_LOAD=window._loadRS,OLD_SAVE=window.saveReportSettings;window._loadRS=function(){const rs=OLD_LOAD?OLD_LOAD():{};return rs.reportAudience=rs.reportAudience||"client",rs.companyName=rs.companyName||"A·CEIL PRO",rs},window.saveReportSettings=function(){"function"==typeof OLD_SAVE&&OLD_SAVE();try{const rs=window._loadRS(),aud=document.getElementById("rsReportAudience");aud&&(rs.reportAudience=aud.value||"client"),localStorage.setItem("reportSettings",JSON.stringify(rs)),window.reportSettings=rs}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}};const OLD_OPEN=window.openReportSettings;function audience(rs){return rs&&rs.reportAudience||"client"}function isClient(rs){return"client"===audience(rs)}function isInstaller(rs){return"installer"===audience(rs)}function isFull(rs){return"full"===audience(rs)}function rr(c,x,y,w,h,r,fill,stroke){c.save(),c.fillStyle=fill||"#fff",stroke&&(c.strokeStyle=stroke),c.beginPath(),c.roundRect?c.roundRect(x,y,w,h,r):(c.moveTo(x+r,y),c.lineTo(x+w-r,y),c.quadraticCurveTo(x+w,y,x+w,y+r),c.lineTo(x+w,y+h-r),c.quadraticCurveTo(x+w,y+h,x+w-r,y+h),c.lineTo(x+r,y+h),c.quadraticCurveTo(x,y+h,x,y+h-r),c.lineTo(x,y+r),c.quadraticCurveTo(x,y,x+r,y)),c.fill(),stroke&&(c.lineWidth=1,c.stroke()),c.restore()}function header(c,W,PAD,rs){c.fillStyle="#fff",c.fillRect(0,0,W,112);const lx=PAD;rr(c,lx,20,56,56,12,"#0f172a","#111827"),c.fillStyle="#ffffff",c.font="900 34px Arial",c.textAlign="center",c.textBaseline="middle",c.fillText("A",lx+28,49),c.fillStyle="#2563eb",c.fillRect(lx+34,56,15,5),c.textAlign="left",c.textBaseline="alphabetic",c.fillStyle="#0f172a",c.font="900 30px Arial",c.fillText("A·CEIL",lx+72,47),c.fillStyle="#2563eb",c.font="900 27px Arial",c.fillText("PRO",lx+72,78),c.fillStyle="#64748b",c.font="bold 11px Arial",c.fillText("PROFESSIONAL CEILING DESIGNER",lx+72,96),c.textAlign="right",c.fillStyle="#0f172a",c.font="900 24px Arial",c.fillText("Монтажний лист",W-PAD,48),c.fillStyle="#334155",c.font="15px Arial",c.fillText("Дата: "+(new Date).toLocaleDateString("uk-UA"),W-PAD,76),c.textAlign="left",c.strokeStyle="#e2e8f0",c.lineWidth=1.2,c.beginPath(),c.moveTo(PAD,112),c.lineTo(W-PAD,112),c.stroke()}function section(c,x,y,t){c.fillStyle="#0043b8",c.font="bold 18px Arial",c.fillText(t,x,y)}function title(c,PAD,y,name,meta,rs){return c.fillStyle="#0f172a",c.font="bold 34px Arial",c.fillText(name||"Звіт заміру",PAD,y),c.fillStyle="#475569",c.font="16px Arial",meta&&c.fillText(meta,PAD,y+34),y+60}function info(c,x,y,w,rows){const h=56+42*rows.length;rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,"2. Основна інформація");let yy=y+62;return rows.forEach(r=>{c.strokeStyle="#e5e7eb",c.beginPath(),c.moveTo(x+16,yy+17),c.lineTo(x+w-16,yy+17),c.stroke(),c.fillStyle="#475569",c.font="15px Arial",c.fillText(r[0],x+20,yy),c.textAlign="right",c.fillStyle="#0f172a",c.font="bold 16px Arial",c.fillText(r[1],x+w-20,yy),c.textAlign="left",yy+=42}),h}function lines(c,x,y,w,t,lines,empty){lines=Array.isArray(lines)?lines:[];const isWallBlock=/елемент/i.test(String(t||""));function wrap(txt,maxW,maxLines){if(!(txt=String(txt||"").replace(/^•\s*/,"").trim()))return[""];const words=txt.split(/\s+/).filter(Boolean),out=[];let line="";if(words.forEach(word=>{const test=line?line+" "+word:word;if(c.measureText(test).width<=maxW)line=test;else if(line&&out.push(line),c.measureText(word).width>maxW){let cut=word;for(;cut.length>4&&c.measureText(cut+"…").width>maxW;)cut=cut.slice(0,-1);out.push(cut+"…"),line=""}else line=word}),line&&out.push(line),maxLines&&out.length>maxLines){const clipped=out.slice(0,maxLines);let last=clipped[clipped.length-1]||"";for(;last.length>4&&c.measureText(last+"…").width>maxW;)last=last.slice(0,-1);return clipped[clipped.length-1]=last+"…",clipped}return out.length?out:[""]}function splitWallLine(line){const s=String(line||"").replace(/^•\s*/,"").trim(),m=s.match(/^(.*?):\s*([A-ZА-ЯІЇЄҐ]{1,3})\s*—\s*([^—]+)\s*—\s*(.*)$/i);return m?{name:m[1].trim(),meta:m[2].trim()+" • "+m[3].trim()+" • "+m[4].trim()}:{name:s,meta:""}}c.font="15px Arial";let h=58;lines.length?lines.forEach(line=>{if(isWallBlock){const p=splitWallLine(line),nameLines=wrap(p.name,w-98,2);h+=34+19*nameLines.length+(p.meta?20:0)}else{const arr=wrap(line,w-54,2);h+=Math.max(38,20*arr.length+16)}}):h+=38,rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,t);let yy=y+64;return lines.length?lines.forEach(line=>{if(isWallBlock){const p=splitWallLine(line),nameLines=wrap(p.name,w-98,2),rowH=34+19*nameLines.length+(p.meta?20:0);c.strokeStyle="#d7dee9",c.setLineDash([2,2]),c.beginPath(),c.moveTo(x+16,yy+rowH-7),c.lineTo(x+w-16,yy+rowH-7),c.stroke(),c.setLineDash([]),c.fillStyle="#003b91",c.font="bold 22px Arial",c.textAlign="center",c.fillText(function(line){const s=String(line||"").toLowerCase();return s.includes("карниз")?"▥":s.includes("парящ")?"━━":s.includes("профіль")||s.includes("профил")||s.includes("брус")?"▰":s.includes("трек")?"▭":"•"}(line),x+38,yy+22),c.textAlign="left",c.fillStyle="#0f172a",c.font="bold 15px Arial",nameLines.forEach((ln,i)=>c.fillText(ln,x+64,yy+14+19*i)),p.meta&&(c.fillStyle="#334155",c.font="bold 14px Arial",c.fillText(p.meta,x+64,yy+16+19*nameLines.length)),yy+=rowH}else{const arr=wrap(line,w-54,2),rowH=Math.max(38,20*arr.length+16);c.strokeStyle="#e5e7eb",c.beginPath(),c.moveTo(x+16,yy+rowH-8),c.lineTo(x+w-16,yy+rowH-8),c.stroke(),c.fillStyle="#0f172a",c.font="bold 15px Arial",arr.forEach((ln,i)=>c.fillText("• "+ln,x+22,yy+14+20*i)),yy+=rowH}}):(c.fillStyle="#94a3b8",c.font="15px Arial",c.fillText(empty||"Немає даних",x+22,yy)),h}function wallDimensionsList(c,x,y,w,items,empty){
  items=Array.isArray(items)?items:[];
  const cols=items.length>8?2:1;
  const rows=Math.max(1,Math.ceil(items.length/cols));
  const h=58+rows*32+12;
  rr(c,x,y,w,h,18,"#fff","#e2e8f0");
  section(c,x+18,y+32,"2. Розміри стін");

  if(!items.length){
    c.fillStyle="#94a3b8";
    c.font="15px Arial";
    c.fillText(empty||"Розміри не задані",x+22,y+76);
    return h;
  }

  const innerX=x+22;
  const innerW=w-44;
  const gap=24;
  const colW=cols===2?(innerW-gap)/2:innerW;
  c.font="bold 15px Arial";

  for(let i=0;i<items.length;i++){
    const col=cols===2&&i>=rows?1:0;
    const row=cols===2?i%rows:i;
    const xx=innerX+col*(colW+gap);
    const yy=y+66+row*32;
    const txt=String(items[i]||"").replace(/^•\s*/,"").trim();

    c.strokeStyle="#e5e7eb";
    c.beginPath();
    c.moveTo(xx,yy+15);
    c.lineTo(xx+colW,yy+15);
    c.stroke();

    c.fillStyle="#0f172a";
    c.fillText(txt,xx,yy);
  }
  return h;
}
function legend(c,x,y,w,legendLightMarks){const _legendLightMarks=Array.isArray(legendLightMarks)?legendLightMarks:Array.isArray(lightMarks)?lightMarks:[];function _rmIsExhaustLegend(m){const type=String(m&&m.type||"").toLowerCase(),label=String(m&&(m.label||m.name||m.title)||"").toLowerCase();return!(!m||!m._exhaust)||"vent"===type||"exhaust"===type||"hood"===type||/витяж|вытяж|вентиляц|\bvent\b|hood|exhaust/.test(type+" "+label)}const hasLinearLight=(()=>{try{const s="function"==typeof window.linearElementsSummary?window.linearElementsSummary():null;return!!(s&&Number(s.count)>0)}catch{return!1}})(),hasExhaust=_legendLightMarks.some(m=>_rmIsExhaustLegend(m)),hasSpot=_legendLightMarks.some(m=>{if(!m||_rmIsExhaustLegend(m))return!1;const t=String(m.type||"spot").toLowerCase();return!("chandelier"===t||t.includes("люстр"))}),hasChandelier=_legendLightMarks.some(m=>{if(!m||_rmIsExhaustLegend(m))return!1;const t=String(m.type||"").toLowerCase(),label=String(m.label||m.name||"").toLowerCase();let ico="";try{"function"==typeof window._lightIcon&&(ico=String(window._lightIcon(m.type||"spot")||""))}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return/[✶✳✢✣✤✥✺✹✷❉☼⚛✲*]/.test(ico)||"chandelier"===t||label.includes("люстр")}),rows=[{kind:"wall",color:"#0f172a",label:"Звичайна стіна"},...(Array.isArray(wallTypes)&&wallTypes.some(function(v){return v==="arc"})?[{kind:"curve",color:"#2563eb",label:"Криволінійна стіна"}]:[]),...function(){const out=[],seen={};try{(wallMarks||[]).forEach((m,i)=>{if(!m)return;const color=function(m,i){const v=String(m&&m.color||"").trim();if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v))return v;const fb=["#16a34a","#7c3aed","#f59e0b","#2563eb","#ef4444","#0f766e"];return fb[Math.abs(i||0)%fb.length]}(m,i),label=(t=m.type||m.name||m.title||"Елемент на стіні",(t=String(t||"").replace(/\s+/g," ").trim())?t.replace(/\s*[-•·]\s*\d+(?:[.,]\d+)?\s*см\s*$/i,"").trim()||t:"Елемент на стіні"),key=color+"|"+label.toLowerCase();var t;seen[key]||(seen[key]=1,out.push({kind:"wallElement",color:color,label:label}))})}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return out}(),...hasSpot?[{kind:"spot",label:"Точковий світильник"}]:[],...hasChandelier?[{kind:"chandelier",label:"Люстра"}]:[],...hasExhaust?[{kind:"exhaust",label:"Витяжка"}]:[],...hasLinearLight?[{kind:"lightLine",label:"Світлова лінія"}]:[],{kind:"corner",label:"Кут приміщення"}],h=58+36*rows.length+16;rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,"4. Умовні позначення");let yy=y+70;return rows.forEach(r=>{const sx=x+28,sy=yy-13;c.save(),c.lineWidth=2,c.strokeStyle="#0f172a",c.fillStyle="#0f172a","wall"===r.kind?(c.strokeStyle=r.color,c.lineWidth=4.8,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke()):"curve"===r.kind?(c.strokeStyle=r.color,c.lineWidth=4.2,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+14),c.quadraticCurveTo(sx+21,sy-2,sx+42,sy+14),c.stroke()):"wallElement"===r.kind?(c.strokeStyle=r.color,c.lineWidth=5.8,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke()):"spot"===r.kind?(c.fillStyle="#ffffff",c.beginPath(),c.arc(sx+20,sy+10,9,0,2*Math.PI),c.fill(),c.lineWidth=2.6,c.strokeStyle="#facc15",c.stroke()):"chandelier"===r.kind?(c.fillStyle="#facc15",c.beginPath(),c.arc(sx+20,sy+10,10,0,2*Math.PI),c.fill(),c.lineWidth=1.5,c.strokeStyle="#ca8a04",c.stroke()):"exhaust"===r.kind?window.rmDrawExhaustLegendIcon?window.rmDrawExhaustLegendIcon(c,sx+20,sy+10,r.svgId||null):(c.strokeStyle="#0891b2",c.lineWidth=2.4,c.beginPath(),c.arc(sx+20,sy+10,11,0,2*Math.PI),c.stroke()):"lightLine"===r.kind?(c.strokeStyle="#f59e0b",c.lineWidth=5,c.lineCap="round",c.beginPath(),c.moveTo(sx,sy+10),c.lineTo(sx+42,sy+10),c.stroke(),c.fillStyle="#f59e0b",c.beginPath(),c.arc(sx,sy+10,3.5,0,2*Math.PI),c.arc(sx+42,sy+10,3.5,0,2*Math.PI),c.fill()):"corner"===r.kind&&(c.strokeStyle="#22c55e",c.lineWidth=2.3,c.beginPath(),c.arc(sx+20,sy+18,15,Math.PI,1.5*Math.PI),c.stroke()),c.restore(),c.fillStyle="#334155",c.font="14.5px Arial",c.textAlign="left",c.textBaseline="alphabetic";const label=String(r.label||""),maxW=w-100;if(c.measureText(label).width<=maxW)c.fillText(label,x+88,yy+2);else{let cut=label;for(;cut.length>4&&c.measureText(cut+"…").width>maxW;)cut=cut.slice(0,-1);c.fillText(cut+"…",x+88,yy+2)}yy+=36}),h}function table(c,x,y,w,groups,clientMode){
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
  if(showTotal&&total>0)h+=76;

  rr(c,x,y,w,h,18,"#fff","#e2e8f0");
  section(c,x+18,y+32,"6. Кошторис");
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
    yy+=8;
    rr(c,x+12,yy,w-24,54,10,"#f7fff9","#16a34a");
    c.fillStyle="#15803d";
    c.font="bold 16px Arial";
    c.fillText("ДО СПЛАТИ",x+24,yy+32);
    c.textAlign="right";
    c.font="bold 21px Arial";
    c.fillText(fmtNum(total)+" грн",x+w-24,yy+33);
    c.textAlign="left";
  }
  return h;
}async function plan(c,x,y,w,h,imgSrc){return rr(c,x,y,w,h,18,"#fff","#e2e8f0"),section(c,x+18,y+32,"1. План приміщення"),await new Promise(res=>{if(!imgSrc)return void res();const img=new Image;img.onload=()=>{const s=Math.min(w-52,h-82);c.drawImage(img,x+(w-s)/2,y+50,s,s),res()},img.onerror=res,img.src=imgSrc}),h}function totalBar(c,PAD,y,W,total,rs){const w=W-2*PAD,g=c.createLinearGradient(PAD,y,PAD+w,y+118);return g.addColorStop(0,"#00399d"),g.addColorStop(1,"#0066ff"),rr(c,PAD,y,w,118,20,g),c.fillStyle="rgba(255,255,255,.80)",c.font="bold 17px Arial",c.fillText(isInstaller(rs)?"ВАРТІСТЬ ОБʼЄКТА":"ЗАГАЛОМ ДО СПЛАТИ",PAD+34,y+40),c.textAlign="right",c.fillStyle="#fff",c.font="bold 44px Arial",c.fillText(function(v){try{return"function"==typeof _fmtMoneyModern?_fmtMoneyModern(v):Math.round(v||0).toLocaleString("uk-UA")+" грн"}catch{return String(v||0)+" грн"}}(total),W-PAD-34,y+64),c.textAlign="left",y+118+42}function footer(c,W,H,rs){c.fillStyle="#94a3b8",c.font="12px Arial",c.textAlign="center",c.fillText((rs.companyName||"A·CEIL PRO")+" • "+[rs.companyPhone,rs.companySite].filter(Boolean).join(" • "),W/2,H-26),c.textAlign="left"}function _overallDims(st,rs){try{var isOn;var cb=null;try{cb=document.getElementById("rs_overall")}catch(_e){cb=null}if(cb){isOn=cb.checked===true}else{var r=rs;if(!r||"undefined"===typeof r.overall){try{r="function"==typeof _loadRS?_loadRS():r}catch(_e){}}isOn=!0===(r||{}).overall}if(!isOn)return"";if(!st||!window.A·CEILGeometry||"function"!=typeof window.A·CEILGeometry.calculate)return"";const b=window.A·CEILGeometry.calculate(st).boundsM;if(!b||!(b.width>0)||!(b.height>0))return"";const a=Math.max(b.width,b.height),s=Math.min(b.width,b.height);return a.toFixed(2)+" × "+s.toFixed(2)+" м"}catch(e){return""}}
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
async function alphaSingle(rs){const W=1080,st=_modernRoomStatsFromCurrent(),allDimLines=!1!==rs.dimensionsList?_allWallDimensionLines({pts:pts,lengths:lengths,realPts:realPts}):[],groups=_modernGetNomenclatureGroupsFromState({elemItems:elemItems,elemGroups:elemGroups}),total=_modernGroupsTotal(groups),lightLines=!0===rs.showLightCoords&&Array.isArray(lightMarks)&&lightMarks.length?getLightCoordLines({pts:pts,lengths:lengths,realPts:realPts,circleMode:circleMode,circleDiamCm:circleDiamCm,lightMarks:lightMarks.filter(function(m){return window.rmIsFixtureMarkV326?window.rmIsFixtureMarkV326(m):true})}):[],ceilingLines=!0===rs.showLightCoords&&Array.isArray(lightMarks)&&lightMarks.length&&window.getCeilingElementCoordLinesV326?window.getCeilingElementCoordLinesV326():[],exhaustLines=!0===rs.showLightCoords&&"function"==typeof getExhaustCoordLines&&Array.isArray(lightMarks)&&lightMarks.length?getExhaustCoordLines({pts:pts,lengths:lengths,realPts:realPts,circleMode:circleMode,circleDiamCm:circleDiamCm,lightMarks:lightMarks}):[],wallLines=!1!==rs.showWallCoords&&Array.isArray(wallMarks)&&wallMarks.length?getWallCoordLines({pts:pts,lengths:lengths,realPts:realPts,wallMarks:wallMarks}):[],diagLines=!0===rs.diagonals?getCurrentReportDiagLines(rs.diagMode||"manual"):[],showTech=!isClient(rs),showPrice=!isInstaller(rs)||isFull(rs),tableH=64+62*Math.max(1,_modernCountRows(groups))+140,H=Math.max(1560,812+Math.max(190+(allDimLines.length?56+42*allDimLines.length:0)+(lightLines.length?56+52*lightLines.length:98)+(ceilingLines.length?56+42*ceilingLines.length:0)+(exhaustLines.length?56+42*exhaustLines.length:0)+(showTech&&diagLines.length?56+42*diagLines.length:0),240+(wallLines.length?56+78*wallLines.length:98)+tableH)+190),_hd=rm414CreateHDReportCanvas(W,H),out=_hd.out,c=_hd.c;c.fillStyle="#f8fafc",c.fillRect(0,0,W,H),header(c,W,28);let y=140;y=title(c,28,y,_currentProjName||"Звіт заміру",(!1!==rs.area?`Площа: ${st.area} м²  •  Периметр: ${st.per} м  •  `:"")+`Кути: ${st.inC}/${st.outC}`);const planY=y;await plan(c,28,planY,640,590,_modernCaptureCurrentDrawing(rs));let ry=planY;const infoRows=!1!==rs.area?[["Площа полотна",st.area+" м²"],["Периметр",st.per+" м"]]:[];const _od2=_overallDims(st,rs);_od2&&infoRows.push(["Габаритні розміри",_od2]);ry+=info(c,686,ry,366,infoRows)+18,ry+=lines(c,686,ry,366,showTech?"3. Монтажні елементи":"3. Розташування елементів",wallLines,"Елементи не задані")+18,!0===rs.showLegend&&(ry+=legend(c,686,ry,366)+18);let ly=planY+590+18;!1!==rs.dimensionsList&&(ly+=wallDimensionsList(c,28,ly,640,allDimLines,"Розміри не задані")+18);ly+=lines(c,28,ly,640,showTech?"4. Світло та координати":"4. Світло",lightLines,"Світло не задано")+18,ceilingLines.length&&(ly+=lines(c,28,ly,640,"5. Елементи стелі",ceilingLines,"")+18),exhaustLines.length&&(ly+=lines(c,28,ly,640,"6. Витяжка",exhaustLines,"")+18),showTech&&diagLines.length&&(ly+=lines(c,28,ly,640,"7. Діагоналі приміщення",diagLines,"")+18),(showPrice||showTech)&&!1!==rs.nomenclature&&(ry+=table(c,686,ry,366,groups,isClient(rs))+18);const endY=Math.max(ly,ry)+10;showPrice?totalBar(c,28,endY,W,total,rs):(rr(c,28,endY,1024,86,20,"#fff7ed","#fed7aa"),c.fillStyle="#9a3412",c.font="bold 20px Arial",c.fillText("Монтажний лист: ціни приховано",58,endY+50)),footer(c,W,H,rs),_modernOpenPreview(out,`A·CEIL_pro_${audience(rs)}_${(_currentProjName||"steli").replace(/\s+/g,"_")}.png`)}async function alphaObject(obj,rs){const W=1080,rooms=obj.rooms||[];let data=[],totalAll=0,H=180;const showTech=!isClient(rs),showPrice=!isInstaller(rs)||isFull(rs);for(const r of rooms){let st=null;try{st=r.state?"string"==typeof r.state?JSON.parse(r.state):r.state:null}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}const groups=_modernGetNomenclatureGroupsFromState(st||{}),total=_modernGroupsTotal(groups);totalAll+=total;const dimensions=!1!==rs.dimensionsList?_allWallDimensionLines(st||{}):[],lights=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length?getLightCoordLines(Object.assign({},st,{lightMarks:st.lightMarks.filter(function(m){return window.rmIsFixtureMarkV326?window.rmIsFixtureMarkV326(m):true})})):[],ceilings=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length&&window.getCeilingElementCoordLinesV326?window.getCeilingElementCoordLinesV326(st):[],exhausts=!0===rs.showLightCoords&&st&&st.lightMarks&&st.lightMarks.length&&"function"==typeof getExhaustCoordLines?getExhaustCoordLines(st):[],walls=st&&st.wallMarks&&st.wallMarks.length?getWallCoordLines(st):[],diags=!0===rs.diagonals&&st?_getReportDiagLines(st,rs.diagMode||"manual"):[];data.push({r:r,st:st,groups:groups,total:total,dimensions:dimensions,lights:lights,ceilings:ceilings,exhausts:exhausts,walls:walls,diags:diags}),H+=662+Math.max(160+(dimensions.length?56+42*dimensions.length:0)+(lights.length?56+42*lights.length:98)+(ceilings.length?56+42*ceilings.length:0)+(exhausts.length?56+42*exhausts.length:0)+(showTech&&diags.length?56+42*diags.length:0),240+(walls.length?56+42*walls.length:98)+(64+62*Math.max(1,_modernCountRows(groups))+140))+44}H+=180,H=Math.max(H,1850);const _hd=rm414CreateHDReportCanvas(W,H),out=_hd.out,c=_hd.c;c.fillStyle="#f8fafc",c.fillRect(0,0,W,H),header(c,W,28);let y=140;y=title(c,28,y,obj.name||"Звіт обʼєкта",[obj.addr,obj.phone,rooms.length+" кімнат"].filter(Boolean).join("  •  "));for(const rd of data){c.fillStyle="#0f172a",c.font="bold 26px Arial",c.fillText(rd.r.name||"Кімната",28,y+32),y+=54;const planY=y,planH=590,rx=686;await plan(c,28,planY,640,planH,_renderRoomForReport(rd.r,rs));let ry=planY;const rows=!1!==rs.area?[["Площа полотна",(rd.r.area||"—")+" м²"],["Периметр",(rd.r.per||"—")+" м"]]:[];const _od=_overallDims(rd.st,rs);_od&&rows.push(["Габаритні розміри",_od]);ry+=info(c,rx,ry,366,rows)+18,ry+=lines(c,rx,ry,366,showTech?"3. Монтажні елементи":"3. Розташування елементів",rd.walls,"Елементи не задані")+18,!0===rs.showLegend&&(ry+=legend(c,rx,ry,366,rd.st&&rd.st.lightMarks||[])+18);let ly=planY+planH+18;!1!==rs.dimensionsList&&(ly+=wallDimensionsList(c,28,ly,640,rd.dimensions,"Розміри не задані")+18);ly+=lines(c,28,ly,640,showTech?"4. Світло та координати":"4. Світло",rd.lights,"Світло не задано")+18,rd.ceilings&&rd.ceilings.length&&(ly+=lines(c,28,ly,640,"5. Елементи стелі",rd.ceilings,"")+18),rd.exhausts&&rd.exhausts.length&&(ly+=lines(c,28,ly,640,"6. Витяжка",rd.exhausts,"")+18),showTech&&rd.diags.length&&(ly+=lines(c,28,ly,640,"7. Діагоналі приміщення",rd.diags,"")+18),(showPrice||showTech)&&!1!==rs.nomenclature&&(ry+=table(c,rx,ry,366,rd.groups,isClient(rs))+18),y=Math.max(ly,ry)+24}showPrice&&totalBar(c,28,y,W,totalAll,rs),footer(c,W,H,rs),_modernOpenPreview(out,`A·CEIL_pro_${audience(rs)}_${(obj.name||"obekt").replace(/\s+/g,"_")}.png`)}function ensureAddRoomButton(){return A·CEILUtils.ensureAddRoom()}window.openReportSettings=function(){"function"==typeof OLD_OPEN&&OLD_OPEN(),setTimeout(()=>{try{const modal=document.getElementById("reportSettingsModal");if(!modal)return;const h=modal.querySelector("h3");h&&(h.innerHTML="📄 Report PRO 3.0");let card=document.getElementById("reportAudienceCard");if(!card){const wrap=document.getElementById("rsToggles")||modal.querySelector("div");card=document.createElement("div"),card.id="reportAudienceCard",card.className="report-audience-card",card.innerHTML='\n<label>ТИП ЗВІТУ</label><select id="rsReportAudience" onchange="saveReportSettings()"><option value="client">Для клієнта — красиво, без зайвої технічки</option><option value="installer">Для монтажника — максимум координат і технічних даних</option><option value="full">Повний — клієнт + монтаж + кошторис</option></select>\n',wrap&&wrap.parentNode&&wrap.parentNode.insertBefore(card,wrap)}const rs=window._loadRS(),aud=document.getElementById("rsReportAudience");aud&&(aud.value=rs.reportAudience||"client")}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}},40)},generateModernSingleReport=alphaSingle,generateModernObjectReport=alphaObject,window.generateModernSingleReport=alphaSingle,window.generateModernObjectReport=alphaObject,document.addEventListener("click",e=>{e.target&&"cv"===e.target.id&&setTimeout(ensureAddRoomButton,250)},!0),setTimeout(ensureAddRoomButton,500)}()