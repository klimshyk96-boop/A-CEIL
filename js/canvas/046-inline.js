!function(){function gid(id){return document.getElementById(id)}function getPresetsFix(){try{const saved=JSON.parse(localStorage.getItem("wallElementPresets_v1")||"null");if(Array.isArray(saved)&&saved.length)return saved}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return["Ніша карниза біла","Ніша карниза чорна","Прихований карниз","Карниз прихований білий","Карниз прихований чорний","Парящий білий","Парящий чорний","Трек прихований","Трек накладний","Світлова лінія","Закладна","Вентиляція","Ревізійний люк","Інше"]}function sideLenCm(i){try{if("function"==typeof _sideLenCm)return _sideLenCm(i);const p1=pts[i],p2=pts[(i+1)%pts.length];return Number(lengths[i])||Math.hypot((p2?.x||0)-(p1?.x||0),(p2?.y||0)-(p1?.y||0))||1}catch{return 1}}window.getWallPresets=function(){return getPresetsFix()},window.setWallPresets=function(list){try{localStorage.setItem("wallElementPresets_v1",JSON.stringify((list||[]).filter(Boolean)))}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}},window.renderWallPresetSelect=function(current){const sel=gid("wallPresetSelect");if(!sel)return;const presets=getPresetsFix();sel.innerHTML='<option value="">— обрати —</option>'+presets.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(""),sel.value=current&&presets.includes(current)?current:""},window.applyWallPreset=function(){const sel=gid("wallPresetSelect"),inp=gid("wallEditType");sel&&inp&&sel.value&&(inp.value=sel.value)},window.addWallPresetFromInput=function(){const inp=gid("wallEditType"),val=(inp?.value||"").trim();if(!val)return void("function"==typeof showToast&&showToast("Впишіть назву заготовки"));const list=getPresetsFix();list.includes(val)||list.push(val),window.setWallPresets(list),window.renderWallPresetSelect(val),"function"==typeof showToast&&showToast("Заготовку додано")},window.setWallColor=function(color){const el=gid("wallEditColor");el&&(el.value=color)};try{openWallEditModal=window.openWallEditModal}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}window.createWallMarkOnSide=function(sideIndex){try{Array.isArray(window.wallMarks)||(window.wallMarks=[]);const sideLen=sideLenCm(sideIndex),len=Math.min(250,Math.max(0,Math.round(sideLen))),offset=Math.max(0,Math.round((sideLen-len)/2)),mark={id:"wall_"+Date.now(),sideIndex:Number(sideIndex)||0,type:"Ніша карниза",lenCm:len,offsetCm:offset,anchor:"center",color:"#f97316"};return window.wallMarks.push(mark),"function"==typeof requestDraw?requestDraw():"function"==typeof draw&&draw(),"function"==typeof saveState&&saveState(),setTimeout(()=>window.openWallEditModal(mark.id),30),!0}catch{return!1}};try{createWallMarkOnSide=window.createWallMarkOnSide}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}window.saveWallEdit=function(){const m=(Array.isArray(window.wallMarks)?window.wallMarks:[]).find(w=>w.id===window._wallEditId);if(!m)return;const sideLen=sideLenCm(Number(m.sideIndex)||0);m.type=(gid("wallEditType")?.value||"Ніша карниза").trim(),m.color=gid("wallEditColor")?gid("wallEditColor").value:m.color||"#f97316",m.lenCm=Math.max(0,parseFloat(gid("wallEditLen")?.value)||0),m.anchor=gid("wallEditAnchor")?gid("wallEditAnchor").value||"start":m.anchor||"start";const rawOffset=Math.max(0,parseFloat(gid("wallEditOffset")?.value)||0);"center"===m.anchor?m.offsetCm=Math.max(0,(sideLen-m.lenCm)/2):"end"===m.anchor?m.offsetCm=Math.max(0,sideLen-m.lenCm-rawOffset):"full"===m.anchor?(m.lenCm=Math.round(sideLen),m.offsetCm=0):m.offsetCm=rawOffset,m.offsetCm+m.lenCm>sideLen&&(m.offsetCm=Math.max(0,sideLen-m.lenCm));const modal=gid("wallEditModal");modal&&modal.classList.remove("open"),"function"==typeof requestDraw?requestDraw():"function"==typeof draw&&draw(),"function"==typeof saveState&&saveState()};try{saveWallEdit=window.saveWallEdit}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}window.deleteWallMarkFromEditor=function(){const idx=(Array.isArray(window.wallMarks)?window.wallMarks:[]).findIndex(w=>w.id===window._wallEditId);idx>=0&&window.wallMarks.splice(idx,1);const modal=gid("wallEditModal");modal&&modal.classList.remove("open"),"function"==typeof requestDraw?requestDraw():"function"==typeof draw&&draw(),"function"==typeof saveState&&saveState()};try{deleteWallMarkFromEditor=window.deleteWallMarkFromEditor}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}window.wallPlaceCenter=function(){const m=(Array.isArray(window.wallMarks)?window.wallMarks:[]).find(w=>w.id===window._wallEditId);if(!m)return;const sideLen=sideLenCm(Number(m.sideIndex)||0),len=Math.max(0,parseFloat(gid("wallEditLen")?.value)||m.lenCm||0);m.lenCm=len,m.offsetCm=Math.max(0,Math.round((sideLen-len)/2)),m.anchor="center",gid("wallEditAnchor")&&(gid("wallEditAnchor").value="center"),gid("wallEditOffset")&&(gid("wallEditOffset").value="")};try{wallPlaceCenter=window.wallPlaceCenter}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}window.handleWallTap=function(x,y){
  try{
    if(typeof closed!=="undefined"&&!closed)return false;
    if(typeof circleMode!=="undefined"&&circleMode)return false;
    if(typeof diagonalMode!=="undefined"&&diagonalMode)return false;
    if(typeof lightMode!=="undefined"&&lightMode)return false;

    /* Existing wall element: open its editor directly. */
    if(typeof findWallMarkHit==="function"){
      const markHit=findWallMarkHit(x,y);
      if(markHit>=0&&Array.isArray(window.wallMarks)&&window.wallMarks[markHit]){
        if(typeof window.openWallEditModal==="function"){
          window.openWallEditModal(window.wallMarks[markHit].id);
          return true;
        }
      }
    }

    /* Empty wall: always open the common action menu.
       Never create an element automatically. */
    if(typeof findWallSideHit!=="function")return false;
    const side=findWallSideHit(x,y);
    if(side<0)return false;

    if(typeof flashWallSide==="function")flashWallSide(side);

    if(typeof window.rmWallTapOpenV84==="function"){
      window.rmWallTapOpenV84(side);
      return true;
    }
    /* Obsolete "Тип стіни" (straight/curve) menu removed intentionally:
       A·CEILHandleWallTapV89/A·CEILHandleWallTouchV90 are the single
       real entry point for wall taps and always open #rmWallTapMenuV84.
       This dead handleWallTap chain must never fall back to the old menu. */
    return false;
  }catch(e){
    return false;
  }
};try{handleWallTap=window.handleWallTap}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}setTimeout(function(){const modal=gid("wallEditModal");if(modal){modal.style.display="";const btns=modal.querySelector(".modal-btns");btns&&(btns.style.display="flex")}},200)}()