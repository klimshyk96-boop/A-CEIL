const $=id=>document.getElementById(id);function showToast(msg,ms){const toast=document.createElement("div");toast.textContent=msg,toast.style.cssText="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);max-width:88vw;background:#1e293b;color:#fff;padding:10px 18px;border-radius:14px;font-weight:700;font-size:13.5px;text-align:center;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25);",document.body.appendChild(toast),setTimeout(()=>toast.remove(),ms||2400)}function confirmTap(btn,confirmText,onConfirm){if(btn){if("1"!==btn.dataset.confirmArmed)return btn.dataset.confirmArmed="1",btn.dataset.origText=btn.dataset.origText||btn.innerHTML,btn.innerHTML=confirmText,clearTimeout(btn._confirmTimer),void(btn._confirmTimer=setTimeout(()=>{btn.dataset.confirmArmed="0",btn.innerHTML=btn.dataset.origText},4e3));clearTimeout(btn._confirmTimer),btn.dataset.confirmArmed="0",btn.innerHTML=btn.dataset.origText,onConfirm()}else onConfirm()}function autoOpenDimensionsAfterClose(){setTimeout(()=>{try{"function"==typeof openSideInputModal&&closed&&pts.length>=3&&openSideInputModal()}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}_showAddRoomBtn()},300)}function _showAddRoomBtn(){if(_hideAddRoomBtn(),!closed)return;if(document.querySelector('.modal-overlay.open, [id$="Modal"].open, #elementsModal.open'))return;const container=document.getElementById("cv")?.parentElement;if(!container)return;"static"===getComputedStyle(container).position&&(container.style.position="relative");const btn=document.createElement("button");btn.id="addRoomBtn",btn.innerHTML='<span style="font-size:13px">+</span> Кімната',btn.style.cssText="position:absolute;top:5px;left:6px;z-index:60;height:26px;min-height:26px;padding:2px 8px;border-radius:8px;border:none;background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;font-size:10.5px;font-weight:800;box-shadow:none;cursor:pointer;display:flex;align-items:center;gap:3px",btn.onclick=_addRoomFromCanvas,container.appendChild(btn)}function _hideAddRoomBtn(){const b=document.getElementById("addRoomBtn");b&&b.remove()}function _addRoomFromCanvas(){if(!_activeObjectId){const localId="obj_"+Date.now(),obj={id:localId,_localId:localId,_dbId:null,multiRoom:!0,name:"Об'єкт "+(new Date).toLocaleDateString("uk-UA"),addr:"",phone:"",comment:"",date:(new Date).toLocaleDateString("uk-UA"),thumb:"",rooms:[]},projects=getProjects();projects.unshift(obj),setProjects(projects),_activeObjectId=localId,_activeRoomIdx=null,_syncObjectToCloud(obj)}_commitRoomToObject(null,_openNewRoomDialog)}function _commitRoomToObject(nameOverride,callback){const projects=getProjects(),obj=projects.find(p=>String(p.id)===String(_activeObjectId));if(!obj)return void(callback&&callback());obj.rooms=obj.rooms||[];const thumb=document.getElementById("cv")?getCanvasThumb(.4):"",area=document.getElementById("area")?.textContent||"",per=document.getElementById("per")?.textContent||"",inC=document.getElementById("inCorners")?.textContent||"",outC=document.getElementById("outCorners")?.textContent||"",state=JSON.stringify({pts:pts,lengths:lengths,realPts:realPts,closed:closed,diagonals:diagonals,circleMode:circleMode,circleDiamCm:circleDiamCm,diagonalOverrides:diagonalOverrides,notes:notes,elemItems:elemItems,elemGroups:elemGroups,lightMarks:lightMarks,wallMarks:wallMarks,linearElements:linearElements,wallTypes:wallTypes,arcPoints:arcPoints});if(null!==_activeRoomIdx&&obj.rooms[_activeRoomIdx]){const room=obj.rooms[_activeRoomIdx];nameOverride&&(room.name=nameOverride),room.thumb=thumb,room.area=area,room.per=per,room.inC=inC,room.outC=outC,room.state=state}else{const n=obj.rooms.length+1,room={id:"room_"+Date.now(),name:nameOverride||"Кімната "+n,thumb:thumb,area:area,per:per,inC:inC,outC:outC,state:state,elemItems:[],elemGroups:[]};obj.rooms.push(room),_activeRoomIdx=obj.rooms.length-1}!obj.thumb&&thumb&&(obj.thumb=thumb),setProjects(projects),_updateObjectInCloud(obj),callback&&callback()}function _openNewRoomDialog(){const obj=getProjects().find(p=>String(p.id)===String(_activeObjectId)),n=(obj?.rooms?.length||0)+1;document.getElementById("newRoomName").value="Кімната "+n,document.getElementById("newRoomModal").style.display="block",setTimeout(()=>{const el=document.getElementById("newRoomName");el&&(el.focus(),el.select())},200)}function confirmNewRoom(){const name=document.getElementById("newRoomName").value.trim();if(!name)return void showToast("Введіть назву кімнати");document.getElementById("newRoomModal").style.display="none";let projects=getProjects(),idx=projects.findIndex(p=>String(p.id)===String(_activeObjectId)||String(p._dbId)===String(_activeObjectId)||String(p._localId)===String(_activeObjectId));if(idx<0&&(idx=projects.findIndex(p=>!0===p.multiRoom)),idx>=0&&(_activeObjectId=projects[idx].id),idx<0)return void showToast("Помилка: об'єкт не знайдено");const obj=projects[idx];obj.rooms=obj.rooms||[],null!==_activeRoomIdx&&obj.rooms[_activeRoomIdx]&&(obj.rooms[_activeRoomIdx].area=document.getElementById("area")?.textContent||"",obj.rooms[_activeRoomIdx].per=document.getElementById("per")?.textContent||"",obj.rooms[_activeRoomIdx].state=JSON.stringify({pts:pts,lengths:lengths,realPts:realPts,closed:closed,diagonals:diagonals,circleMode:circleMode,circleDiamCm:circleDiamCm,diagonalOverrides:diagonalOverrides,notes:notes,elemItems:elemItems,elemGroups:elemGroups,lightMarks:lightMarks,wallMarks:wallMarks,linearElements:linearElements,wallTypes:wallTypes,arcPoints:arcPoints}),obj.rooms[_activeRoomIdx].thumb=getCanvasThumb(.4));const room={id:"room_"+Date.now(),name:name,area:"",per:"",inC:"",outC:"",thumb:"",state:null,elemItems:[],elemGroups:[]};obj.rooms.push(room),setProjects(projects),_updateObjectInCloud(obj),_activeRoomIdx=obj.rooms.length-1,resetAllSilent(),document.getElementById("tbl").innerHTML='<table><tr><td style="color:#8e8e93;padding:10px;text-align:center;font-size:11px;">Натискайте на екран, щоб ставити кути</td></tr></table>',document.getElementById("diagList").innerHTML="немає",document.getElementById("per").textContent="0.00",document.getElementById("area").textContent="0.00",document.getElementById("inCorners").textContent="0",document.getElementById("outCorners").textContent="0",_hideAddRoomBtn(),draw(),_renderRoomTabsAboveCanvas(),_showRoomSaveBar(name),showToast("🚪 "+name+" — малюйте контур")}function _renderRoomTabsAboveCanvas(){const container=document.getElementById("cv")?.parentElement;if(!container)return;const old=document.getElementById("roomTabsRow");if(old&&old.remove(),!_activeObjectId)return;const obj=getProjects().find(p=>String(p.id)===String(_activeObjectId));if(!obj||!obj.rooms?.length)return;"static"===getComputedStyle(container).position&&(container.style.position="relative");const bar=document.createElement("div");bar.id="roomTabsRow",bar.style.cssText="position:absolute;top:5px;left:94px;right:6px;z-index:59;display:flex;gap:3px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;",obj.rooms.forEach((r,i)=>{const btn=document.createElement("button");let verdict=null;try{if(i===_activeRoomIdx&&window.A·CEILMeasureConfidence&&"function"==typeof window.A·CEILMeasureConfidence.analyze){const res=window.A·CEILMeasureConfidence.analyze();verdict=res&&res.verdict}else if("function"==typeof _analyzeRoomState){const res=_analyzeRoomState(r);verdict=res&&res.verdict}}catch(e){window.__diagSilent&&window.__diagSilent(e)}const dotColor=verdict&&"proven"===verdict.type?"#ef4444":verdict&&"conflict"===verdict.type?"#f59e0b":null;btn.innerHTML=(dotColor?`<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};margin-right:4px;vertical-align:middle;box-shadow:0 0 0 1.5px rgba(255,255,255,.65)" title="${verdict?escapeHtml(verdict.text):""}"></span>`:"")+escapeHtml(r.name||("Кімната "+(i+1))),btn.title=(r.name||("Кімната "+(i+1)))+(r.area?" · "+r.area+" м²":"");const active=i===_activeRoomIdx;btn.style.cssText="flex-shrink:0;max-width:116px;height:26px;min-height:26px;padding:2px 7px;border-radius:8px;border:none;font-size:10px;line-height:1;font-weight:750;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"+(active?"background:linear-gradient(135deg,#2563eb,#6366f1);color:#fff;box-shadow:none;":"background:rgba(232,238,255,.92);color:#3b52cc;box-shadow:none;"),btn.onclick=()=>_switchToRoomTab(i),bar.appendChild(btn)}),container.appendChild(bar)}function _switchToRoomTab(idx){if(idx===_activeRoomIdx)return;_commitRoomToObject(null,null),_activeRoomIdx=idx;const obj=getProjects().find(p=>String(p.id)===String(_activeObjectId));if(!obj)return;const room=obj.rooms[idx];if(resetAllSilent(),room.state)try{const s="string"==typeof room.state?JSON.parse(room.state):room.state;pts=[...s.pts||[]],lengths=[...s.lengths||[]],realPts=[...s.realPts||[]],closed=!!s.closed,diagonals=[...s.diagonals||[]],diagonalOverrides={...s.diagonalOverrides||{}},circleMode=!!s.circleMode,circleDiamCm=s.circleDiamCm||0,notes=[...s.notes||[]],elemItems=s.elemItems?JSON.parse(JSON.stringify(s.elemItems)):[],elemGroups=s.elemGroups?JSON.parse(JSON.stringify(s.elemGroups)):[],lightMarks=s.lightMarks?JSON.parse(JSON.stringify(s.lightMarks)):[],wallMarks=s.wallMarks?JSON.parse(JSON.stringify(s.wallMarks)):[],linearElements=s.linearElements?JSON.parse(JSON.stringify(s.linearElements)):[],wallTypes=s.wallTypes?JSON.parse(JSON.stringify(s.wallTypes)):[],arcPoints=s.arcPoints?JSON.parse(JSON.stringify(s.arcPoints)):[]}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}_currentProjComment=room.name,_restoreCanvasStats(),draw(),updateElemBadge(),"function"==typeof updateChecks&&updateChecks(),"function"==typeof updateLightBadge&&updateLightBadge(),closed?_showAddRoomBtn():_hideAddRoomBtn(),_renderRoomTabsAboveCanvas();const nameEl=document.querySelector("#roomSaveBar div div:last-child");nameEl&&(nameEl.textContent=room.name),showToast("🚪 "+room.name)}function _restoreCanvasStats(){if(circleMode&&circleDiamCm>0){const r=circleDiamCm/2;document.getElementById("per").textContent=(Math.PI*circleDiamCm/100).toFixed(2),document.getElementById("area").textContent=(Math.PI*r*r/1e4).toFixed(2),document.getElementById("inCorners").textContent="—",document.getElementById("outCorners").textContent="—",document.getElementById("tbl").innerHTML=`<table><tbody><tr><td style="font-weight:bold">Діаметр</td><td>${circleDiamCm} см</td></tr></tbody></table>`}else if(closed&&pts.length>=2){const per=_totalPerimeterCm();if(document.getElementById("per").textContent=(per/100).toFixed(2),realPts.length>=3)if(3===pts.length){const a=+lengths[0]||0,b=+lengths[1]||0,c=+lengths[2]||0;if(a>0&&b>0&&c>0){const s=(a+b+c)/2,hA=Math.sqrt(s*(s-a)*(s-b)*(s-c));!isNaN(hA)&&hA>0&&(document.getElementById("area").textContent=(hA/1e4).toFixed(2))}}else{let area=0;for(let i=0;i<realPts.length;i++){const j=(i+1)%realPts.length;area+=realPts[i].x*realPts[j].y-realPts[j].x*realPts[i].y}area=Math.abs(area)/2,area>0&&(document.getElementById("area").textContent=(area/1e4).toFixed(2))}let h="<table><thead><tr><th>Стор.</th><th>см</th></tr></thead><tbody>";for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;h+=`<tr><td style="font-weight:bold;">${N(i)}${N(j)}</td><td><input type="number" inputmode="decimal" data-i="${i}" value="${lengths[i]||""}" oninput="checkMark(this);saveLen(this)" onkeydown="nextInput(event,this)" class="${lengths[i]?"filled":""}" placeholder="0"></td></tr>`}h+="</tbody></table>",document.getElementById("tbl").innerHTML=h,updateCornerCount(),updateDiagList()}else document.getElementById("per").textContent="0.00",document.getElementById("area").textContent="0.00",document.getElementById("inCorners").textContent="0",document.getElementById("outCorners").textContent="0",document.getElementById("tbl").innerHTML='<table><tr><td style="color:#8e8e93;padding:10px;text-align:center;font-size:11px;">Натискайте на екран, щоб ставити кути</td></tr></table>',document.getElementById("diagList").textContent="немає"}function renderArcPointsEditor(i){const arr=_sideArcPts(i);let rows=arr.map((p,k)=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><span style="font-size:11px;font-weight:800;color:#7c3aed;width:22px">B${k+1}</span><input type="number" inputmode="decimal" value="${p.d||0}" placeholder="Відстань від ${N(i)}, см" oninput="updateArcPoint(${i},${k},'d',this.value)" style="flex:1;min-width:0;padding:8px;border:1px solid #ddd6fe;border-radius:8px;font-size:12.5px"><input type="number" inputmode="decimal" value="${p.o||0}" placeholder="Зміщення, см" oninput="updateArcPoint(${i},${k},'o',this.value)" style="flex:1;min-width:0;padding:8px;border:1px solid #ddd6fe;border-radius:8px;font-size:12.5px"><button type="button" onclick="removeArcPoint(${i},${k})" style="padding:6px 9px;border-radius:8px;background:#fee2e2;color:#dc2626;box-shadow:none;flex-shrink:0">✕</button></div>`).join("");return`<div style="background:#f5f3ff;border-radius:10px;padding:8px;margin-top:8px"><div style="font-size:11px;color:#5b21b6;font-weight:800;margin-bottom:6px">Проміжні точки (B1, B2, B3…) — опорна точка ${N(i)}, відстань уздовж хорди та бічне зміщення</div>${rows||'<div style="font-size:11px;color:#94a3b8;margin-bottom:6px">Точок ще немає</div>'}<button type="button" onclick="addArcPoint(${i})" style="padding:8px 12px;border-radius:9px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-size:12px;font-weight:800">+ Точка</button><div style="margin-top:8px;font-size:12px;font-weight:800;color:#4c1d95">Довжина дуги: <span id="sideArcLen_${i}">${(_sideCurveLenCm(i)/100).toFixed(2)}</span> м</div></div>`}
function _refreshSideArcBtn(i){const btn=document.getElementById("sideArcBtn_"+i);btn&&(btn.textContent="〜 "+("arc"===wallTypes[i]?"Дуга":"Пряма"),btn.style.background="arc"===wallTypes[i]?"linear-gradient(135deg,#7c3aed,#a78bfa)":"#f1f5f9",btn.style.color="arc"===wallTypes[i]?"#fff":"#475569")}
function toggleSideArcType(i){wallTypes[i]="arc"===wallTypes[i]?"straight":"arc","arc"===wallTypes[i]&&!_sideArcPts(i).length&&(arcPoints[i]=[{d:Math.round((_sideLenCm(i)||100)/2),o:20}]),_refreshSideArcBtn(i);const ed=document.getElementById("sideArcEditor_"+i);ed&&(ed.style.display="arc"===wallTypes[i]?"":"none",ed.innerHTML=renderArcPointsEditor(i)),draw(),saveState()}
function addArcPoint(i){arcPoints[i]=_sideArcPts(i).slice();const chord=_sideLenCm(i)||100,n=arcPoints[i].length,lastD=n?arcPoints[i][n-1].d:0;arcPoints[i].push({d:Math.min(chord,Math.round(lastD+chord/(n+2))),o:20});const ed=document.getElementById("sideArcEditor_"+i);ed&&(ed.innerHTML=renderArcPointsEditor(i)),draw(),saveState()}
function removeArcPoint(i,k){arcPoints[i]=_sideArcPts(i).slice(),arcPoints[i].splice(k,1);const ed=document.getElementById("sideArcEditor_"+i);ed&&(ed.innerHTML=renderArcPointsEditor(i)),draw(),saveState()}
function updateArcPoint(i,k,field,val){arcPoints[i]=_sideArcPts(i).slice();const p=arcPoints[i][k];if(!p)return;arcPoints[i][k]=Object.assign({},p,{[field]:parseFloat(val)||0});const lenEl=document.getElementById("sideArcLen_"+i);lenEl&&(lenEl.textContent=(_sideCurveLenCm(i)/100).toFixed(2)),draw(),saveState()}
function openSideInputModal(){if(!closed||pts.length<3)return void showToast("Спочатку замкніть контур");let h="";for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length,isArc="arc"===wallTypes[i];h+=`<div style="margin-bottom:14px;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><label style="flex:1;font-weight:700;margin:0">${N(i)+N(j)}</label><button type="button" onclick="toggleSideArcType(${i})" id="sideArcBtn_${i}" style="padding:6px 10px;border-radius:9px;font-size:11px;font-weight:800;background:${isArc?"linear-gradient(135deg,#7c3aed,#a78bfa)":"#f1f5f9"};color:${isArc?"#fff":"#475569"};box-shadow:none">〜 ${isArc?"Дуга":"Пряма"}</button></div><input type="number" inputmode="decimal" class="bulk-side-input"\ndata-i="${i}" value="${lengths[i]||""}" placeholder="Довжина хорди ${N(i)}${N(j)}, см"\nstyle="width:100%;padding:10px;border:1px solid #dbe4f0;border-radius:10px"><div id="sideArcEditor_${i}" style="${isArc?"":"display:none"}">${renderArcPointsEditor(i)}</div></div>`}document.getElementById("sideInputsContainer").innerHTML=h,document.getElementById("sideInputModal").classList.add("open"),setTimeout(()=>{const first=document.querySelector(".bulk-side-input");first&&(currentSideIndex=0,first.focus())},100),document.querySelectorAll(".bulk-side-input").forEach((el,index,arr)=>{function goNext(){index<arr.length-1&&(arr[index+1].focus(),arr[index+1].select())}el.addEventListener("keydown",e=>{"Enter"===e.key&&(e.preventDefault(),goNext())}),el.addEventListener("change",()=>{setTimeout(goNext,50)})})}new MutationObserver(function(){const anyOpen=document.querySelector(".modal-overlay.open, #elementsModal.open, #rmWallTapMenuV84.open, #rmDirectCurveModalV87.open"),btn=document.getElementById("addRoomBtn");if(btn){const want=anyOpen?"none":"";btn.style.display!==want&&(btn.style.display=want)}}).observe(document.body,{attributes:!0,subtree:!0,attributeFilter:["class","style"]});let currentSideIndex=0;function focusPrevSide(){const arr=[...document.querySelectorAll(".bulk-side-input")];arr.length&&(currentSideIndex=Math.max(0,currentSideIndex-1),arr[currentSideIndex].focus())}function focusNextSide(){const arr=[...document.querySelectorAll(".bulk-side-input")];arr.length&&(currentSideIndex=Math.min(arr.length-1,currentSideIndex+1),arr[currentSideIndex].focus())}function applySideInputs(){[...document.querySelectorAll(".bulk-side-input")].forEach(el=>{const i=+el.dataset.i;lengths[i]=parseFloat(el.value)||0});document.querySelectorAll("input[data-i]").forEach(el=>{const i=+el.dataset.i;lengths[i]&&(el.value=lengths[i],el.classList.add("filled"))});let per=_totalPerimeterCm();document.getElementById("per").textContent=(per/100).toFixed(2),closeModal("sideInputModal"),rebuild(),saveState(),setTimeout(()=>{try{window.A·CEILMeasureConfidence&&typeof window.A·CEILMeasureConfidence.notify==="function"&&window.A·CEILMeasureConfidence.notify(true)}catch(e){window.__diagSilent&&window.__diagSilent(e)}},250)}const cv=document.getElementById("cv"),ctx=cv.getContext("2d");let viewScale=1,viewOffsetX=0,viewOffsetY=0,pinchStartDist=0,pinchStartScale=1,isPanning=!1,panStartX=0,panStartY=0,pts=[],lengths=[],realPts=[],notes=[],closed=!1,diagonalMode=!1,triangleMode=!1,selectedPoint=null,diagonals=[],diagonalOverrides={},circleMode=!1,circleDiamCm=0,lightMarks=[],lightMode=null,wallMarks=[],linearElements=[],wallTypes=[],arcPoints=[],_wallEditId=null,_wallSideFlash=-1;function undoPoint(){closed||circleMode||0===pts.length||(pts.pop(),saveState(),draw())}function N(i){return String.fromCharCode(64+(i+1))}function toggleShapeMenu(){document.getElementById("shapeMenu")?.classList.toggle("open")}function closeShapeMenu(){document.getElementById("shapeMenu")?.classList.remove("open")}function toggleDiagMenu(){document.getElementById("diagMenu")?.classList.toggle("open")}function closeDiagMenu(){document.getElementById("diagMenu")?.classList.remove("open")}function openRectModal(){closed||pts.length>0?showToast('Спочатку очистіть полотно (кнопка "Очистити все")'):(document.getElementById("rectModal").classList.add("open"),setTimeout(()=>document.getElementById("rectW").focus(),100))}function openCircleModal(){closed||pts.length>0?showToast('Спочатку очистіть полотно (кнопка "Очистити все")'):(document.getElementById("circleModal").classList.add("open"),setTimeout(()=>document.getElementById("circleDiam").focus(),100))}function closeModal(id){document.getElementById(id).classList.remove("open")}function applyRect(){const w=parseFloat(document.getElementById("rectW").value),h=parseFloat(document.getElementById("rectH").value);if(!w||!h||w<=0||h<=0)return void showToast("Введіть коректні розміри");closeModal("rectModal"),resetAllSilent();const scale=Math.min(580/w,580/h),cw=w*scale,ch=h*scale,ox=85+(580-cw)/2,oy=85+(580-ch)/2;pts=[{x:ox,y:oy},{x:ox+cw,y:oy},{x:ox+cw,y:oy+ch},{x:ox,y:oy+ch}],lengths=[w,h,w,h],realPts=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],closed=!0,autoOpenDimensionsAfterClose(),circleMode=!1;let labels=["AB (ширина)","BC (висота)","CD (ширина)","DA (висота)"],h2="<table><thead><tr><th>Стор.</th><th>см</th></tr></thead><tbody>";for(let i=0;i<4;i++)h2+=`<tr><td style="font-weight:bold;">${labels[i]}</td><td><input type="number" inputmode="decimal" data-i="${i}" value="${lengths[i]}" oninput="checkMark(this); saveLen(this)" onkeydown="nextInput(event,this)" class="filled"></td></tr>`;h2+="</tbody></table>",document.getElementById("tbl").innerHTML=h2;const perimeter=2*(w+h),area=w*h;document.getElementById("per").textContent=(perimeter/100).toFixed(2),document.getElementById("area").textContent=(area/1e4).toFixed(2),document.getElementById("inCorners").textContent="4",document.getElementById("outCorners").textContent="0";const diag=Math.hypot(w,h);document.getElementById("diagList").innerHTML=`<b>AC</b>=${diag.toFixed(0)}см`,updateCornerCount(),draw(),updateChecks(),saveState()}function applyCircle(){const diam=parseFloat(document.getElementById("circleDiam").value);if(!diam||diam<=0)return void showToast("Введіть коректний діаметр");closeModal("circleModal"),resetAllSilent(),circleDiamCm=diam,circleMode=!0,closed=!0,autoOpenDimensionsAfterClose();const r=diam/2,perimeter=Math.PI*diam,area=Math.PI*r*r;document.getElementById("per").textContent=(perimeter/100).toFixed(2),document.getElementById("area").textContent=(area/1e4).toFixed(2),document.getElementById("inCorners").textContent="—",document.getElementById("outCorners").textContent="—",document.getElementById("diagList").innerHTML=`<b>Діаметр</b>: ${diam} см`,document.getElementById("tbl").innerHTML=`\n<table><thead><tr><th>Параметр</th><th>Значення</th></tr></thead><tbody><tr><td>Діаметр</td><td><b>${diam} см</b></td></tr><tr><td>Радіус</td><td><b>${r.toFixed(1)} см</b></td></tr><tr><td>Периметр</td><td><b>${(perimeter/100).toFixed(2)} м</b></td></tr><tr><td>Площа</td><td><b>${(area/1e4).toFixed(2)} м²</b></td></tr></tbody></table>`,draw()}
function getCanvasThumb(quality){const src=document.getElementById("cv");if(!src)return"";const tmp=document.createElement("canvas");tmp.width=src.width,tmp.height=src.height;const tctx=tmp.getContext("2d");return tctx.fillStyle="#ffffff",tctx.fillRect(0,0,tmp.width,tmp.height),tctx.drawImage(src,0,0),tmp.toDataURL("image/jpeg",quality||.4)}document.addEventListener("click",function(e){const shapeMenu=document.getElementById("shapeMenu");shapeMenu&&shapeMenu.classList.contains("open")&&(e.target.closest("#shapeMenu")||e.target.closest('[onclick="toggleShapeMenu()"]')||closeShapeMenu());const diagMenu=document.getElementById("diagMenu");diagMenu&&diagMenu.classList.contains("open")&&(e.target.closest("#diagMenu")||e.target.closest('[onclick="toggleDiagMenu()"]')||closeDiagMenu())});let _reportMode=!1;const DEFAULT_LIGHT_TYPES=[{id:"spot",label:"Спот",icon:"⊙"},{id:"chandelier",label:"Люстра",icon:"✶"}];let lightTypes=loadLightTypes(),lightGridOn="0"!==localStorage.getItem("lightGridOn"),lightSnapOn="0"!==localStorage.getItem("lightSnapOn"),lightAutoQtyOn="1"===localStorage.getItem("lightAutoQtyOn"),lightGridCm=parseInt(localStorage.getItem("lightGridCm")||"50",10)||50,selectedLightId=null,_lightDragIndex=-1,_lightDragging=!1,_lightSuppressClick=!1,_lastLightTap={id:null,t:0};function loadLightTypes(){try{const raw=localStorage.getItem("lightTypes_v1");if(!raw)return JSON.parse(JSON.stringify(DEFAULT_LIGHT_TYPES));const arr=JSON.parse(raw);return Array.isArray(arr)&&arr.length?DEFAULT_LIGHT_TYPES.map(def=>{const saved=arr.find(x=>x&&x.id===def.id)||{};return{id:def.id,label:saved.label||def.label,icon:saved.icon||def.icon}}):JSON.parse(JSON.stringify(DEFAULT_LIGHT_TYPES))}catch{return JSON.parse(JSON.stringify(DEFAULT_LIGHT_TYPES))}}function saveLightTypes(){try{localStorage.setItem("lightTypes_v1",JSON.stringify(lightTypes))}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}}function _lightType(type){return(lightTypes||[]).find(t=>t.id===type)||DEFAULT_LIGHT_TYPES.find(t=>t.id===type)||DEFAULT_LIGHT_TYPES[0]}function _lightLabel(type){return _lightType(type).label}function _lightIcon(type){return _lightType(type).icon}function renderLightMenu(){const menu=document.getElementById("lightMenu");menu&&(menu.innerHTML='\n<button type="button" class="quick-menu-card" onclick="setLightMode(\'spot\')"><span class="quick-menu-icon">⊕</span><span class="quick-menu-text"><b>Додати позначку</b><small>поставити точку на кресленні</small></span></button><button type="button" class="quick-menu-card" onclick="openLightSettings()"><span class="quick-menu-icon">⚙️</span><span class="quick-menu-text"><b>Налаштування</b><small>типи, сітка, привʼязка, авто-кількість</small></span></button><button type="button" class="quick-menu-card" onclick="clearLightMode()"><span class="quick-menu-icon">✕</span><span class="quick-menu-text"><b>Вимкнути режим</b><small>звичайне креслення</small></span></button>')}function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]))}function toggleLightMenu(){renderLightMenu(),document.getElementById("lightMenu")?.classList.toggle("open")}function closeLightMenu(){document.getElementById("lightMenu")?.classList.remove("open")}function setLightMode(type){lightMode=type,closeLightMenu(),updateLightBadge(),draw(),showToast("Тапніть на кресленні, щоб поставити: "+_lightLabel(type))}function clearLightMode(){lightMode=null,closeLightMenu(),updateLightBadge(),draw()}function toggleLightGrid(){lightGridOn=!lightGridOn,localStorage.setItem("lightGridOn",lightGridOn?"1":"0"),renderLightMenu(),updateGridButtons(),draw()}function toggleLightSnap(){lightSnapOn=!lightSnapOn,localStorage.setItem("lightSnapOn",lightSnapOn?"1":"0"),renderLightMenu(),updateGridButtons()}function toggleLightAutoQty(){lightAutoQtyOn=!lightAutoQtyOn,localStorage.setItem("lightAutoQtyOn",lightAutoQtyOn?"1":"0"),updateGridButtons(),syncLightMarksToElems(),showToast(lightAutoQtyOn?"Авто-кількість світла увімкнено":"Авто-кількість світла вимкнено")}function setLightGridCm(cm){lightGridCm=cm,localStorage.setItem("lightGridCm",String(cm)),updateGridButtons(),renderLightMenu(),draw()}function openLightSettings(){closeLightMenu();const rows=document.getElementById("lightSettingsRows");rows&&(rows.innerHTML=(lightTypes||DEFAULT_LIGHT_TYPES).map(t=>`\n<div class="light-settings-row"><input id="lightIcon_${t.id}" value="${escapeHtml(t.icon)}" maxlength="3" inputmode="text" aria-label="Значок"><input id="lightLabel_${t.id}" value="${escapeHtml(t.label)}" placeholder="Назва"></div>`).join("")),updateGridButtons(),document.getElementById("lightSettingsModal")?.classList.add("open")}function updateGridButtons(){["25","50","100"].forEach(v=>{const b=document.getElementById("grid"+v+"Btn");b&&b.classList.toggle("active",lightGridCm===+v)});const gb=document.getElementById("gridOnBtn");gb&&(gb.classList.toggle("active",!!lightGridOn),gb.textContent=(lightGridOn?"☑ ":"☐ ")+"Сітка");const sb=document.getElementById("snapOnBtn");sb&&(sb.classList.toggle("active",!!lightSnapOn),sb.textContent=(lightSnapOn?"☑ ":"☐ ")+"Привʼязка");const ab=document.getElementById("autoQtyOnBtn");ab&&(ab.classList.toggle("active",!!lightAutoQtyOn),ab.textContent=(lightAutoQtyOn?"☑ ":"☐ ")+"Авто-кількість")}function saveLightSettings(){lightTypes=(lightTypes||DEFAULT_LIGHT_TYPES).map(t=>{const icon=(document.getElementById("lightIcon_"+t.id)?.value||t.icon).trim().slice(0,3)||t.icon,label=(document.getElementById("lightLabel_"+t.id)?.value||t.label).trim()||t.label;return{id:t.id,icon:icon,label:label}}),saveLightTypes(),closeModal("lightSettingsModal"),updateLightBadge(),renderLightMenu(),syncLightMarksToElems(),draw(),showToast("Налаштування світла збережено")}function updateLightBadge(){const b=document.getElementById("lightBadge");if(b){const n=(lightMarks||[]).length;b.textContent=n,b.style.display=n?"inline-block":"none"}const active=document.getElementById("lightActiveBadge");if(active){const gridTxt=lightGridOn?` · сітка ${lightGridCm}см${lightSnapOn?" + привʼязка":""}`:"",autoTxt=lightAutoQtyOn?" · авто-кількість":"";active.textContent=lightMode?"💡 "+_lightLabel(lightMode)+" — тап / перетягування"+gridTxt+autoTxt:"",active.classList.toggle("show",!!lightMode)}}function _pxPerCm(){try{if(circleMode&&circleDiamCm>0)return.42*Math.min(cv.width,cv.height)*2/circleDiamCm;let vals=[];if(Array.isArray(pts)&&Array.isArray(lengths))for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length,cm=+lengths[i]||0;cm>0&&pts[i]&&pts[j]&&vals.push(Math.hypot(pts[j].x-pts[i].x,pts[j].y-pts[i].y)/cm)}if(vals=vals.filter(v=>isFinite(v)&&v>0),vals.length)return vals.reduce((a,b)=>a+b,0)/vals.length}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return 1}function _lightGridStepPx(){return Math.max(8,Math.min(160,lightGridCm*_pxPerCm()))}function snapLightPoint(x,y){if(!lightSnapOn||!lightGridOn)return{x:x,y:y};const step=_lightGridStepPx();return{x:Math.round(x/step)*step,y:Math.round(y/step)*step}}function _pointInPoly(x,y){if(!Array.isArray(pts)||pts.length<3)return!0;let inside=!1;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;yi>y!=yj>y&&x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi&&(inside=!inside)}return inside}function _lightMap(baseIndex){if(!Array.isArray(pts)||pts.length<2)return null;let bi=Number.isFinite(+baseIndex)?Math.max(0,Math.min(pts.length-1,+baseIndex)):0;const bj=(bi+1)%pts.length,a=pts[bi],b=pts[bj];if(!a||!b)return null;const vx=b.x-a.x,vy=b.y-a.y,dpx=Math.hypot(vx,vy),cm=Array.isArray(lengths)&&(+lengths[bi]||0)>0?+lengths[bi]:0;if(!dpx||!cm)return null;const ux=vx/dpx,uy=vy/dpx;let px=-uy,py=ux;const midx=(a.x+b.x)/2,midy=(a.y+b.y)/2,testDist=Math.min(40,Math.max(10,.12*dpx));return _pointInPoly(midx+px*testDist,midy+py*testDist)||(px=uy,py=-ux),{baseIndex:bi,a:a,ux:ux,uy:uy,px:px,py:py,pxPerCm:dpx/cm}}function canvasToLightCoords(x,y,baseIndex){const m=_lightMap(baseIndex);if(!m)return{x:null,y:null,baseIndex:0};const rx=x-m.a.x,ry=y-m.a.y;return{x:Math.round((rx*m.ux+ry*m.uy)/m.pxPerCm*10)/10,y:Math.round((rx*m.px+ry*m.py)/m.pxPerCm*10)/10,baseIndex:m.baseIndex}}function lightCoordsToCanvas(xCm,yCm,baseIndex){const m=_lightMap(baseIndex);return m?{x:m.a.x+(xCm*m.ux+yCm*m.px)*m.pxPerCm,y:m.a.y+(xCm*m.uy+yCm*m.py)*m.pxPerCm}:null}function _nearestLightBaseIndex(x,y){if(!Array.isArray(pts)||!pts.length)return 0;let best=0,bd=1/0;return pts.forEach((p,i)=>{const d=Math.hypot((p.x||0)-x,(p.y||0)-y);d<bd&&(bd=d,best=i)}),best}function _renderLightBaseOptions(selected){const sel=document.getElementById("lightEditBase");sel&&(Array.isArray(pts)&&pts.length?(sel.innerHTML=pts.map((p,i)=>`<option value="${i}">${N(i)}</option>`).join(""),sel.value=String(Number.isFinite(+selected)?+selected:0)):sel.innerHTML='<option value="0">A</option>')}function refreshLightEditCoordsFromBase(){const idx=(lightMarks||[]).findIndex(m=>m&&m.id===selectedLightId);if(idx<0)return;const base=parseInt(document.getElementById("lightEditBase")?.value||"0",10)||0,m=lightMarks[idx],co=canvasToLightCoords(+m.x||0,+m.y||0,base),xEl=document.getElementById("lightEditX"),yEl=document.getElementById("lightEditY");xEl&&(xEl.value=null!==co.x?co.x:""),yEl&&(yEl.value=null!==co.y?co.y:"")}function _updateLightCoords(mark){if(!mark)return;Number.isFinite(+mark.baseIndex)||(mark.baseIndex=_nearestLightBaseIndex(+mark.x||0,+mark.y||0));const co=canvasToLightCoords(+mark.x||0,+mark.y||0,mark.baseIndex);null!==co.x&&null!==co.y&&(mark.coordX=co.x,mark.coordY=co.y,mark.baseIndex=co.baseIndex)}function openLightEditModal(id){const idx=(lightMarks||[]).findIndex(m=>m&&m.id===id);if(idx<0)return;const m=lightMarks[idx];Number.isFinite(+m.baseIndex)||(m.baseIndex=_nearestLightBaseIndex(+m.x||0,+m.y||0)),_updateLightCoords(m),selectedLightId=m.id,_renderLightBaseOptions(m.baseIndex);const sel=document.getElementById("lightEditType");sel&&(sel.innerHTML=(lightTypes||DEFAULT_LIGHT_TYPES).map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.icon)} ${escapeHtml(t.label)}</option>`).join(""),sel.value=m.type||"spot");const xEl=document.getElementById("lightEditX"),yEl=document.getElementById("lightEditY");xEl&&(xEl.value=void 0!==m.coordX&&null!==m.coordX?m.coordX:""),yEl&&(yEl.value=void 0!==m.coordY&&null!==m.coordY?m.coordY:""),document.getElementById("lightMenu")?.classList.remove("open"),document.getElementById("lightEditModal")?.classList.add("open"),draw()}function saveLightEdit(){const idx=(lightMarks||[]).findIndex(m=>m&&m.id===selectedLightId);if(idx<0)return void closeModal("lightEditModal");const m=lightMarks[idx],type=document.getElementById("lightEditType")?.value||m.type||"spot",base=parseInt(document.getElementById("lightEditBase")?.value||"0",10)||0,x=parseFloat(document.getElementById("lightEditX")?.value),y=parseFloat(document.getElementById("lightEditY")?.value);if(m.type=type,m.baseIndex=base,isFinite(x)&&isFinite(y)){const p=lightCoordsToCanvas(x,y,base);p&&(m.x=Math.round(p.x),m.y=Math.round(p.y),m.coordX=Math.round(10*x)/10,m.coordY=Math.round(10*y)/10,m.baseIndex=base)}else _updateLightCoords(m);closeModal("lightEditModal"),selectedLightId=null,draw(),updateLightBadge(),syncLightMarksToElems(),saveState(),showToast("Позначку оновлено")}function deleteLightFromEditor(){deleteSelectedLight(),closeModal("lightEditModal")}function _uniqSortedVals(arr){const vals=[];return(arr||[]).forEach(v=>{v=+v,isFinite(v)&&(vals.some(x=>Math.abs(x-v)<4)||vals.push(v))}),vals.sort((a,b)=>a-b)}function _zoneCenterForPoint(x,y){if(!Array.isArray(pts)||pts.length<3)return{x:cv.width/2,y:cv.height/2};const xs=_uniqSortedVals(pts.map(p=>p.x)),ys=_uniqSortedVals(pts.map(p=>p.y)),cells=[];for(let xi=0;xi<xs.length-1;xi++)for(let yi=0;yi<ys.length-1;yi++){const x0=xs[xi],x1=xs[xi+1],y0=ys[yi],y1=ys[yi+1];if(x1-x0<12||y1-y0<12)continue;const cx=(x0+x1)/2,cy=(y0+y1)/2;if(_pointInPoly(cx,cy)){const inside=x>=x0-8&&x<=x1+8&&y>=y0-8&&y<=y1+8,d=inside?0:Math.hypot(cx-x,cy-y);cells.push({x0:x0,x1:x1,y0:y0,y1:y1,cx:cx,cy:cy,inside:inside,d:d,area:(x1-x0)*(y1-y0)})}}if(cells.length){const inside=cells.filter(c=>c.inside).sort((a,b)=>a.area-b.area);return inside.length?{x:inside[0].cx,y:inside[0].cy}:(cells.sort((a,b)=>a.d-b.d),{x:cells[0].cx,y:cells[0].cy})}let cx=0,cy=0,n=0;return pts.forEach(p=>{cx+=p.x,cy+=p.y,n++}),{x:cx/(n||1),y:cy/(n||1)}}function placeSelectedLightCenter(){const idx=(lightMarks||[]).findIndex(m=>m&&m.id===selectedLightId);if(idx<0)return;const mark=lightMarks[idx],z=_zoneCenterForPoint(+mark.x||0,+mark.y||0);mark.x=Math.round(z.x),mark.y=Math.round(z.y),mark.baseIndex=_nearestLightBaseIndex(mark.x,mark.y),_updateLightCoords(mark),_renderLightBaseOptions(mark.baseIndex);const xEl=document.getElementById("lightEditX"),yEl=document.getElementById("lightEditY");xEl&&(xEl.value=mark.coordX??""),yEl&&(yEl.value=mark.coordY??""),draw(),showToast("Позначку поставлено по центру зони")}function getLightCoordLines(st){let list=st&&Array.isArray(st.lightMarks)?st.lightMarks:[];list=list.filter(function(m){return!function(m){const type=String(m&&m.type||"").toLowerCase(),label=String(m&&(m.label||m.name||m.title)||"").toLowerCase();return!(!m||!m._exhaust)||"vent"===type||"exhaust"===type||"hood"===type||/витяж|вытяж|вентиляц|\bvent\b|hood|exhaust/.test(type+" "+label)}(m)});const old={pts:pts,lengths:lengths,realPts:realPts,circleMode:circleMode,circleDiamCm:circleDiamCm};try{return st&&(pts=st.pts||[],lengths=st.lengths||[],realPts=st.realPts||[],circleMode=!!st.circleMode,circleDiamCm=st.circleDiamCm||0),list.map((m,i)=>{const base=Number.isFinite(+m.baseIndex)?+m.baseIndex:_nearestLightBaseIndex(+m.x||0,+m.y||0),co=void 0!==m.coordX&&void 0!==m.coordY&&Number.isFinite(+m.baseIndex)?{x:m.coordX,y:m.coordY,baseIndex:base}:canvasToLightCoords(+m.x||0,+m.y||0,base),label=_lightLabel(m.type||"spot"),baseName=Array.isArray(pts)&&pts.length?N(co.baseIndex??base):"A";return null===co.x||null===co.y?`${label} ${i+1}`:`${label} ${i+1}: від ${baseName} — ${Number(co.x).toFixed(Number(co.x)%1?1:0)} × ${Number(co.y).toFixed(Number(co.y)%1?1:0)} см`})}catch{return[]}finally{pts=old.pts,lengths=old.lengths,realPts=old.realPts,circleMode=old.circleMode,circleDiamCm=old.circleDiamCm}}function drawLightGrid(targetCtx){if(!lightMode||!lightGridOn)return;const step=_lightGridStepPx();if(!isFinite(step)||step<8)return;targetCtx.save(),targetCtx.strokeStyle="rgba(148,163,184,.28)",targetCtx.lineWidth=1,targetCtx.setLineDash([]);const startX=Math.floor(0/step)*step,startY=Math.floor(0/step)*step;for(let x=startX;x<=cv.width;x+=step)targetCtx.beginPath(),targetCtx.moveTo(x,0),targetCtx.lineTo(x,cv.height),targetCtx.stroke();for(let y=startY;y<=cv.height;y+=step)targetCtx.beginPath(),targetCtx.moveTo(0,y),targetCtx.lineTo(cv.width,y),targetCtx.stroke();targetCtx.fillStyle="rgba(100,116,139,.72)",targetCtx.font="bold 11px Arial",targetCtx.textAlign="left",targetCtx.fillText(`Сітка ${lightGridCm} см`,12,20),targetCtx.restore()}function _fmtCm(v){return v=Number(v),isFinite(v)?(Math.abs(v%1)>.05?v.toFixed(1):Math.round(v).toString())+" см":""}function _drawDimLabel(ctx,txt,x,y){if(!txt)return;ctx.save(),ctx.font="bold 12px -apple-system,Arial",ctx.textAlign="center",ctx.textBaseline="middle";const w=ctx.measureText(txt).width+14;ctx.fillStyle="rgba(255,255,255,.94)",ctx.strokeStyle="rgba(37,99,235,.55)",ctx.lineWidth=1.2,ctx.beginPath(),ctx.roundRect(x-w/2,y-11,w,22,7),ctx.fill(),ctx.stroke(),ctx.fillStyle="#1d4ed8",ctx.fillText(txt,x,y+.5),ctx.restore()}function _drawLightBindingForMark(ctx,m){if(!m||!Array.isArray(pts)||pts.length<2)return;let base=Number.isFinite(+m.baseIndex)?+m.baseIndex:_nearestLightBaseIndex(+m.x||0,+m.y||0),xCm=Number(m.coordX),yCm=Number(m.coordY);if(!isFinite(xCm)||!isFinite(yCm)){const co=canvasToLightCoords(+m.x||0,+m.y||0,base);xCm=Number(co.x),yCm=Number(co.y),base=co.baseIndex??base}const map=_lightMap(base);if(!map||!isFinite(xCm)||!isFinite(yCm))return;const a=map.a,p1={x:a.x+xCm*map.ux*map.pxPerCm,y:a.y+xCm*map.uy*map.pxPerCm},p2={x:+m.x||0,y:+m.y||0};function tick(p,dx,dy){const len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;ctx.beginPath(),ctx.moveTo(p.x-6*nx,p.y-6*ny),ctx.lineTo(p.x+6*nx,p.y+6*ny),ctx.stroke()}function label(txt,x,y){if(!txt)return;ctx.save(),ctx.font="bold 11px -apple-system,Arial",ctx.textAlign="center",ctx.textBaseline="middle";const w=ctx.measureText(txt).width+12;ctx.fillStyle="rgba(255,255,255,.96)",ctx.strokeStyle="rgba(37,99,235,.62)",ctx.lineWidth=1,ctx.beginPath(),ctx.roundRect(x-w/2,y-10,w,20,7),ctx.fill(),ctx.stroke(),ctx.fillStyle="#1d4ed8",ctx.fillText(txt,x,y+.5),ctx.restore()}ctx.save(),ctx.strokeStyle="rgba(37,99,235,.78)",ctx.fillStyle="#2563eb",ctx.lineWidth=1.6,ctx.setLineDash([5,4]);const dx1=p1.x-a.x,dy1=p1.y-a.y,dx2=p2.x-p1.x,dy2=p2.y-p1.y;ctx.beginPath(),ctx.moveTo(a.x,a.y),ctx.lineTo(p1.x,p1.y),ctx.lineTo(p2.x,p2.y),ctx.stroke(),tick(a,dx1,dy1),tick(p1,dx1,dy1),tick(p2,dx2,dy2),ctx.setLineDash([]);const compactTxt=`${_fmtCm(xCm).replace(" см","")}×${_fmtCm(yCm).replace(" см","")}`,vx=p2.x-a.x,vy=p2.y-a.y,vlen=Math.hypot(vx,vy)||1;label(compactTxt,p1.x+-vy/vlen*26,p1.y+vx/vlen*26),ctx.beginPath(),ctx.arc(a.x,a.y,3,0,2*Math.PI),ctx.fill(),label("від "+N(base),a.x+24,a.y-18),ctx.restore()}function drawLightBindings(targetCtx){_reportMode&&!0===("function"==typeof _loadRS?_loadRS():window.reportSettings||{}).showLightCoords&&(lightMarks||[]).forEach(m=>_drawLightBindingForMark(targetCtx,m))}
function drawLightMarks(targetCtx){(lightMarks||[]).forEach((m,idx)=>{if(!m)return;const x=+m.x||0,y=+m.y||0,type=m.type||"spot",selected=!_reportMode&&lightMode&&m.id&&m.id===selectedLightId;if("spot"===type||"chandelier"===type){const r="chandelier"===type?9:8;targetCtx.save(),targetCtx.shadowColor="rgba(245,158,11,.28)",targetCtx.shadowBlur=3,targetCtx.beginPath(),targetCtx.arc(x,y,r,0,2*Math.PI),targetCtx.fillStyle="chandelier"===type?"#facc15":"#ffe88a",targetCtx.fill(),targetCtx.shadowBlur=0,targetCtx.strokeStyle="#ca8a04",targetCtx.lineWidth=1.4,targetCtx.stroke(),"spot"===type&&(targetCtx.beginPath(),targetCtx.arc(x,y,1.8,0,2*Math.PI),targetCtx.fillStyle="#ca8a04",targetCtx.fill()),selected&&(targetCtx.beginPath(),targetCtx.arc(x,y,r+3.5,0,2*Math.PI),targetCtx.strokeStyle="#2563eb",targetCtx.lineWidth=2,targetCtx.stroke()),targetCtx.fillStyle="#475569",targetCtx.font="700 9px Arial",targetCtx.textAlign="center",targetCtx.textBaseline="top",targetCtx.fillText(String(idx+1),x,y+r+4),targetCtx.restore();return}targetCtx.save(),targetCtx.textAlign="center",targetCtx.textBaseline="middle",targetCtx.fillStyle="rgba(255,255,255,.96)",targetCtx.strokeStyle=selected?"#2563eb":"vent"===type?"#0891b2":"#ca8a04",targetCtx.lineWidth=selected?4:2.4,targetCtx.beginPath(),targetCtx.arc(x,y,selected?18:15,0,2*Math.PI),targetCtx.fill(),targetCtx.stroke(),targetCtx.fillStyle=targetCtx.strokeStyle,targetCtx.font="bold 19px Arial",targetCtx.fillText(_lightIcon(type),x,y-1),targetCtx.fillStyle="#334155",targetCtx.font="bold 10px Arial",targetCtx.fillText(String(idx+1),x,y+24),targetCtx.restore()})}
function findLightHit(x,y){if(!Array.isArray(lightMarks))return-1;for(let i=lightMarks.length-1;i>=0;i--){const m=lightMarks[i];if(m&&Math.hypot((+m.x||0)-x,(+m.y||0)-y)<=24)return i}return-1}
function findLightHitTouch(clientX,clientY){
  if(!Array.isArray(lightMarks)||!cv)return-1;
  const r=cv.getBoundingClientRect(),sx=r.width/(cv.width||1),sy=r.height/(cv.height||1),sc=viewScale||1;
  for(let i=lightMarks.length-1;i>=0;i--){
    const m=lightMarks[i];if(!m)continue;
    const cx=r.left+((+m.x||0)*sc+viewOffsetX)*sx,cy=r.top+((+m.y||0)*sc+viewOffsetY)*sy;
    if(Math.hypot(cx-clientX,cy-clientY)<=34)return i;
  }
  return-1;
}function moveLightMark(idx,x,y,finalMove){if(idx<0||!lightMarks[idx])return;const p=finalMove?snapLightPoint(x,y):{x:x,y:y};lightMarks[idx].x=Math.round(p.x),lightMarks[idx].y=Math.round(p.y),finalMove&&_updateLightCoords(lightMarks[idx]),selectedLightId=lightMarks[idx].id||null,finalMove?draw():requestDraw()}function deleteSelectedLight(){if(!selectedLightId)return!1;const idx=lightMarks.findIndex(m=>m&&m.id===selectedLightId);return!(idx<0||(lightMarks.splice(idx,1),selectedLightId=null,draw(),updateLightBadge(),syncLightMarksToElems(),saveState(),showToast("Позначку світла видалено"),0))}function syncLightMarksToElems(){if(lightAutoQtyOn)try{if("undefined"==typeof elemItems||!Array.isArray(elemItems))return;const counts={};(lightMarks||[]).forEach(m=>{m&&m.type&&(counts[m.type]=(counts[m.type]||0)+1)});let groupId=null;if("undefined"!=typeof elemGroups&&Array.isArray(elemGroups)){let g=elemGroups.find(x=>"світло"===String(x.name||"").trim().toLowerCase());g||(g={id:"g_light_"+Date.now(),name:"Світло",collapsed:!1},elemGroups.push(g)),groupId=g.id}(lightTypes||DEFAULT_LIGHT_TYPES).forEach(t=>{const cnt=counts[t.id]||0,labelKey=String(t.label||"").trim().toLowerCase();let it=elemItems.find(x=>String(x.name||"").trim().toLowerCase()===labelKey);!it&&cnt>0&&(it={id:"e_light_"+t.id+"_"+Date.now(),groupId:groupId,icon:t.icon||"💡",name:t.label,qty:0,unit:"шт",price:0,inputMode:"manual"},elemItems.push(it)),it&&(it.qty=cnt,it.unit="шт",it.icon||(it.icon=t.icon||"💡"))}),document.getElementById("elementsModal")?.classList.contains("open")&&"function"==typeof renderElemList&&renderElemList(),"function"==typeof updateElemBadge&&updateElemBadge(),"function"==typeof recalcElemTotal&&recalcElemTotal()}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}}function handleLightTap(x,y){if(_lightSuppressClick)return _lightSuppressClick=!1,!0;const hit=findLightHit(x,y);if(hit>=0){const m=lightMarks[hit],now=Date.now();return _lastLightTap.id===m.id&&now-_lastLightTap.t<700?(lightMarks.splice(hit,1),selectedLightId=null,_lastLightTap={id:null,t:0},showToast("Позначку світла видалено"),draw(),updateLightBadge(),syncLightMarksToElems(),saveState(),!0):(selectedLightId=m.id||null,_lastLightTap={id:m.id,t:now},draw(),openLightEditModal(m.id),!0)}if(!lightMode)return!1;if(!closed&&!circleMode)return showToast("Спочатку замкніть контур"),!0;const p=snapLightPoint(x,y),mark={id:"light_"+Date.now(),type:lightMode||"spot",x:Math.round(p.x),y:Math.round(p.y)};if(mark.baseIndex=_nearestLightBaseIndex(mark.x,mark.y),_updateLightCoords(mark),lightMarks.push(mark),selectedLightId=mark.id,_lastLightTap={id:null,t:0},draw(),updateLightBadge(),syncLightMarksToElems(),saveState(),!0===window.A·CEIL_OPEN_LIGHT_EDITOR_AFTER_PLACE)openLightEditModal(mark.id);else try{showToast((_lightLabel(mark.type)||"Позначку")+" додано")}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return!0}const WALL_PRESETS_KEY="wallElementPresets_v1";function getWallPresets(){try{const saved=JSON.parse(localStorage.getItem(WALL_PRESETS_KEY)||"null");if(Array.isArray(saved)&&saved.length)return saved}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}return["Ніша карниза біла","Ніша карниза чорна","Прихований карниз","Карниз прихований білий","Карниз прихований чорний","Парящий білий","Парящий чорний","Трек прихований","Трек накладний","Світлова лінія","Закладна","Вентиляція","Ревізійний люк","Інше"]}function setWallPresets(list){localStorage.setItem(WALL_PRESETS_KEY,JSON.stringify((list||[]).filter(Boolean)))}function renderWallPresetSelect(current){const sel=$("wallPresetSelect");if(!sel)return;const presets=getWallPresets();sel.innerHTML='<option value="">— обрати —</option>'+presets.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(""),sel.value=current&&presets.includes(current)?current:""}function applyWallPreset(){const sel=$("wallPresetSelect"),inp=$("wallEditType");sel&&inp&&sel.value&&(inp.value=sel.value)}function addWallPresetFromInput(){const inp=$("wallEditType"),val=(inp?.value||"").trim();if(!val)return void showToast("Впишіть назву заготовки");const list=getWallPresets();list.includes(val)||list.push(val),setWallPresets(list),renderWallPresetSelect(val),showToast("Заготовку додано")}function setWallColor(color){const el=$("wallEditColor");el&&(el.value=color)}function _sideName(i){return N(i)+N((i+1)%pts.length)}function _sideLenCm(i){const p1=pts[i],p2=pts[(i+1)%pts.length],fallback=Math.hypot((p2?.x||0)-(p1?.x||0),(p2?.y||0)-(p1?.y||0));return Number(lengths[i])||fallback||1}
function _sideArcPts(i){return Array.isArray(arcPoints[i])?arcPoints[i]:[]}
function _isArcSide(i){return"arc"===wallTypes[i]&&_sideArcPts(i).length>0}
function _sideCurveLenCm(i){const chord=_sideLenCm(i),arr=_sideArcPts(i).slice().sort((a,b)=>(+a.d||0)-(+b.d||0));let seq=[{d:0,o:0}];arr.forEach(p=>{const d=Math.max(0,Math.min(chord,+p.d||0));seq.push({d:d,o:+p.o||0})}),seq.push({d:chord,o:0});let total=0;for(let k=1;k<seq.length;k++)total+=Math.hypot(seq[k].d-seq[k-1].d,seq[k].o-seq[k-1].o);return total}
function _sideEffectiveLenCm(i){return _isArcSide(i)?_sideCurveLenCm(i):Number(lengths[i])||_sideLenCm(i)}
function _totalPerimeterCm(){let total=0;for(let i=0;i<pts.length;i++)total+=_sideEffectiveLenCm(i);return total}
function _totalCurveLengthCm(){let total=0;for(let i=0;i<pts.length;i++)_isArcSide(i)&&(total+=_sideCurveLenCm(i));return total}
function _sideArcCanvasPts(i){const a=pts[i],b=pts[(i+1)%pts.length];if(!a||!b)return null;const chordCm=_sideLenCm(i),dx=b.x-a.x,dy=b.y-a.y,pxLen=Math.hypot(dx,dy)||1,ux=dx/pxLen,uy=dy/pxLen,nx=-uy,ny=ux,pxPerCm=pxLen/(chordCm||1),arr=_sideArcPts(i).slice().sort((p,q)=>(+p.d||0)-(+q.d||0));return arr.map(p=>{const d=Math.max(0,Math.min(chordCm,+p.d||0)),o=+p.o||0;return{x:a.x+ux*d*pxPerCm+nx*o*pxPerCm,y:a.y+uy*d*pxPerCm+ny*o*pxPerCm}})}
window.totalCurveLength=function(){return Math.round(_totalCurveLengthCm())/100};
window.getArcSidesCount=function(){let n=0;for(let i=0;i<pts.length;i++)_isArcSide(i)&&n++;return n};function _pointToSegmentDistance(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,c1=vx*(px-ax)+vy*(py-ay),c2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,c1/c2)),x=ax+t*vx,y=ay+t*vy;return{dist:Math.hypot(px-x,py-y),t:t,x:x,y:y}}function findWallSideHit(x,y){if(!closed||!pts.length)return-1;let best={idx:-1,dist:999};for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],d=_pointToSegmentDistance(x,y,a.x,a.y,b.x,b.y);d.dist<best.dist&&(best={idx:i,dist:d.dist})}let threshold=6;try{const r=cv.getBoundingClientRect(),canvasPerCss=((cv.width/(r.width||cv.width||1))+(cv.height/(r.height||cv.height||1)))/2;threshold=(6*canvasPerCss)/(viewScale||1)}catch(_){threshold=6}return best.dist<=threshold?best.idx:-1}function findWallMarkHit(x,y){if(!Array.isArray(wallMarks)||!wallMarks.length||!pts.length)return-1;let best={idx:-1,dist:999};return wallMarks.forEach((m,idx)=>{const i=Number(m.sideIndex);if(!pts[i]||!pts[(i+1)%pts.length])return;const a=pts[i],b=pts[(i+1)%pts.length],sideLen=_sideLenCm(i),lenCm=Number(m.lenCm)||0,offCm=Number(m.offsetCm)||0;if(!sideLen||!lenCm)return;const t1=Math.max(0,Math.min(1,offCm/sideLen)),t2=Math.max(0,Math.min(1,(offCm+lenCm)/sideLen)),x1=a.x+(b.x-a.x)*t1,y1=a.y+(b.y-a.y)*t1,x2=a.x+(b.x-a.x)*t2,y2=a.y+(b.y-a.y)*t2,d=_pointToSegmentDistance(x,y,x1,y1,x2,y2);d.dist<best.dist&&(best={idx:idx,dist:d.dist})}),best.dist<=34?best.idx:-1}function flashWallSide(side){_wallSideFlash=side,draw(),clearTimeout(flashWallSide._t),flashWallSide._t=setTimeout(()=>{_wallSideFlash=-1,draw()},700)}function drawWallSideFlash(targetCtx){if(_wallSideFlash<0||!pts[_wallSideFlash]||!pts[(_wallSideFlash+1)%pts.length])return;const a=pts[_wallSideFlash],b=pts[(_wallSideFlash+1)%pts.length];targetCtx.save(),targetCtx.strokeStyle="#2563eb",targetCtx.lineWidth=8,targetCtx.lineCap="round",targetCtx.globalAlpha=.45,targetCtx.beginPath(),targetCtx.moveTo(a.x,a.y),targetCtx.lineTo(b.x,b.y),targetCtx.stroke(),targetCtx.restore()}function drawConflictZoneHighlight(targetCtx){
  var zi=window._conflictZoneHighlight;
  if(!zi||!zi.sides||!zi.sides.length) return;
  var pulse=.5+.5*Math.sin(Date.now()/280);
  var cx=pts.reduce(function(s,p){return s+p.x},0)/(pts.length||1);
  var cy=pts.reduce(function(s,p){return s+p.y},0)/(pts.length||1);
  var OFFSET=18;
  targetCtx.save();
  targetCtx.lineCap="round";
  zi.sides.forEach(function(i){
    if(!pts[i]||!pts[(i+1)%pts.length]) return;
    var a0=pts[i],b0=pts[(i+1)%pts.length];
    var dx=b0.x-a0.x,dy=b0.y-a0.y,len=Math.hypot(dx,dy)||1;
    var nx=-dy/len,ny=dx/len;
    var mx=(a0.x+b0.x)/2,my=(a0.y+b0.y)/2;
    if((cx-mx)*nx+(cy-my)*ny<0){ nx=-nx; ny=-ny; } // точку розвернути ВСЕРЕДИНУ кімнати, подалі від елементів і розмірних написів на стіні
    var a={x:a0.x+nx*OFFSET,y:a0.y+ny*OFFSET};
    var b={x:b0.x+nx*OFFSET,y:b0.y+ny*OFFSET};
    targetCtx.setLineDash([]);
    targetCtx.globalAlpha=.35+.25*pulse;
    targetCtx.strokeStyle=zi.color;
    targetCtx.lineWidth=9;
    targetCtx.beginPath();targetCtx.moveTo(a.x,a.y);targetCtx.lineTo(b.x,b.y);targetCtx.stroke();
    targetCtx.globalAlpha=1;
    targetCtx.lineWidth=3;
    targetCtx.beginPath();targetCtx.moveTo(a.x,a.y);targetCtx.lineTo(b.x,b.y);targetCtx.stroke();
    targetCtx.globalAlpha=.5;
    targetCtx.lineWidth=1.4;
    targetCtx.setLineDash([3,3]);
    targetCtx.beginPath();targetCtx.moveTo(a0.x,a0.y);targetCtx.lineTo(a.x,a.y);targetCtx.stroke();
    targetCtx.beginPath();targetCtx.moveTo(b0.x,b0.y);targetCtx.lineTo(b.x,b.y);targetCtx.stroke();
    targetCtx.setLineDash([]);
    targetCtx.globalAlpha=1;
  });
  targetCtx.restore();
}

function _autoDiagPolygonSign(){
  var s=0;
  for(var i=0;i<pts.length;i++){
    var a=pts[i],b=pts[(i+1)%pts.length];
    s+=a.x*b.y-b.x*a.y;
  }
  return s>=0?1:-1;
}
function _autoDiagCornerType(i){
  if(!pts.length) return "unknown";
  var n=pts.length;
  var a=pts[(i-1+n)%n],b=pts[i],c=pts[(i+1)%n];
  var cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  return cross*_autoDiagPolygonSign()<0?"inner":"outer";
}
function _autoDiagSideIsSlanted(i){
  var a=pts[i],b=pts[(i+1)%pts.length];
  if(!a||!b) return false;
  var ang=Math.abs(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI)%90;
  ang=Math.min(ang,90-ang);
  return ang>7;
}
function _autoDiagExists(a,b){
  return Array.isArray(diagonals)&&diagonals.some(function(d){
    return Array.isArray(d)&&((d[0]===a&&d[1]===b)||(d[0]===b&&d[1]===a));
  });
}
function _autoDiagPointOnSegment(p,a,b,eps){
  eps=eps||1.5;
  var cross=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x);
  if(Math.abs(cross)>eps*Math.max(1,Math.hypot(b.x-a.x,b.y-a.y))) return false;
  var dot=(p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y);
  if(dot<-eps) return false;
  var len2=(b.x-a.x)*(b.x-a.x)+(b.y-a.y)*(b.y-a.y);
  return dot<=len2+eps;
}
function _autoDiagPointInsideOrBoundary(p){
  try{
    if(pointInPolygon(p,pts)) return true;
  }catch(e){window.__diagSilent&&window.__diagSilent(e)}
  for(var i=0;i<pts.length;i++){
    if(_autoDiagPointOnSegment(p,pts[i],pts[(i+1)%pts.length],1.2)) return true;
  }
  return false;
}
function _autoDiagProperIntersect(a,b,c,d){
  function orient(p,q,r){
    return (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  }
  var o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
  var eps=1e-7;
  return ((o1>eps&&o2<-eps)||(o1<-eps&&o2>eps)) &&
         ((o3>eps&&o4<-eps)||(o3<-eps&&o4>eps));
}
function _autoDiagInside(a,b){
  if(!pts[a]||!pts[b]||a===b) return false;
  var A=pts[a],B=pts[b],n=pts.length;

  /* Не дозволяємо перетинати будь-яку стіну, крім стін у кінцевих точках. */
  for(var i=0;i<n;i++){
    var j=(i+1)%n;
    if(i===a||j===a||i===b||j===b) continue;
    if(_autoDiagProperIntersect(A,B,pts[i],pts[j])) return false;
  }

  /* Головна фізична перевірка:
     уся рулетка між точками повинна лежати всередині кімнати.
     Однієї перевірки середини недостатньо для Г-подібних форм. */
  var samples=Math.max(24,Math.ceil(Math.hypot(B.x-A.x,B.y-A.y)/18));
  for(var s=1;s<samples;s++){
    var t=s/samples;
    var p={x:A.x+(B.x-A.x)*t,y:A.y+(B.y-A.y)*t};
    if(!_autoDiagPointInsideOrBoundary(p)) return false;
  }
  return true;
}
function _autoDiagExpectedCm(a,b){
  try{
    if(Array.isArray(realPts)&&realPts[a]&&realPts[b]){
      var cm=Math.hypot(
        Number(realPts[b].x)-Number(realPts[a].x),
        Number(realPts[b].y)-Number(realPts[a].y)
      );
      if(Number.isFinite(cm)&&cm>0) return cm;
    }
  }catch(_){}

  /* Fallback for old/incomplete states: convert canvas pixels to cm
     from the median px/cm ratio of measured room sides. */
  try{
    if(!pts[a]||!pts[b]) return 0;
    var ratios=[];
    for(var i=0;i<pts.length;i++){
      var j=(i+1)%pts.length;
      var sideCm=Number(lengths&&lengths[i]);
      if(!(sideCm>0)||!pts[i]||!pts[j]) continue;
      var sidePx=Math.hypot(pts[j].x-pts[i].x,pts[j].y-pts[i].y);
      if(sidePx>0) ratios.push(sidePx/sideCm);
    }
    if(!ratios.length) return 0;
    ratios.sort(function(x,y){return x-y;});
    var pxPerCm=ratios[Math.floor(ratios.length/2)];
    var diagPx=Math.hypot(pts[b].x-pts[a].x,pts[b].y-pts[a].y);
    return pxPerCm>0?diagPx/pxPerCm:0;
  }catch(_){return 0;}
}

function _autoDiagHasSuccessfulConfirmation(){
  try{
    if(!Array.isArray(diagonals)||!diagonals.length) return false;
    return diagonals.some(function(d){
      if(!Array.isArray(d)||!pts[d[0]]||!pts[d[1]]) return false;
      var key=N(d[0])+N(d[1]);
      var actual=Number(diagonalOverrides&&diagonalOverrides[key]);
      if(!(actual>0)) return false;
      var expected=_autoDiagExpectedCm(d[0],d[1]);
      if(!(expected>0)) return false;
      return Math.abs(actual-expected)<=2.5;
    });
  }catch(e){return false;}
}
function buildAutoControlDiagonals(){
  if(!closed||!Array.isArray(pts)||pts.length<4) return [];
  /* Одна успішно підтверджена контрольна діагональ завершує перевірку.
     Наступну пропонуємо лише якщо підтверджена має розбіжність понад допуск. */
  if(_autoDiagHasSuccessfulConfirmation()) return [];

  var n=pts.length;
  var inners=[],outers=[],slantVertices={};
  for(var i=0;i<n;i++){
    (_autoDiagCornerType(i)==="inner"?inners:outers).push(i);
    if(_autoDiagSideIsSlanted(i)){
      slantVertices[i]=true;
      slantVertices[(i+1)%n]=true;
    }
  }

  var isConcave=inners.length>0;
  var candidates=[];

  function add(a,b,score,reason,kind){
    if(a===b) return;
    var diff=Math.abs(a-b);
    if(diff===1||diff===n-1) return;
    if(_autoDiagExists(a,b)||!_autoDiagInside(a,b)) return;

    var lenCm=_autoDiagExpectedCm(a,b);
    if(!isFinite(lenCm)||lenCm<45) return;

    var key=Math.min(a,b)+"-"+Math.max(a,b);
    if(candidates.some(function(x){return x.key===key;})) return;

    candidates.push({
      key:key,a:a,b:b,label:N(a)+N(b),length:lenCm,
      score:score+lenCm*.035,reason:reason,kind:kind
    });
  }

  if(isConcave){
    /* Для Г-, П- та інших ввігнутих кімнат:
       випадкові діагоналі між двома зовнішніми кутами заборонені. */
    outers.forEach(function(o){
      inners.forEach(function(inn){
        add(o,inn,120,"зовнішній → внутрішній кут","outer-inner");
      });
    });

    /* Додатково дозволені лише заміри до кінців косої стіни. */
    Object.keys(slantVertices).forEach(function(v){
      v=Number(v);
      outers.forEach(function(o){
        if(o!==v) add(o,v,88,"контроль кінця косої стіни","slant");
      });
      inners.forEach(function(inn){
        if(inn!==v) add(inn,v,82,"внутрішній кут → коса стіна","slant");
      });
    });
  }else{
    /* Ідеальна проста кімната не потребує контрольної діагоналі.
       Для опуклої форми підказка допускається лише за наявності косої стіни. */
    if(Object.keys(slantVertices).length){
      Object.keys(slantVertices).forEach(function(v){
        v=Number(v);
        for(var a=0;a<n;a++){
          if(a!==v) add(a,v,72,"контроль косої стіни","slant");
        }
      });
    }
  }

  candidates.sort(function(x,y){return y.score-x.score;});

  var limit=1;
  var selected=[],usedInner={},usedEndpoints={};

  for(var k=0;k<candidates.length&&selected.length<limit;k++){
    var c=candidates[k];
    var innerEnd=null;

    if(_autoDiagCornerType(c.a)==="inner") innerEnd=c.a;
    if(_autoDiagCornerType(c.b)==="inner") innerEnd=c.b;

    if(innerEnd!==null&&usedInner[innerEnd]&&selected.length>0) continue;

    var repeated=(usedEndpoints[c.a]||0)+(usedEndpoints[c.b]||0);
    if(repeated>=2&&selected.length>0) continue;

    selected.push(c);
    if(innerEnd!==null) usedInner[innerEnd]=true;
    usedEndpoints[c.a]=(usedEndpoints[c.a]||0)+1;
    usedEndpoints[c.b]=(usedEndpoints[c.b]||0)+1;
  }

  return selected;
}
function drawAutoControlDiagonals(targetCtx){
  if(typeof _reportMode!=="undefined"&&_reportMode) return;
  var list=window._autoControlDiagonals;
  if(!closed||!Array.isArray(list)||!list.length) return;
  targetCtx.save();
  targetCtx.lineCap="round";
  list.forEach(function(d){
    if(!pts[d.a]||!pts[d.b]) return;
    var a=pts[d.a],b=pts[d.b];
    var key=d.label;
    var actual=diagonalOverrides&&Number(diagonalOverrides[key]);
    var expected=d.length;
    var diff=actual>0?Math.abs(actual-expected):null;
    var color=actual>0?(diff<=2.5?"#22c55e":"#ef4444"):"#64748b";
    targetCtx.setLineDash(actual>0?[8,5]:[5,6]);
    targetCtx.strokeStyle=color;
    targetCtx.globalAlpha=actual>0?.9:.72;
    targetCtx.lineWidth=actual>0?3:2;
    targetCtx.beginPath();targetCtx.moveTo(a.x,a.y);targetCtx.lineTo(b.x,b.y);targetCtx.stroke();
    targetCtx.setLineDash([]);
    targetCtx.globalAlpha=1;

    var mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    var label=key+" "+Math.round(expected)+" см";
    if(actual>0) label+=" · "+(diff<=2.5?"✓":"Δ "+Math.round(diff)+" см");
    targetCtx.font="bold 11px -apple-system,Arial";
    var w=targetCtx.measureText(label).width+14;
    targetCtx.fillStyle=actual>0?(diff<=2.5?"#ecfdf5":"#fef2f2"):"#f8fafc";
    targetCtx.strokeStyle=color;
    targetCtx.lineWidth=1.2;
    targetCtx.beginPath();
    if(targetCtx.roundRect) targetCtx.roundRect(mx-w/2,my-11,w,22,7); else targetCtx.rect(mx-w/2,my-11,w,22);
    targetCtx.fill();targetCtx.stroke();
    targetCtx.fillStyle=actual>0?(diff<=2.5?"#166534":"#991b1b"):"#334155";
    targetCtx.textAlign="center";targetCtx.textBaseline="middle";
    targetCtx.fillText(label,mx,my+.5);
  });
  targetCtx.restore();
}

function drawRecommendedDiagHighlight(targetCtx){
  var rec=window._recommendedDiagHighlight;
  if(!rec||!pts[rec.a]||!pts[rec.b]) return;
  var a=pts[rec.a],b=pts[rec.b];
  var pulse=.5+.5*Math.sin(Date.now()/280);
  targetCtx.save();
  targetCtx.setLineDash([9,7]);
  targetCtx.strokeStyle="rgba(245,158,11,"+(0.5+0.3*pulse).toFixed(2)+")";
  targetCtx.lineWidth=2.5;
  targetCtx.beginPath();targetCtx.moveTo(a.x,a.y);targetCtx.lineTo(b.x,b.y);targetCtx.stroke();
  targetCtx.setLineDash([]);
  [a,b].forEach(function(p){
    targetCtx.beginPath();targetCtx.arc(p.x,p.y,14+4*pulse,0,2*Math.PI);
    targetCtx.strokeStyle="rgba(245,158,11,"+(0.85-0.35*pulse).toFixed(2)+")";targetCtx.lineWidth=3;targetCtx.stroke();
    targetCtx.beginPath();targetCtx.arc(p.x,p.y,9,0,2*Math.PI);targetCtx.fillStyle="#f59e0b";targetCtx.fill();
  });
  var mx=(a.x+b.x)/2,my=(a.y+b.y)/2,label="📐 Виміряйте "+rec.label;
  targetCtx.font="bold 13px -apple-system,Arial";
  var tw=targetCtx.measureText(label).width,padX=10,boxH=24,bx=mx-tw/2-padX,by=my-boxH/2-2,bw=tw+2*padX,bh=boxH+4;
  targetCtx.beginPath();
  if(targetCtx.roundRect) targetCtx.roundRect(bx,by,bw,bh,10); else targetCtx.rect(bx,by,bw,bh);
  targetCtx.fillStyle="#fffbeb";targetCtx.fill();
  targetCtx.strokeStyle="#f59e0b";targetCtx.lineWidth=1.6;targetCtx.stroke();
  targetCtx.fillStyle="#92400e";targetCtx.textAlign="center";targetCtx.textBaseline="middle";
  targetCtx.fillText(label,mx,my+1);
  targetCtx.textAlign="left";targetCtx.textBaseline="alphabetic";
  targetCtx.restore();
}
function _wallSideEndName(m){return N(((Number(m?.sideIndex)||0)+1)%pts.length)}function _wallSideStartName(m){return N(Number(m?.sideIndex)||0)}function _wallOffsetFromEnd(m){const sideLen=_sideLenCm(Number(m?.sideIndex)||0);return Math.max(0,Math.round(sideLen-(Number(m?.offsetCm)||0)-(Number(m?.lenCm)||0)))}function updateWallAnchorUI(){const m=wallMarks.find(w=>w.id===_wallEditId),anchor=$("wallEditAnchor")?.value||"start",label=$("wallOffsetLabel"),inp=$("wallEditOffset");if(!m||!label||!inp)return;const start=_wallSideStartName(m),end=_wallSideEndName(m);"center"===anchor?(label.textContent="Відступ рахується автоматично",inp.disabled=!0,inp.value=""):"end"===anchor?(label.textContent="Відступ від точки "+end+", см",inp.disabled=!1,inp.value=_wallOffsetFromEnd(m)):(label.textContent="Відступ від точки "+start+", см",inp.disabled=!1,inp.value=Math.round(Number(m.offsetCm)||0))}function setWallAnchor(anchor){const el=$("wallEditAnchor");el&&(el.value=anchor),"center"===anchor&&wallPlaceCenter(),updateWallAnchorUI()}function openWallEditModal(id){_wallEditId=id;const m=wallMarks.find(w=>w.id===id);if(!m)return;const sideName=_sideName(Number(m.sideIndex)||0),sideLen=_sideLenCm(Number(m.sideIndex)||0);$("wallEditSide").textContent=`Сторона ${sideName} · довжина ${Math.round(sideLen)} см`,$("wallEditType").value=m.type||"Ніша карниза",renderWallPresetSelect(m.type||"Ніша карниза"),$("wallEditColor")&&($("wallEditColor").value=m.color||"#f97316"),$("wallEditLen").value=m.lenCm||"",$("wallEditAnchor")&&($("wallEditAnchor").value=m.anchor||"start"),$("wallEditOffset").value=m.offsetCm||0,$("wallEditModal").classList.add("open"),updateWallAnchorUI()}function createWallMarkOnSide(sideIndex){const sideLen=_sideLenCm(sideIndex),len=Math.min(250,Math.max(0,Math.round(sideLen))),offset=Math.max(0,Math.round((sideLen-len)/2)),mark={id:"wall_"+Date.now(),sideIndex:sideIndex,type:"Ніша карниза біла",lenCm:len,offsetCm:offset,anchor:"center",color:"#f97316"};wallMarks.push(mark),draw(),saveState(),openWallEditModal(mark.id)}function saveWallEdit(){const m=wallMarks.find(w=>w.id===_wallEditId);if(!m)return;const sideLen=_sideLenCm(Number(m.sideIndex)||0);m.type=($("wallEditType").value||"Ніша карниза").trim(),m.color=$("wallEditColor")?$("wallEditColor").value:m.color||"#f97316",m.lenCm=Math.max(0,parseFloat($("wallEditLen").value)||0),m.anchor=$("wallEditAnchor")?$("wallEditAnchor").value||"start":m.anchor||"start";const rawOffset=Math.max(0,parseFloat($("wallEditOffset").value)||0);"center"===m.anchor?m.offsetCm=Math.max(0,(sideLen-m.lenCm)/2):"end"===m.anchor?m.offsetCm=Math.max(0,sideLen-m.lenCm-rawOffset):m.offsetCm=rawOffset;const _wasClamped=m.offsetCm+m.lenCm>sideLen;_wasClamped&&(m.offsetCm=Math.max(0,sideLen-m.lenCm)),_wasClamped&&showToast("⚠️ Елемент виходив за межі стіни ("+Math.round(sideLen)+" см) — зсунуто автоматично"),closeModal("wallEditModal"),draw(),saveState()}function wallPlaceCenter(){const m=wallMarks.find(w=>w.id===_wallEditId);if(!m)return;const sideLen=_sideLenCm(Number(m.sideIndex)||0),len=Math.max(0,parseFloat($("wallEditLen").value)||m.lenCm||0);m.lenCm=len,m.offsetCm=Math.max(0,Math.round((sideLen-len)/2)),m.anchor="center",$("wallEditAnchor")&&($("wallEditAnchor").value="center"),$("wallEditOffset").value=""}function deleteWallMarkFromEditor(){const idx=wallMarks.findIndex(w=>w.id===_wallEditId);idx>=0&&wallMarks.splice(idx,1),closeModal("wallEditModal"),draw(),saveState()}function drawWallMarks(targetCtx){Array.isArray(wallMarks)||(wallMarks=[]),wallMarks.length&&pts.length&&(targetCtx.save(),wallMarks.forEach((m,idx)=>{const i=Number(m.sideIndex);if(!pts[i]||!pts[(i+1)%pts.length])return;const a=pts[i],b=pts[(i+1)%pts.length],sideLen=_sideLenCm(i),lenCm=Math.max(0,Number(m.lenCm)||0),offCm=Math.max(0,Number(m.offsetCm)||0);if(!sideLen||!lenCm)return;const mainColor=m.color||"#f97316",t1=Math.max(0,Math.min(1,offCm/sideLen)),t2=Math.max(0,Math.min(1,(offCm+lenCm)/sideLen)),dx=b.x-a.x,dy=b.y-a.y,segPx=Math.hypot(dx,dy)||1;let nx=-dy/segPx,ny=dx/segPx;const cx=pts.reduce((s,p)=>s+p.x,0)/pts.length,cy=pts.reduce((s,p)=>s+p.y,0)/pts.length,mx=a.x+dx*(t1+t2)/2,my=a.y+dy*(t1+t2)/2;(cx-mx)*nx+(cy-my)*ny<0&&(nx=-nx,ny=-ny);const x1=a.x+dx*t1,y1=a.y+dy*t1,x2=a.x+dx*t2,y2=a.y+dy*t2;targetCtx.lineCap="round",targetCtx.strokeStyle=mainColor,targetCtx.lineWidth=7,targetCtx.beginPath(),targetCtx.moveTo(x1,y1),targetCtx.lineTo(x2,y2),targetCtx.stroke(),targetCtx.strokeStyle="rgba(255,255,255,.85)",targetCtx.lineWidth=3,targetCtx.beginPath(),targetCtx.moveTo(x1,y1),targetCtx.lineTo(x2,y2),targetCtx.stroke(),offCm>0&&(targetCtx.strokeStyle=mainColor,targetCtx.globalAlpha=.65,targetCtx.lineWidth=1.6,targetCtx.setLineDash([5,4]),targetCtx.beginPath(),targetCtx.moveTo(a.x+18*nx,a.y+18*ny),targetCtx.lineTo(x1+18*nx,y1+18*ny),targetCtx.stroke(),targetCtx.setLineDash([]),targetCtx.globalAlpha=1,"function"==typeof _drawDimLabel&&_drawDimLabel(targetCtx,Math.round(offCm)+" см",(a.x+x1)/2+30*nx,(a.y+y1)/2+30*ny));const label=(m.type||"Ніша")+" · "+Math.round(lenCm)+" см";targetCtx.font="bold 12px -apple-system,Arial";const tw=targetCtx.measureText(label).width;let lx=mx+34*nx,ly=my+34*ny;try{const cnv=targetCtx.canvas;if(cnv&&cnv.width&&cnv.height){const pad=12,boxW=tw+16,boxH=24;lx=Math.max(pad+boxW/2,Math.min(cnv.width-pad-boxW/2,lx)),ly=Math.max(pad+boxH/2,Math.min(cnv.height-pad-boxH/2,ly))}}catch(__diagE913){window.__diagSilent&&window.__diagSilent(__diagE913)}const isVerticalSide=Math.abs(dy)>1.15*Math.abs(dx);if(targetCtx.fillStyle="rgba(255,247,237,.96)",targetCtx.strokeStyle=mainColor,targetCtx.lineWidth=1.2,targetCtx.textAlign="center",targetCtx.textBaseline="middle",isVerticalSide){let ang=Math.atan2(dy,dx);(ang>Math.PI/2||ang<-Math.PI/2)&&(ang+=Math.PI),targetCtx.save(),targetCtx.translate(lx,ly),targetCtx.rotate(ang),targetCtx.beginPath(),targetCtx.roundRect?targetCtx.roundRect(-tw/2-8,-13,tw+16,24,9):targetCtx.rect(-tw/2-8,-13,tw+16,24),targetCtx.fill(),targetCtx.stroke(),targetCtx.fillStyle="#9a3412",targetCtx.fillText(label,0,0),targetCtx.restore()}else targetCtx.beginPath(),targetCtx.roundRect?targetCtx.roundRect(lx-tw/2-8,ly-13,tw+16,24,9):targetCtx.rect(lx-tw/2-8,ly-13,tw+16,24),targetCtx.fill(),targetCtx.stroke(),targetCtx.fillStyle="#9a3412",targetCtx.fillText(label,lx,ly);targetCtx.textAlign="left",targetCtx.textBaseline="alphabetic"}),targetCtx.restore())}function handleWallTap(x,y){
  if(!closed||circleMode||diagonalMode||lightMode)return false;

  const markHit=findWallMarkHit(x,y);
  if(markHit>=0){
    openWallEditModal(wallMarks[markHit].id);
    return true;
  }

  const side=findWallSideHit(x,y);
  if(side<0)return false;

  flashWallSide(side);

  /* Це саме локальна функція, яку реально викликає handleInputEvent().
     Порожня стіна більше не створює елемент автоматично. */
  if(typeof window.rmWallTapOpenV84==="function"){
    window.rmWallTapOpenV84(side);
    return true;
  }

  /* Резервний прямий запуск нового редактора кривої. */
  if(typeof window.rmCurveOpenV87==="function"){
    window.rmCurveOpenV87(side);
    return true;
  }

  return false;
}function _diagonalsForCurrentDraw(){
  try{
    if(!_reportMode) return Array.isArray(diagonals)?diagonals:[];
    var rs=typeof _loadRS==="function"?_loadRS():(window.reportSettings||{});
    if(rs.diagonals!==true) return [];

    /* У режимі "Всі" діагоналі показуються лише окремим блоком у звіті.
       На план їх не накладаємо, інакше складна кімната стає нечитабельною. */
    if((rs.diagMode||"manual")==="all") return [];

    /* У режимі "Ручні" на плані залишаються тільки підтверджені заміри. */
    return _getReportDiagPairs({
      pts:pts,
      realPts:realPts,
      lengths:lengths,
      diagonals:diagonals,
      diagonalOverrides:diagonalOverrides
    },"manual").map(function(d){return[d.a,d.b];});
  }catch(e){return[];}
}
window._formatReportCm=window._formatReportCm||function(value){
  var n=Number(value);
  if(!isFinite(n)) return "";
  var rounded=Math.round(n*100)/100;
  if(Math.abs(rounded-Math.round(rounded))<0.000001) return String(Math.round(rounded));
  return String(rounded).replace(".",",");
};
var _formatReportCm=window._formatReportCm;
function _hideCanvasServiceLabels(){
  return !_reportMode&&!!window.A·CEILCanvasCleanView;
}
function draw(){if(ctx.clearRect(0,0,cv.width,cv.height),ctx.save(),ctx.translate(viewOffsetX,viewOffsetY),ctx.scale(viewScale,viewScale),_hideCanvasServiceLabels()||drawLightGrid(ctx),circleMode&&circleDiamCm>0){const cx=cv.width/2,cy=cv.height/2,r=.42*Math.min(cv.width,cv.height);return ctx.fillStyle="rgba(0,113,227,0.07)",ctx.beginPath(),ctx.arc(cx,cy,r,0,2*Math.PI),ctx.fill(),ctx.strokeStyle="#1d1d1f",ctx.lineWidth=3,ctx.beginPath(),ctx.arc(cx,cy,r,0,2*Math.PI),ctx.stroke(),ctx.strokeStyle="#ff3b30",ctx.lineWidth=2,ctx.setLineDash([8,6]),ctx.beginPath(),ctx.moveTo(cx-r,cy),ctx.lineTo(cx+r,cy),ctx.stroke(),ctx.setLineDash([]),ctx.fillStyle="#ff3b30",ctx.font="bold 16px Arial",ctx.textAlign="center",ctx.fillText(`⌀ ${circleDiamCm} см`,cx,cy-12),ctx.strokeStyle="#0071e3",ctx.lineWidth=1.5,ctx.setLineDash([5,4]),ctx.beginPath(),ctx.moveTo(cx,cy),ctx.lineTo(cx,cy-r),ctx.stroke(),ctx.setLineDash([]),ctx.fillStyle="#0071e3",ctx.font="14px Arial",ctx.fillText(`r = ${(circleDiamCm/2).toFixed(1)} см`,cx+36,cy-r/2),ctx.fillStyle="#0071e3",ctx.beginPath(),ctx.arc(cx,cy,6,0,2*Math.PI),ctx.fill(),drawWallSideFlash(ctx),_hideCanvasServiceLabels()||(_reportMode&&_loadRS&&!1===_loadRS().showWallMarks||drawWallMarks(ctx),_reportMode&&_loadRS&&!1===_loadRS().showLights||(drawLightBindings(ctx),drawLightMarks(ctx))),ctx.textAlign="left",void ctx.restore()}if(!pts.length)return void ctx.restore();ctx.strokeStyle="#1d1d1f",ctx.lineWidth=3,ctx.beginPath(),ctx.moveTo(pts[0].x,pts[0].y);{const _n=pts.length,_segCount=closed?_n:_n-1;for(let i=0;i<_segCount;i++){const _j=(i+1)%_n;if(_isArcSide(i)){const _ap=_sideArcCanvasPts(i)||[];_ap.forEach(_p=>ctx.lineTo(_p.x,_p.y))}ctx.lineTo(pts[_j].x,pts[_j].y)}}closed&&ctx.closePath(),ctx.stroke(),_hideCanvasServiceLabels()||pts.forEach((p,i)=>{_isArcSide(i)&&(ctx.save(),ctx.strokeStyle="#7c3aed",ctx.lineWidth=1,ctx.setLineDash([4,3]),ctx.beginPath(),ctx.moveTo(p.x,p.y),ctx.lineTo(pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y),ctx.stroke(),ctx.setLineDash([]),(_sideArcCanvasPts(i)||[]).forEach(_p=>{if(_p._control){ctx.fillStyle="#7c3aed",ctx.beginPath(),ctx.arc(_p.x,_p.y,3.5,0,2*Math.PI),ctx.fill()}}),ctx.restore())}),ctx.font="bold 18px Arial",_hideCanvasServiceLabels()||pts.forEach((p,i)=>{if(ctx.fillStyle="#0071e3",ctx.beginPath(),ctx.arc(p.x,p.y,8,0,2*Math.PI),ctx.fill(),notes[i]&&(ctx.font="16px Arial",ctx.fillText("📝",p.x-22,p.y-14)),closed&&pts.length>=3){const prev=pts[(i-1+pts.length)%pts.length],next=pts[(i+1)%pts.length],v1={x:prev.x-p.x,y:prev.y-p.y},v2={x:next.x-p.x,y:next.y-p.y},len1=Math.hypot(v1.x,v1.y),len2=Math.hypot(v2.x,v2.y);if(len1>0&&len2>0){let cosA=(v1.x*v2.x+v1.y*v2.y)/(len1*len2);cosA=Math.max(-1,Math.min(1,cosA));const angle=180*Math.acos(cosA)/Math.PI,diff=Math.abs(angle-90),arcR=Math.min(28,.25*len1,.25*len2),a1=Math.atan2(v1.y,v1.x),a2=Math.atan2(v2.y,v2.x);let arcColor=diff<=1?"#22c55e":diff<=3?"#f59e0b":"#ef4444";ctx.strokeStyle=arcColor,ctx.lineWidth=2.5,ctx.beginPath();let startA=a1,endA=a2,delta=endA-startA;for(;delta<0;)delta+=2*Math.PI;if(delta>Math.PI){let tmp=startA;startA=endA,endA=tmp,delta=2*Math.PI-delta}if(ctx.arc(p.x,p.y,arcR,startA,endA),ctx.stroke(),diff<=1){const sq=10,u1={x:v1.x/len1,y:v1.y/len1},u2={x:v2.x/len2,y:v2.y/len2};ctx.strokeStyle="#22c55e",ctx.lineWidth=2,ctx.beginPath(),ctx.moveTo(p.x+u1.x*sq,p.y+u1.y*sq),ctx.lineTo(p.x+u1.x*sq+u2.x*sq,p.y+u1.y*sq+u2.y*sq),ctx.lineTo(p.x+u2.x*sq,p.y+u2.y*sq),ctx.stroke()}else{const bisX=v1.x/len1+v2.x/len2,bisY=v1.y/len1+v2.y/len2,bisLen=Math.hypot(bisX,bisY)||1,labelDist=arcR+22,lx=p.x+bisX/bisLen*labelDist,ly=p.y+bisY/bisLen*labelDist,label=angle.toFixed(1)+"°";ctx.font="bold 12px Arial";const tw=ctx.measureText(label).width,pad=4;ctx.fillStyle=diff<=3?"#fef3c7":"#fee2e2",ctx.beginPath(),ctx.roundRect(lx-tw/2-pad,ly-9,tw+2*pad,18,5),ctx.fill(),ctx.strokeStyle=diff<=3?"#f59e0b":"#ef4444",ctx.lineWidth=1.5,ctx.stroke(),ctx.fillStyle=diff<=3?"#92400e":"#991b1b",ctx.textAlign="center",ctx.fillText(label,lx,ly+4),ctx.textAlign="left"}}}}),!_hideCanvasServiceLabels()&&null!==selectedPoint&&pts[selectedPoint]&&(ctx.fillStyle="#34c759",ctx.beginPath(),ctx.arc(pts[selectedPoint].x,pts[selectedPoint].y,12,0,2*Math.PI),ctx.fill()),ctx.fillStyle="#515154",ctx.font="15px Arial";const _rmCx=pts.reduce((s,p)=>s+p.x,0)/(pts.length||1),_rmCy=pts.reduce((s,p)=>s+p.y,0)/(pts.length||1);for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length;if(lengths[i]&&!_reportMode&&!_hideCanvasServiceLabels()){const mx=(pts[i].x+pts[j].x)/2,my=(pts[i].y+pts[j].y)/2,dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;(_rmCx-mx)*nx+(_rmCy-my)*ny>0&&(nx=-nx,ny=-ny);const TICK=18,LBL=36;ctx.strokeStyle="#94a3b8",ctx.lineWidth=1,ctx.beginPath(),ctx.moveTo(pts[i].x,pts[i].y),ctx.lineTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.moveTo(pts[j].x,pts[j].y),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke(),ctx.beginPath(),ctx.moveTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke();const lx=mx+nx*LBL,ly=my+ny*LBL,dimText=_isArcSide(i)?"〜"+Math.round(_sideCurveLenCm(i))+" см":lengths[i]+" см";ctx.save(),ctx.font="bold 14px Arial";const tw=ctx.measureText(dimText).width,padX=8,boxH=20,bx=lx-tw/2-padX,by=ly-boxH/2-2,bw=tw+2*padX,bh=boxH+4;ctx.beginPath(),ctx.roundRect?ctx.roundRect(bx,by,bw,bh,7):ctx.rect(bx,by,bw,bh),ctx.fillStyle="rgba(255,255,255,.94)",ctx.fill(),ctx.strokeStyle="rgba(51,65,85,.30)",ctx.lineWidth=1,ctx.stroke(),ctx.fillStyle="#334155",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(dimText,lx,ly+.5),ctx.restore()}else if(lengths[i]&&_reportMode&&(()=>{const r="function"==typeof _loadRS?_loadRS():window.reportSettings||{};
const e=document.getElementById("rs_overall");return!0===(e?e.checked:r.overall)&&!0===r.dimensions
})()){const mx=(pts[i].x+pts[j].x)/2,my=(pts[i].y+pts[j].y)/2,dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;(_rmCx-mx)*nx+(_rmCy-my)*ny>0&&(nx=-nx,ny=-ny);const TICK=16,LBL=34;ctx.save(),ctx.strokeStyle="rgba(37,99,235,.55)",ctx.lineWidth=1.3,ctx.beginPath(),ctx.moveTo(pts[i].x,pts[i].y),ctx.lineTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.moveTo(pts[j].x,pts[j].y),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke(),ctx.beginPath(),ctx.moveTo(pts[i].x+nx*TICK,pts[i].y+ny*TICK),ctx.lineTo(pts[j].x+nx*TICK,pts[j].y+ny*TICK),ctx.stroke();const lx=mx+nx*LBL,ly=my+ny*LBL,dimText=_isArcSide(i)?"〜"+Math.round(_sideCurveLenCm(i))+" см":lengths[i]+" см";ctx.font="bold 15px Arial";const tw=ctx.measureText(dimText).width,padX=9,boxH=22,bx=lx-tw/2-padX,by=ly-boxH/2-2,bw=tw+2*padX,bh=boxH+4;ctx.beginPath(),ctx.roundRect?ctx.roundRect(bx,by,bw,bh,7):ctx.rect(bx,by,bw,bh),ctx.fillStyle="rgba(255,255,255,.97)",ctx.fill(),ctx.strokeStyle="rgba(37,99,235,.45)",ctx.lineWidth=1,ctx.stroke(),ctx.fillStyle="#1d4ed8",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(dimText,lx,ly+.5),ctx.restore()}}(_hideCanvasServiceLabels()?[]:_diagonalsForCurrentDraw()).forEach(d=>{const _confirmedKey=N(d[0])+N(d[1]);if(_reportMode&&!(Number(diagonalOverrides[_confirmedKey])>0))return;if(!pts[d[0]]||!pts[d[1]])return;const x1=pts[d[0]].x,y1=pts[d[0]].y,x2=pts[d[1]].x,y2=pts[d[1]].y,dx=x2-x1,dy=y2-y1,dist=Math.hypot(dx,dy)||1,nx=-dy/dist,ny=dx/dist,mx=(x1+x2)/2,my=(y1+y2)/2;function drawArrow(fromX,fromY,toX,toY){const ax=toX-fromX,ay=toY-fromY,al=Math.hypot(ax,ay)||1,bx=ax/al,by=ay/al;ctx.beginPath(),ctx.moveTo(toX,toY),ctx.lineTo(toX-11*bx-11*by*.5,toY-11*by+11*bx*.5),ctx.lineTo(toX-11*bx+11*by*.5,toY-11*by-11*bx*.5),ctx.closePath(),ctx.fillStyle="#dc2626",ctx.fill()}ctx.save(),ctx.strokeStyle="#dc2626",ctx.lineWidth=2.2,ctx.setLineDash([10,6]),ctx.beginPath(),ctx.moveTo(x1,y1),ctx.lineTo(x2,y2),ctx.stroke(),ctx.setLineDash([]),drawArrow(x2,y2,x1,y1),drawArrow(x1,y1,x2,y2),ctx.strokeStyle="#dc2626",ctx.lineWidth=2,[[x1,y1],[x2,y2]].forEach(([px,py])=>{ctx.beginPath(),ctx.moveTo(px+10*nx,py+10*ny),ctx.lineTo(px-10*nx,py-10*ny),ctx.stroke()});const overrideKey=N(d[0])+N(d[1]);let len=0;len=realPts.length&&realPts[d[0]]&&realPts[d[1]]?Math.hypot(realPts[d[1]].x-realPts[d[0]].x,realPts[d[1]].y-realPts[d[0]].y):dist;const _reportPair=_reportMode?_getReportDiagPairs({
  pts:pts,realPts:realPts,lengths:lengths,diagonals:[d],diagonalOverrides:diagonalOverrides
},((typeof _loadRS==="function"?_loadRS():window.reportSettings||{}).diagMode||"manual")).find(function(p){return p.a===Math.min(d[0],d[1])&&p.b===Math.max(d[0],d[1]);}):null,displayLen=_reportPair&&_reportPair.value>0?_reportPair.value:(null!=diagonalOverrides[overrideKey]?diagonalOverrides[overrideKey]:len),cm=Math.round(displayLen),m=(displayLen/100).toFixed(2),label=`${N(d[0])}${N(d[1])}: ${cm} см`,label2=`(${m} м)`;ctx.font="bold 13px -apple-system,Arial";const w1=ctx.measureText(label).width;ctx.font="12px -apple-system,Arial";const w2=ctx.measureText(label2).width,badgeW=Math.max(w1,w2)+22,bx=mx+34*nx-badgeW/2,by=my+34*ny-19;ctx.shadowColor="rgba(0,0,0,0.18)",ctx.shadowBlur=8,ctx.shadowOffsetY=3,ctx.beginPath(),ctx.moveTo(bx+10,by),ctx.lineTo(bx+badgeW-10,by),ctx.quadraticCurveTo(bx+badgeW,by,bx+badgeW,by+10),ctx.lineTo(bx+badgeW,by+38-10),ctx.quadraticCurveTo(bx+badgeW,by+38,bx+badgeW-10,by+38),ctx.lineTo(bx+10,by+38),ctx.quadraticCurveTo(bx,by+38,bx,by+38-10),ctx.lineTo(bx,by+10),ctx.quadraticCurveTo(bx,by,bx+10,by),ctx.closePath();const grad=ctx.createLinearGradient(bx,by,bx,by+38);grad.addColorStop(0,"#fff1f1"),grad.addColorStop(1,"#ffe0e0"),ctx.fillStyle=grad,ctx.fill(),ctx.shadowColor="transparent",ctx.shadowBlur=0,ctx.shadowOffsetY=0,ctx.strokeStyle="#ef4444",ctx.lineWidth=1.5,ctx.stroke(),ctx.fillStyle="#991b1b",ctx.font="bold 13px -apple-system,Arial",ctx.textAlign="center",ctx.fillText(label,bx+badgeW/2,by+15),ctx.fillStyle="#b91c1c",ctx.font="12px -apple-system,Arial",ctx.fillText(label2,bx+badgeW/2,by+29),ctx.textAlign="left",ctx.restore()}),_hideCanvasServiceLabels()||(drawAutoControlDiagonals(ctx),drawConflictZoneHighlight(ctx),drawRecommendedDiagHighlight(ctx)),drawWallSideFlash(ctx),_hideCanvasServiceLabels()||(_reportMode&&_loadRS&&!1===_loadRS().showWallMarks||drawWallMarks(ctx),_reportMode&&_loadRS&&!1===_loadRS().showLights||(drawLightBindings(ctx),drawLightMarks(ctx))),_hideCanvasServiceLabels()||(ctx.save(),ctx.font="bold 22px Arial",ctx.textAlign="center",ctx.textBaseline="middle",pts.forEach((p,i)=>{const t=N(i),lx=p.x+14,ly=p.y-14,w=ctx.measureText(t).width+10;ctx.fillStyle="rgba(255,255,255,.96)",ctx.beginPath(),ctx.roundRect?ctx.roundRect(lx-w/2,ly-13,w,26,5):ctx.rect(lx-w/2,ly-13,w,26),ctx.fill(),ctx.fillStyle="#111827",ctx.fillText(t,lx,ly+.5)}),ctx.restore()),ctx.restore()}function getCanvasPoint(clientX,clientY){const r=cv.getBoundingClientRect(),scaleX=cv.width/r.width,scaleY=cv.height/r.height;return{x:((clientX-r.left)*scaleX-viewOffsetX)/viewScale,y:((clientY-r.top)*scaleY-viewOffsetY)/viewScale}}
function findWallSideHitTouch(clientX,clientY){
  if(!closed||!pts.length)return-1;
  const r=cv.getBoundingClientRect();
  const p=getCanvasPoint(clientX,clientY);
  const canvasPerCss=((cv.width/(r.width||cv.width||1))+(cv.height/(r.height||cv.height||1)))/2;
  const threshold=(6*canvasPerCss)/(viewScale||1);
  let best={idx:-1,dist:Infinity};
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    const d=_pointToSegmentDistance(p.x,p.y,a.x,a.y,b.x,b.y);
    if(d.dist<best.dist)best={idx:i,dist:d.dist};
  }
  return best.dist<=threshold?best.idx:-1;
}

/* v3.49 — wall tap means the visible wall stroke, not "nearest wall". */
function A·CEILTrueWallHitV349(clientX,clientY){
  try{
    if(!cv||!closed||!Array.isArray(pts)||pts.length<2)return false;
    const r=cv.getBoundingClientRect(), sc=(viewScale||1);
    const sx=r.width/(cv.width||1), sy=r.height/(cv.height||1);
    const ox=viewOffsetX||0, oy=viewOffsetY||0;
    function screen(p){return{x:r.left+(p.x*sc+ox)*sx,y:r.top+(p.y*sc+oy)*sy}}
    function distance(px,py,a,b){
      const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,vv=vx*vx+vy*vy;
      if(vv<1e-9)return Math.hypot(px-a.x,py-a.y);
      const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv));
      return Math.hypot(px-(a.x+t*vx),py-(a.y+t*vy));
    }
    for(let i=0;i<pts.length;i++){
      const a=screen(pts[i]),b=screen(pts[(i+1)%pts.length]);
      if(distance(clientX,clientY,a,b)<=4)return true;
    }
  }catch(_){}
  return false;
}
function A·CEILHandleWallTouchV90(clientX,clientY){
if(!A·CEILTrueWallHitV349(clientX,clientY))return false;
  if(!closed||circleMode||diagonalMode||lightMode)return false;
  const p=getCanvasPoint(clientX,clientY);

  /* LIGHT PRIORITY v3.45: a fixture may visually overlap the wall tap zone.
     In that case the light owns the gesture; let handleInputEvent/handleLightTap process it. */
  if((typeof findLightHitTouch==="function"&&findLightHitTouch(clientX,clientY)>=0)||
     (typeof findLightHit==="function"&&findLightHit(p.x,p.y)>=0))return false;

  const markHit=findWallMarkHit(p.x,p.y);
  if(markHit>=0){
    openWallEditModal(wallMarks[markHit].id);
    return true;
  }

  const side=findWallSideHitTouch(clientX,clientY);
  if(side<0)return false;

  flashWallSide(side);
  window.__A·CEILSelectedSideV89=side;
   if(typeof window.rmWallTapOpenV84==="function"){
     window.rmWallTapOpenV84(side);
     return true;
   }

  const menu=document.getElementById("rmWallTapMenuV84");
  if(!menu)return false;

  const title=document.getElementById("rmWallTapTitleV84");
  const sub=document.getElementById("rmWallTapSubV84");
  const curveLabel=document.getElementById("rmWallTapCurveLabelV84");
  if(title)title.textContent="Стіна "+N(side)+N((side+1)%pts.length);
  if(sub)sub.textContent="Довжина "+(typeof window._formatReportCm==="function"?window._formatReportCm(_sideLenCm(side)):String(Math.round(_sideLenCm(side)*100)/100).replace(".",","))+" см · оберіть дію";
  if(curveLabel)curveLabel.textContent=_isArcSide(side)?"Редагувати криволінійну ділянку":"Криволінійна ділянка";

  menu.classList.add("open");
  menu.setAttribute("aria-hidden","false");
  return true;
}let _drawRafPending=!1;function requestDraw(){_drawRafPending||(_drawRafPending=!0,(window.requestAnimationFrame||(cb=>setTimeout(cb,16)))(()=>{_drawRafPending=!1,draw()}))}function A·CEILHandleWallTapV89(x,y){
  if(!closed||circleMode||diagonalMode||lightMode)return false;

  /* LIGHT PRIORITY v3.45: never open the wall menu through a visible light mark. */
  if(typeof findLightHit==="function"&&findLightHit(x,y)>=0)return false;

  const markHit=findWallMarkHit(x,y);
  if(markHit>=0){
    openWallEditModal(wallMarks[markHit].id);
    return true;
  }

  const side=findWallSideHit(x,y);
  if(side<0)return false;
  flashWallSide(side);
  window.__A·CEILSelectedSideV89=side;
   if(typeof window.rmWallTapOpenV84==="function"){
     window.rmWallTapOpenV84(side);
     return true;
   }

  const menu=document.getElementById("rmWallTapMenuV84");
  if(!menu)return false;

  const title=document.getElementById("rmWallTapTitleV84");
  const sub=document.getElementById("rmWallTapSubV84");
  const curveLabel=document.getElementById("rmWallTapCurveLabelV84");
  if(title)title.textContent="Стіна "+N(side)+N((side+1)%pts.length);
  if(sub)sub.textContent="Довжина "+(typeof window._formatReportCm==="function"?window._formatReportCm(_sideLenCm(side)):String(Math.round(_sideLenCm(side)*100)/100).replace(".",","))+" см · оберіть дію";
  if(curveLabel)curveLabel.textContent=_isArcSide(side)?"Редагувати криволінійну ділянку":"Криволінійна ділянка";

  menu.classList.add("open");
  menu.setAttribute("aria-hidden","false");
  return true;
}
function handleInputEvent(clientX,clientY){const point=getCanvasPoint(clientX,clientY);let x=point.x,y=point.y;if(!handleLightTap(x,y)&&!A·CEILHandleWallTapV89(x,y)){if(closed&&diagonalMode){let hit=-1;if(pts.forEach((p,i)=>{Math.hypot(x-p.x,y-p.y)<30&&(hit=i)}),hit>=0){if(null===selectedPoint)selectedPoint=hit;else{if(selectedPoint!==hit){const n=pts.length,diff=Math.abs(selectedPoint-hit);if(1!==diff&&diff!==n-1){const a=Math.min(selectedPoint,hit),b=Math.max(selectedPoint,hit),idx=diagonals.findIndex(d=>Math.min(d[0],d[1])===a&&Math.max(d[0],d[1])===b);if(idx>=0)diagonals.splice(idx,1);else{diagonals.push([selectedPoint,hit]);const key=N(a)+N(b);let currentLen=Math.hypot(pts[b].x-pts[a].x,pts[b].y-pts[a].y);realPts.length&&realPts[a]&&realPts[b]&&(currentLen=Math.hypot(realPts[b].x-realPts[a].x,realPts[b].y-realPts[a].y)),setTimeout(()=>editDiagonal(key,Math.round(currentLen)),80)}}}selectedPoint=null,updateDiagList()}requestDraw()}return}if(!closed&&!circleMode){if(pts.length>=3){const dx=x-pts[0].x,dy=y-pts[0].y;if(Math.hypot(dx,dy)<25)return closeShape(),void saveState()}if(pts.length){const p=pts[pts.length-1];let dx=x-p.x,dy=y-p.y,angle=Math.atan2(Math.abs(dy),Math.abs(dx))*(180/Math.PI);if(angle<22.5)y=p.y;else if(angle>67.5)x=p.x;else{let dist=Math.min(Math.abs(dx),Math.abs(dy));x=p.x+Math.sign(dx)*dist,y=p.y+Math.sign(dy)*dist}}pts.push({x:x,y:y}),updateCornerCount(),requestDraw(),updateChecks(),saveState()}}}window.requestDraw=requestDraw,cv.addEventListener("click",e=>handleInputEvent(e.clientX,e.clientY)),cv.addEventListener("mousedown",e=>{if(!lightMode)return;const p=getCanvasPoint(e.clientX,e.clientY),hit=findLightHit(p.x,p.y);hit>=0&&(_lightDragIndex=hit,_lightDragging=!1,selectedLightId=lightMarks[hit].id||null,requestDraw())}),window.addEventListener("mousemove",e=>{if(!lightMode||_lightDragIndex<0)return;const p=getCanvasPoint(e.clientX,e.clientY);_lightDragging=!0,moveLightMark(_lightDragIndex,p.x,p.y,!1)}),window.addEventListener("mouseup",e=>{if(lightMode&&!(_lightDragIndex<0)){if(_lightDragging){const m=lightMarks[_lightDragIndex];m&&moveLightMark(_lightDragIndex,m.x,m.y,!0),syncLightMarksToElems(),saveState(),_lightSuppressClick=!0}_lightDragIndex=-1,_lightDragging=!1}});let longPressTimer=null,longPressFired=!1,
    _wallTouchTapPending=null,
    _wallTouchTapMoved=!1;function closeShape(){if(pts.length<3||closed)return;closed=!0,autoOpenDimensionsAfterClose();let h="<table><thead><tr><th>Стор.</th><th>см</th></tr></thead><tbody>";for(let i=0;i<pts.length;i++){let j=(i+1)%pts.length;h+=`<tr><td style="font-weight:bold;">${N(i)}${N(j)}</td><td><input type="number" inputmode="decimal" data-i="${i}" placeholder="0" oninput="checkMark(this); saveLen(this)" onkeydown="nextInput(event,this)"></td></tr>`}h+="</tbody></table>",document.getElementById("tbl").innerHTML=h,setTimeout(()=>{const f=document.querySelector('input[data-i="0"]');f&&(f.focus(),f.select())},100),updateCornerCount(),updateChecks(),requestDraw()}function checkMark(el){""!==el.value.trim()&&+el.value>0?el.classList.add("filled"):el.classList.remove("filled")}function nextInput(event,el){if("Enter"!==event.key)return;event.preventDefault();const inputs=[...document.querySelectorAll("input[data-i]")],index=inputs.indexOf(el);index<inputs.length-1?(inputs[index+1].focus(),inputs[index+1].select()):document.activeElement.blur()}function saveLen(el){lengths[+el.dataset.i]=+el.value||0;let per=_totalPerimeterCm();document.getElementById("per").textContent=(per/100).toFixed(2),draw(),updateChecks(),saveState()}function updateCornerCount(){let total=pts.length;if(total<3)return document.getElementById("inCorners").textContent="0",void(document.getElementById("outCorners").textContent="0");let signedArea=0;for(let i=0;i<total;i++){let j=(i+1)%total;signedArea+=pts[i].x*pts[j].y-pts[j].x*pts[i].y}let isClockwise=signedArea>0,internalCount=0,externalCount=0;for(let i=0;i<total;i++){let prev=pts[(i-1+total)%total],curr=pts[i],next=pts[(i+1)%total],cross=(curr.x-prev.x)*(next.y-curr.y)-(curr.y-prev.y)*(next.x-curr.x);0!==cross&&(cross>0&&isClockwise||cross<0&&!isClockwise?internalCount++:externalCount++)}document.getElementById("inCorners").textContent=internalCount,document.getElementById("outCorners").textContent=externalCount}function rebuild(){if(!closed||pts.length<3||circleMode)return;realPts=[{x:0,y:0}];for(let i=0;i<pts.length-1;i++){let p={...realPts[realPts.length-1]},len=+lengths[i]||0,dx=pts[i+1].x-pts[i].x,dy=pts[i+1].y-pts[i].y,dist=Math.hypot(dx,dy)||1;p.x+=dx/dist*len,p.y+=dy/dist*len,realPts.push(p)}let area=0;for(let i=0;i<realPts.length;i++){let j=(i+1)%realPts.length;area+=realPts[i].x*realPts[j].y-realPts[j].x*realPts[i].y}if(area=Math.abs(area)/2,document.getElementById("area").textContent=(area/1e4).toFixed(2),3===pts.length){const a=+lengths[0]||0,b=+lengths[1]||0,c=+lengths[2]||0;if(a>0&&b>0&&c>0){const s=(a+b+c)/2,heronArea=Math.sqrt(s*(s-a)*(s-b)*(s-c));!isNaN(heronArea)&&heronArea>0&&(document.getElementById("area").textContent=(heronArea/1e4).toFixed(2)),document.getElementById("per").textContent=(_totalPerimeterCm()/100).toFixed(2)}}let xs=realPts.map(p=>p.x),ys=realPts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min(580/Math.max(1,maxX-minX),580/Math.max(1,maxY-minY));pts=realPts.map(p=>({x:(p.x-minX)*scale+85,y:(p.y-minY)*scale+85})),updateDiagList(),updateChecks(),draw()}function toggleDiag(){!closed||pts.length<3?showToast("Спочатку замкніть контур"):(diagonalMode=!diagonalMode,selectedPoint=null,$("diagBtn").classList.toggle("active",diagonalMode),diagonalMode&&(document.getElementById("diagList").innerHTML='<div style="padding:8px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;color:#5b21b6;font-weight:700">Натисніть першу вершину, потім другу. Після вибору відкриється поле для введення діагоналі.</div>'+(diagonals.length?'<div style="height:6px"></div>':""),updateDiagList()),draw())}let _pendingDiagPair=null;function editDiagonal(key,currentValue,a,b){const current=null!=diagonalOverrides[key]?diagonalOverrides[key]:currentValue;_pendingDiagPair=Number.isInteger(a)&&Number.isInteger(b)?[a,b]:null;document.getElementById("diagEditKey").value=key,document.getElementById("diagEditInput").value=Math.round(Number(current)||0),document.getElementById("diagEditLabel").textContent=`Розраховано автоматично: ${Math.round(Number(currentValue)||0)} см. За потреби відредагуйте`,document.getElementById("diagEditModal").classList.add("open"),setTimeout(()=>{document.getElementById("diagEditInput").focus(),document.getElementById("diagEditInput").select()},100)}function applyDiagEdit(){const key=document.getElementById("diagEditKey").value,n=parseFloat(document.getElementById("diagEditInput").value);if(!isNaN(n)&&n>0){if(_pendingDiagPair){const a=_pendingDiagPair[0],b=_pendingDiagPair[1],exists=diagonals.some(d=>d[0]===a&&d[1]===b||d[0]===b&&d[1]===a);exists||diagonals.push([a,b])}diagonalOverrides[key]=n,_pendingDiagPair=null,updateDiagList(),updateChecks(),draw(),saveState(),setTimeout(()=>{try{window.A·CEILMeasureConfidence&&typeof window.A·CEILMeasureConfidence.notify==="function"&&window.A·CEILMeasureConfidence.notify(true)}catch(e){window.__diagSilent&&window.__diagSilent(e)}},200)}closeModal("diagEditModal")}function updateDiagList(){let out="";diagonals.forEach(d=>{let len=0;len=realPts.length&&realPts[d[0]]&&realPts[d[1]]?Math.hypot(realPts[d[1]].x-realPts[d[0]].x,realPts[d[1]].y-realPts[d[0]].y):Math.hypot(pts[d[1]].x-pts[d[0]].x,pts[d[1]].y-pts[d[0]].y);const key=N(d[0])+N(d[1]),rawVal=null!=diagonalOverrides[key]?diagonalOverrides[key]:len,showValCm=parseFloat(rawVal).toFixed(0),showValM=(parseFloat(rawVal)/100).toFixed(2);out+=`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700">📐 ${key} — ${showValCm} см (${showValM} м)</span><button type="button" onclick="editDiagonal('${key}',${len.toFixed(0)})">✏️</button></div>`}),circleMode||(document.getElementById("diagList").innerHTML=out||"немає")}function _diagName(a,b){return N(Math.min(a,b))+N(Math.max(a,b))}function _diagSegmentsIntersect(a,b,c,d){function ccw(p1,p2,p3){return(p3.y-p1.y)*(p2.x-p1.x)>(p2.y-p1.y)*(p3.x-p1.x)}return ccw(a,c,d)!==ccw(b,c,d)&&ccw(a,b,c)!==ccw(a,b,d)}function _diagPointInPolygon(pt,poly){return A·CEILUtils.pointInPolygon(pt,poly)}function _isValidInnerDiagForData(i,j,poly){if(!poly||poly.length<3||!poly[i]||!poly[j])return!1;const diff=Math.abs(i-j);if(1===diff||diff===poly.length-1)return!1;const a=poly[i],b=poly[j];for(let k=0;k<poly.length;k++){const l=(k+1)%poly.length;if(k!==i&&k!==j&&l!==i&&l!==j&&_diagSegmentsIntersect(a,b,poly[k],poly[l]))return!1}return _diagPointInPolygon({x:(a.x+b.x)/2,y:(a.y+b.y)/2},poly)}function _diagLengthForData(a,b,data){const rp=data.realPts||[],pp=data.pts||[];return rp[a]&&rp[b]?Math.hypot(rp[b].x-rp[a].x,rp[b].y-rp[a].y):pp[a]&&pp[b]?Math.hypot(pp[b].x-pp[a].x,pp[b].y-pp[a].y):0}function _reportDiagOverrideValue(overrides,a,b){
  overrides=overrides||{};
  var direct=N(a)+N(b),reverse=N(b)+N(a),sorted=_diagName(a,b);
  var raw=overrides[direct];
  if(!(Number(raw)>0)) raw=overrides[reverse];
  if(!(Number(raw)>0)) raw=overrides[sorted];
  return Number(raw)>0?Number(raw):0;
}
function _getReportDiagPairs(data,mode){
  data=data||{};
  var poly=Array.isArray(data.pts)?data.pts:[],
      real=Array.isArray(data.realPts)?data.realPts:[],
      overrides=data.diagonalOverrides||{},
      pairs=[];

  function calculatedValue(a,b){
    var override=_reportDiagOverrideValue(overrides,a,b);
    if(override>0) return override;
    if(real[a]&&real[b]){
      var rv=Math.hypot(
        Number(real[b].x||0)-Number(real[a].x||0),
        Number(real[b].y||0)-Number(real[a].y||0)
      );
      if(rv>0) return rv;
    }
    return 0;
  }

  function add(a,b,allowCalculated){
    a=Number(a);b=Number(b);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||!poly[a]||!poly[b]) return;
    var x=Math.min(a,b),y=Math.max(a,b),key=x+'-'+y;
    if(pairs.some(function(p){return p.key===key;})) return;
    var value=calculatedValue(x,y);
    if(!(value>0)&&allowCalculated){
      /* Last-resort scale from a known side when realPts are absent. */
      var px=Math.hypot(poly[y].x-poly[x].x,poly[y].y-poly[x].y);
      var scale=0;
      if(Array.isArray(data.lengths)){
        for(var s=0;s<poly.length;s++){
          var n=(s+1)%poly.length,cm=Number(data.lengths[s]);
          if(cm>0&&poly[s]&&poly[n]){
            var sidePx=Math.hypot(poly[n].x-poly[s].x,poly[n].y-poly[s].y);
            if(sidePx>0){scale=cm/sidePx;break;}
          }
        }
      }
      if(px>0&&scale>0) value=px*scale;
    }
    if(!(value>0)) return;
    pairs.push({key:key,a:x,b:y,value:value});
  }

  if(mode==='all'){
    /* Усі можливі — усі внутрішні діагоналі, що не проходять крізь стіни
       та не виходять за межі контуру. */
    for(var i=0;i<poly.length;i++){
      for(var j=i+1;j<poly.length;j++){
        var diff=Math.abs(i-j);
        if(diff===1||diff===poly.length-1) continue;
        if(_isValidInnerDiagForData(i,j,poly)) add(i,j,true);
      }
    }
    return pairs;
  }

  /* Ручні — лише реально підтверджені користувачем. */
  (data.diagonals||[]).forEach(function(d){
    if(Array.isArray(d)&&d.length>=2&&_reportDiagOverrideValue(overrides,d[0],d[1])>0){
      add(d[0],d[1],false);
    }
  });

  /* Сумісність зі старими проєктами: значення могло лишитися лише в overrides. */
  for(var a=0;a<poly.length;a++){
    for(var b=a+1;b<poly.length;b++){
      if(_reportDiagOverrideValue(overrides,a,b)>0&&_isValidInnerDiagForData(a,b,poly)){
        add(a,b,false);
      }
    }
  }
  return pairs;
}
function _getReportDiagLines(data,mode){
  return _getReportDiagPairs(data,mode).map(function(d){
    var key=N(d.a)+N(d.b),len=d.value;
    return key+' — '+window._formatReportCm(len)+' см ('+(len/100).toFixed(2)+' м)';
  });
}
function getCurrentReportDiagLines(mode){return circleMode?[]:_getReportDiagLines({pts:pts,realPts:realPts,lengths:lengths,diagonals:diagonals,diagonalOverrides:diagonalOverrides},mode||"manual")}function touchDistance(t1,t2){return Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY)}function resetZoom(){viewScale=1,viewOffsetX=0,viewOffsetY=0,draw()}function segmentsIntersect(a,b,c,d){function ccw(p1,p2,p3){return(p3.y-p1.y)*(p2.x-p1.x)>(p2.y-p1.y)*(p3.x-p1.x)}return ccw(a,c,d)!=ccw(b,c,d)&&ccw(a,b,c)!=ccw(a,b,d)}function pointInPolygon(pt,poly){return A·CEILUtils.pointInPolygon(pt,poly)}function isValidInnerDiagonal(i,j){const a=pts[i],b=pts[j];for(let k=0;k<pts.length;k++){const l=(k+1)%pts.length;if(k!==i&&k!==j&&l!==i&&l!==j&&segmentsIntersect(a,b,pts[k],pts[l]))return!1}return pointInPolygon({x:(a.x+b.x)/2,y:(a.y+b.y)/2},pts)}function autoDiagonals(){if(!closed)return;let h="";for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const diff=Math.abs(i-j);if(1===diff||diff===pts.length-1)continue;if(!isValidInnerDiagonal(i,j))continue;const a=N(i),b=N(j);h+=`<label style="display:block;margin:8px 0"><input type="checkbox" ${diagonals.some(d=>d[0]===i&&d[1]===j||d[0]===j&&d[1]===i)?"checked":""}\nonchange="toggleDiagPair(${i},${j},this.checked)">\n${a}${b}\n</label>`}document.getElementById("diagSelector").innerHTML=h||"Немає доступних діагоналей",document.getElementById("diagModal").classList.add("open")}function toggleDiagPair(a,b,state){const idx=diagonals.findIndex(d=>d[0]===a&&d[1]===b||d[0]===b&&d[1]===a);if(state&&idx<0){let currentLen=Math.hypot(pts[b].x-pts[a].x,pts[b].y-pts[a].y);realPts.length&&realPts[a]&&realPts[b]&&(currentLen=Math.hypot(realPts[b].x-realPts[a].x,realPts[b].y-realPts[a].y)),setTimeout(()=>editDiagonal(N(a)+N(b),Math.round(currentLen),a,b),80)}if(!state&&idx>=0){const key=N(Math.min(a,b))+N(Math.max(a,b));diagonals.splice(idx,1),delete diagonalOverrides[key]}updateDiagList(),updateChecks(),draw()}function updateChecks(){
  var rec=null,zoneInfo=null;
  try{window._autoControlDiagonals=buildAutoControlDiagonals();
  window.A·CEILAutoDiagonalDebug={
    innerCorners:(pts||[]).map(function(_,i){return _autoDiagCornerType(i)==='inner'?N(i):null;}).filter(Boolean),
    suggestions:window._autoControlDiagonals.map(function(d){return {label:d.label,reason:d.reason,kind:d.kind};})
  };}catch(_e){window._autoControlDiagonals=[];}
  try{
    /* Нове ядро має пріоритет: воно повертає лише сторони,
       які реально входять у знайдений конфлікт. */
    if(window.A·CEIL&&window.A·CEIL.Engine&&typeof window.A·CEIL.Engine.analyzeCurrent==="function"){
      var engineResult=window.A·CEIL.Engine.analyzeCurrent();
      if(engineResult&&engineResult.ok&&engineResult.conflicts){
        var conflict=engineResult.conflicts;
        if(conflict.hasConflict&&Array.isArray(conflict.conflictZone)&&conflict.conflictZone.length){
          zoneInfo={
            sides:conflict.conflictZone.slice(),
            color:conflict.conflictZone.length===1?"#ef4444":"#f59e0b"
          };
        }
      }
    }

    /* Старий аналізатор використовується лише для рекомендації діагоналі
       або як резерв, якщо нове ядро не локалізувало жодної сторони. */
    if(window.A·CEILMeasureConfidence&&typeof window.A·CEILMeasureConfidence.analyze==="function"){
      var r=window.A·CEILMeasureConfidence.analyze();

      if(!zoneInfo&&r.verdict&&(r.verdict.type==="proven"||r.verdict.type==="conflict")&&
         Array.isArray(r.verdict.sides)&&r.verdict.sides.length){
        var safeSides=r.verdict.sides.filter(function(i){
          return Number.isInteger(Number(i))&&Number(i)>=0&&Number(i)<pts.length;
        }).map(Number);

        /* Не фарбуємо весь контур як одну "зону помилки".
           Якщо старий аналізатор повернув усі сторони — показ не вмикаємо. */
        if(safeSides.length&&safeSides.length<pts.length){
          zoneInfo={
            sides:safeSides,
            color:r.verdict.type==="proven"?"#ef4444":"#f59e0b"
          };
        }
      }

      if(r.verdict&&r.verdict.recommend){
        rec={
          a:r.verdict.recommend.a,
          b:r.verdict.recommend.b,
          label:r.verdict.recommend.label,
          reason:"перевірити конфліктну зону"
        };
      }else if(r.closed&&(!r.diagonalChecks||!r.diagonalChecks.length)&&r.diagonals&&r.diagonals.length){
        var first=r.diagonals[0];
        rec={a:first.i,b:first.j,label:first.label.replace("–",""),reason:"контрольний вимір"};
      }
    }
  }catch(e){
    rec=null;
    zoneInfo=null;
  }

  /* Без похибок у простій кімнаті жодної примусової діагоналі.
     Після успішного підтвердження першої контрольної діагоналі перевірка завершена. */
  if(_autoDiagHasSuccessfulConfirmation()){
    rec=null;
    window._autoControlDiagonals=[];
  }else if(!zoneInfo&&(!window._autoControlDiagonals||!window._autoControlDiagonals.length)){
    rec=null;
  }

  var changed=
    JSON.stringify(rec)!==JSON.stringify(window._recommendedDiagHighlight||null)||
    JSON.stringify(zoneInfo)!==JSON.stringify(window._conflictZoneHighlight||null);

  window._recommendedDiagHighlight=rec;
  window._conflictZoneHighlight=zoneInfo;

  if((rec||zoneInfo)&&changed&&!window._diagHighlightLoopRunning){
    window._diagHighlightLoopRunning=true;
    (function loop(){
      if(!window._recommendedDiagHighlight&&!window._conflictZoneHighlight){
        window._diagHighlightLoopRunning=false;
        return;
      }
      requestDraw();
      requestAnimationFrame(loop);
    })();
  }
}function resetProjectElementValues(){if("undefined"!=typeof elemItems&&Array.isArray(elemItems)&&elemItems.forEach(it=>{it.qty=0}),"undefined"!=typeof _activeAddGroupId&&(_activeAddGroupId=null),"function"==typeof updateElemBadge&&updateElemBadge(),"function"==typeof renderElemList){const modal=$("elementsModal");modal&&modal.classList.contains("open")&&renderElemList()}}function resetAllSilent(){pts=[],lengths=[],realPts=[],diagonals=[],notes=[],lightMarks=[],wallMarks=[],linearElements=[],wallTypes=[],arcPoints=[],selectedPoint=null,lightMode=null,selectedLightId=null,diagonalOverrides={},closed=!1,diagonalMode=!1,triangleMode=!1,circleMode=!1,circleDiamCm=0,window._recommendedDiagHighlight=null,window._conflictZoneHighlight=null,window._autoControlDiagonals=[],resetProjectElementValues(),$("diagBtn").classList.remove("active"),"function"==typeof updateLightBadge&&updateLightBadge();const wm=document.getElementById("wallEditModal");wm&&wm.classList.remove("open")}function resetAll(){resetAllSilent(),document.getElementById("tbl").innerHTML='<table><tr><td style="color:#8e8e93; padding: 10px; text-align:center; font-size:11px;">Натискайте на екран, щоб ставити кути (прямі та скоси)</td></tr></table>',document.getElementById("diagList").innerHTML="немає",document.getElementById("per").textContent="0.00",document.getElementById("area").textContent="0.00",document.getElementById("inCorners").textContent="0",document.getElementById("outCorners").textContent="0",_currentProjName="",_currentProjAddr="",_currentProjPhone="",_currentProjComment="",_currentProjectId=null,"function"==typeof markRecoveryClean&&markRecoveryClean(),_activeObjectId=null,_activeRoomIdx=null,_hideAddRoomBtn();const _rtr=document.getElementById("roomTabsRow");_rtr&&_rtr.remove(),_hideRoomSaveBar(),draw(),saveState()}
/* Натискання на автоматичну діагональ додає її як реальний контрольний замір. */
cv.addEventListener("click",function(e){
  try{
    if(!closed||!Array.isArray(window._autoControlDiagonals)||!window._autoControlDiagonals.length) return;
    var p=getCanvasPoint(e.clientX,e.clientY);
    var best=null,bestDist=Infinity;
    window._autoControlDiagonals.forEach(function(d){
      var a=pts[d.a],b=pts[d.b];
      if(!a||!b) return;
      var vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y;
      var vv=vx*vx+vy*vy||1;
      var t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv));
      var px=a.x+t*vx,py=a.y+t*vy;
      var dist=Math.hypot(p.x-px,p.y-py);
      if(dist<bestDist){bestDist=dist;best=d;}
    });
    if(best&&bestDist<=18){
      e.preventDefault();
      e.stopPropagation();
      editDiagonal(best.label,Math.round(best.length),best.a,best.b);
    }
  }catch(_e){window.__diagSilent&&window.__diagSilent(_e)}
},true);

function _autoDiagHitAt(clientX,clientY){
  try{
    if(!closed||!Array.isArray(window._autoControlDiagonals)) return null;
    var p=getCanvasPoint(clientX,clientY),best=null,bestDist=Infinity;
    window._autoControlDiagonals.forEach(function(d){
      var a=pts[d.a],b=pts[d.b];if(!a||!b)return;
      var vx=b.x-a.x,vy=b.y-a.y,wx=p.x-a.x,wy=p.y-a.y,vv=vx*vx+vy*vy||1;
      var t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/vv));
      var dist=Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy));
      if(dist<bestDist){bestDist=dist;best=d;}
    });
    return best&&bestDist<=22?best:null;
  }catch(e){return null;}
}
cv.addEventListener("touchstart",function(e){
  if(e.touches&&e.touches.length===1){
    var d=_autoDiagHitAt(e.touches[0].clientX,e.touches[0].clientY);
    if(d){e.preventDefault();e.stopImmediatePropagation();editDiagonal(d.label,Math.round(d.length),d.a,d.b);}
  }
},{passive:false,capture:true});

cv.addEventListener("touchstart",e=>{if(e.preventDefault(),longPressFired=!1,2===e.touches.length){const t1=e.touches[0],t2=e.touches[1];return pinchStartDist=touchDistance(t1,t2),pinchStartScale=viewScale,void(isPanning=!1)}if(1!==e.touches.length)return;viewScale>1&&(isPanning=!0,panStartX=e.touches[0].clientX-viewOffsetX,panStartY=e.touches[0].clientY-viewOffsetY);const touch=e.touches[0];if(lightMode){const p=getCanvasPoint(touch.clientX,touch.clientY),hit=findLightHit(p.x,p.y);return void(hit>=0?(_lightDragIndex=hit,_lightDragging=!1,selectedLightId=lightMarks[hit].id||null,requestDraw()):handleInputEvent(touch.clientX,touch.clientY))}
const _lightTouchPoint=getCanvasPoint(touch.clientX,touch.clientY),_lightTouchHit=findLightHitTouch(touch.clientX,touch.clientY);
if(_lightTouchHit>=0){
  _wallTouchTapPending=null;
  _wallTouchTapMoved=!1;
  _lightDragIndex=_lightTouchHit;
  _lightDragging=!1;
  selectedLightId=lightMarks[_lightTouchHit].id||null;
  requestDraw();
  return;
}
if(diagonalMode)return void handleInputEvent(touch.clientX,touch.clientY);const r=cv.getBoundingClientRect(),x=((touch.clientX-r.left)*(cv.width/r.width)-viewOffsetX)/viewScale,y=((touch.clientY-r.top)*(cv.height/r.height)-viewOffsetY)/viewScale;let hitIndex=-1;closed&&pts.forEach((p,i)=>{Math.hypot(x-p.x,y-p.y)<30&&(hitIndex=i)}),hitIndex>=0&&closed?(
  _wallTouchTapPending=null,
  longPressTimer=setTimeout(()=>{longPressFired=!0,openNoteModal(hitIndex)},500)
):(
  longPressTimer=setTimeout(()=>{},9999),
  _wallTouchTapPending={clientX:touch.clientX,clientY:touch.clientY},
  _wallTouchTapMoved=!1
)},{passive:!1}),cv.addEventListener("touchmove",e=>{
  if(_wallTouchTapPending&&e.touches&&e.touches.length===1){
    const _wt=e.touches[0];
    if(Math.hypot(_wt.clientX-_wallTouchTapPending.clientX,_wt.clientY-_wallTouchTapPending.clientY)>10){
      _wallTouchTapMoved=!0;
    }
  }
  if(clearTimeout(longPressTimer),longPressFired=!1,2===e.touches.length){e.preventDefault();const t1=e.touches[0],t2=e.touches[1],dist=touchDistance(t1,t2),centerX=(t1.clientX+t2.clientX)/2,centerY=(t1.clientY+t2.clientY)/2;if(!pinchStartDist)return pinchStartDist=dist,void(pinchStartScale=viewScale);const oldScale=viewScale;viewScale=Math.max(.5,Math.min(5,pinchStartScale*(dist/pinchStartDist)));const scaleRatio=viewScale/oldScale;return viewOffsetX=centerX-(centerX-viewOffsetX)*scaleRatio,viewOffsetY=centerY-(centerY-viewOffsetY)*scaleRatio,void requestDraw()}if(lightMode&&_lightDragIndex>=0&&1===e.touches.length){e.preventDefault();const t=e.touches[0],p=getCanvasPoint(t.clientX,t.clientY);return _lightDragging=!0,void moveLightMark(_lightDragIndex,p.x,p.y,!1)}isPanning&&1===e.touches.length&&viewScale>1&&(e.preventDefault(),viewOffsetX=e.touches[0].clientX-panStartX,viewOffsetY=e.touches[0].clientY-panStartY,requestDraw())},{passive:!1}),cv.addEventListener("touchend",e=>{
  clearTimeout(longPressTimer);
  const left=e.touches?e.touches.length:0;
  if(left===0&&_wallTouchTapPending&&!_wallTouchTapMoved&&!longPressFired&&!lightMode&&!diagonalMode){
    const _pending=_wallTouchTapPending;
    _wallTouchTapPending=null;
    _wallTouchTapMoved=!1;
    if(A·CEILHandleWallTouchV90(_pending.clientX,_pending.clientY)){
      e.preventDefault();
      return;
    }
    handleInputEvent(_pending.clientX,_pending.clientY);
    e.preventDefault();
    return;
  }
  if(left===0){
    _wallTouchTapPending=null;
    _wallTouchTapMoved=!1;
  }if(left<2&&(pinchStartDist=0),0===left&&(isPanning=!1),_lightDragIndex>=0){if(_lightDragging&&lightMode){const m=lightMarks[_lightDragIndex];m&&moveLightMark(_lightDragIndex,m.x,m.y,!0),syncLightMarksToElems(),saveState(),_lightSuppressClick=!0}else{const m=lightMarks[_lightDragIndex];m&&handleLightTap(+m.x||0,+m.y||0)}return _lightDragIndex=-1,void(_lightDragging=!1)}},{passive:!1}),document.querySelectorAll(".modal-overlay").forEach(overlay=>{overlay.addEventListener("click",e=>{e.target===overlay&&overlay.classList.remove("open")})})
