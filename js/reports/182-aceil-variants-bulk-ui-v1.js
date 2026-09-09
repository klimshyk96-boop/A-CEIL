
(function(){
"use strict";
if(window.__aceilBulkVariantsUiV1)return;
window.__aceilBulkVariantsUiV1=true;

/* ============================================================
   A·CEIL — панель "Масові дії та варіанти" (v1)

   Тонкий UI-шар над window.A·CEIL.BulkRoomActions та
   window.A·CEIL.EstimateVariants. Відкривається окремою кнопкою
   з попап-меню кімнати (#A·CEILRoomMenuPopup), бо це рідкісна дія
   і не повинна займати місце на основній панелі.

   Підключення (додати в index.html):
     <script src="js/nomenclature/180-aceil-bulk-room-actions-v1.js"></script>
     <script src="js/reports/181-aceil-estimate-variants-v1.js"></script>
     <script src="js/reports/182-aceil-variants-bulk-ui-v1.js"></script>
   і кнопку в #A·CEILRoomMenuPopup:
     <button type="button" class="rm-room-menu-action" onclick="A·CEILOpenVariantsPanel()">...</button>
   ============================================================ */

function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function money(v){try{return new Intl.NumberFormat("uk-UA",{maximumFractionDigits:0}).format(Number(v)||0)+" грн";}catch(_){return (Number(v)||0)+" грн";}}
function toast(msg){try{if(typeof showToast==="function"){showToast(msg);return;}}catch(_){}try{alert(msg);}catch(__){}}

var CSS='\
.aceil-bv-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;}\
.aceil-bv-sheet{background:#fff;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:16px 16px 24px;box-sizing:border-box;font:14px/1.4 system-ui,sans-serif;color:#0f172a;}\
@media(min-width:560px){.aceil-bv-overlay{align-items:center;}.aceil-bv-sheet{border-radius:16px;max-height:80vh;}}\
.aceil-bv-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}\
.aceil-bv-head h3{margin:0;font-size:16px;}\
.aceil-bv-close{border:none;background:#f1f5f9;border-radius:8px;width:30px;height:30px;font-size:16px;cursor:pointer;}\
.aceil-bv-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;}\
.aceil-bv-section h4{margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.03em;}\
.aceil-bv-rooms{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}\
.aceil-bv-room{display:flex;align-items:center;gap:6px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;background:#fff;}\
.aceil-bv-room input{width:14px;height:14px;}\
.aceil-bv-row{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;}\
.aceil-bv-btn{flex:1;min-width:120px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:9px 10px;font-size:13px;cursor:pointer;}\
.aceil-bv-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;}\
.aceil-bv-btn.danger{border-color:#fecaca;color:#b91c1c;}\
.aceil-bv-hint{font-size:11px;color:#94a3b8;margin-top:4px;}\
.aceil-bv-variant{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #e2e8f0;font-size:13px;}\
.aceil-bv-variant:first-child{border-top:none;}\
.aceil-bv-variant b{font-weight:500;}\
.aceil-bv-tag{font-size:10px;color:#64748b;background:#eef2ff;border-radius:6px;padding:2px 6px;margin-left:6px;}\
.aceil-bv-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}\
.aceil-bv-table td{padding:5px 0;border-bottom:1px solid #e2e8f0;}\
.aceil-bv-table td:last-child,.aceil-bv-table td:nth-child(2){text-align:right;}\
.aceil-bv-diff-up{color:#b91c1c;font-weight:600;}\
.aceil-bv-diff-down{color:#15803d;font-weight:600;}\
.aceil-bv-select{width:100%;padding:8px;border-radius:8px;border:1px solid #cbd5e1;font-size:13px;margin-bottom:8px;}\
';
function ensureCss(){
  if(document.getElementById("aceil-bv-css"))return;
  var st=document.createElement("style");
  st.id="aceil-bv-css";
  st.textContent=CSS;
  document.head.appendChild(st);
}

function selectedRoomIds(root){
  return Array.prototype.slice.call(root.querySelectorAll(".aceil-bv-room-check:checked")).map(function(el){return el.value;});
}

function renderRoomList(rooms,excludeActive){
  return rooms.filter(function(r){return !excludeActive||!r.active;}).map(function(r){
    return '<label class="aceil-bv-room"><input type="checkbox" class="aceil-bv-room-check" value="'+esc(r.id)+'" checked>'+esc(r.name)+(r.active?' <span class="aceil-bv-tag">активна</span>':'')+'</label>';
  }).join("");
}

function renderVariantsList(variants){
  if(!variants.length)return '<div class="aceil-bv-hint">Варіантів ще немає — збережіть поточний стан як перший.</div>';
  return variants.map(function(v){
    return '<div class="aceil-bv-variant"><span><b>'+esc(v.label)+'</b>'+(v.active?' <span class="aceil-bv-tag">активний</span>':'')+'</span>'+
      '<span><button class="aceil-bv-btn" style="min-width:auto;padding:5px 8px;" data-apply-variant="'+esc(v.id)+'">Відкрити</button> '+
      '<button class="aceil-bv-btn danger" style="min-width:auto;padding:5px 8px;" data-delete-variant="'+esc(v.id)+'">✕</button></span></div>';
  }).join("");
}

function diffCell(a,b){
  var d=b-a;
  if(Math.abs(d)<1)return '<td>'+money(b)+'</td>';
  var cls=d>0?"aceil-bv-diff-up":"aceil-bv-diff-down";
  return '<td class="'+cls+'">'+money(b)+' ('+(d>0?"+":"")+money(d)+')</td>';
}

function renderCompare(cmp){
  if(!cmp)return "";
  var rows=[["Профілі","profiles"],["Полотно","canvas"],["Вставка","insert"],["Світло","lighting"],["Інше","other"]];
  var html='<table class="aceil-bv-table"><tr><td><b>Позиція</b></td><td><b>'+esc(cmp.a.label)+'</b></td><td><b>'+esc(cmp.b.label)+'</b></td></tr>';
  rows.forEach(function(r){
    var av=cmp.a.result.totals[r[1]]||0,bv=cmp.b.result.totals[r[1]]||0;
    if(!av&&!bv)return;
    html+='<tr><td>'+r[0]+'</td><td>'+money(av)+'</td>'+diffCell(av,bv)+'</tr>';
  });
  html+='<tr><td><b>Разом</b></td><td><b>'+money(cmp.a.result.totals.total)+'</b></td>'+diffCell(cmp.a.result.totals.total,cmp.b.result.totals.total).replace("<td","<td style=\"font-weight:600\"")+'</tr>';
  html+='</table>';
  return html;
}

function close(){
  var ov=document.getElementById("aceil-bv-overlay");
  if(ov)ov.remove();
}

function open(){
  ensureCss();
  if(!window.A·CEIL||!window.A·CEIL.BulkRoomActions||!window.A·CEIL.EstimateVariants){
    toast("Модуль масових дій не завантажено. Перевірте підключення скриптів 180/181.");
    return;
  }
  var rooms=window.A·CEIL.BulkRoomActions.listRooms();
  if(rooms.length<2){
    toast("Ця панель працює з проєктами, де більше однієї кімнати.");
    return;
  }
  var activeId=window.A·CEIL.BulkRoomActions.activeRoomId();
  var variants=window.A·CEIL.EstimateVariants.listVariants();

  var overlay=document.createElement("div");
  overlay.className="aceil-bv-overlay";
  overlay.id="aceil-bv-overlay";
  overlay.innerHTML=
    '<div class="aceil-bv-sheet">'+
      '<div class="aceil-bv-head"><h3>Масові дії та варіанти</h3><button class="aceil-bv-close" id="aceil-bv-close">✕</button></div>'+

      '<div class="aceil-bv-section">'+
        '<h4>Профіль / елементи</h4>'+
        '<div class="aceil-bv-hint" style="margin-bottom:8px;">Джерело — активна кімната. Застосувати на:</div>'+
        '<div class="aceil-bv-rooms" id="aceil-bv-rooms-profile">'+renderRoomList(rooms,true)+'</div>'+
        '<button class="aceil-bv-btn primary" id="aceil-bv-apply-profile" style="width:100%;">Застосувати профіль з активної кімнати</button>'+
        '<div class="aceil-bv-hint">Кількість профілю масштабується за периметром кожної кімнати — перевірте після застосування.</div>'+
      '</div>'+

      '<div class="aceil-bv-section">'+
        '<h4>Вставка</h4>'+
        '<div class="aceil-bv-rooms" id="aceil-bv-rooms-insert">'+renderRoomList(rooms,true)+'</div>'+
        '<div class="aceil-bv-row">'+
          '<button class="aceil-bv-btn primary" id="aceil-bv-apply-insert">Колір з активної кімнати</button>'+
          '<button class="aceil-bv-btn danger" id="aceil-bv-remove-insert">Прибрати вставку</button>'+
        '</div>'+
      '</div>'+

      '<div class="aceil-bv-section">'+
        '<h4>Варіанти кошторису</h4>'+
        '<div id="aceil-bv-variants-list">'+renderVariantsList(variants)+'</div>'+
        '<div class="aceil-bv-row" style="margin-top:10px;">'+
          '<button class="aceil-bv-btn" id="aceil-bv-save-variant">Зберегти поточний як варіант</button>'+
        '</div>'+
        (variants.length>=1?'<div class="aceil-bv-row"><button class="aceil-bv-btn" id="aceil-bv-dup-variant">Створити новий на основі...</button></div>':'')+
        (variants.length>=2?(
          '<div class="aceil-bv-row" style="margin-top:6px;">'+
            '<select class="aceil-bv-select" id="aceil-bv-cmp-a">'+variants.map(function(v){return '<option value="'+esc(v.id)+'">'+esc(v.label)+'</option>';}).join("")+'</select>'+
            '<select class="aceil-bv-select" id="aceil-bv-cmp-b">'+variants.map(function(v,idx){return '<option value="'+esc(v.id)+'"'+(idx===1?" selected":"")+'>'+esc(v.label)+'</option>';}).join("")+'</select>'+
          '</div>'+
          '<button class="aceil-bv-btn" id="aceil-bv-compare" style="width:100%;">Порівняти</button>'+
          '<div id="aceil-bv-compare-out"></div>'
        ):'<div class="aceil-bv-hint">Для порівняння потрібно щонайменше 2 варіанти.</div>')+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);

  overlay.addEventListener("click",function(e){if(e.target===overlay)close();});
  document.getElementById("aceil-bv-close").addEventListener("click",close);

  document.getElementById("aceil-bv-apply-profile").addEventListener("click",function(){
    var ids=selectedRoomIds(document.getElementById("aceil-bv-rooms-profile"));
    if(!ids.length)return toast("Оберіть хоча б одну кімнату.");
    var r=window.A·CEIL.BulkRoomActions.applyProfileToRooms(activeId,ids);
    toast(r.ok?"Профіль застосовано до "+r.count+" кімнат.":"Не вдалося: "+(r.reason||"?"));
  });
  document.getElementById("aceil-bv-apply-insert").addEventListener("click",function(){
    var ids=selectedRoomIds(document.getElementById("aceil-bv-rooms-insert"));
    if(!ids.length)return toast("Оберіть хоча б одну кімнату.");
    var r=window.A·CEIL.BulkRoomActions.applyInsertToRooms(activeId,ids,{remove:false});
    toast(r.ok?"Колір вставки застосовано до "+r.count+" кімнат.":"Не вдалося: "+(r.reason||"?"));
  });
  document.getElementById("aceil-bv-remove-insert").addEventListener("click",function(){
    var ids=selectedRoomIds(document.getElementById("aceil-bv-rooms-insert"));
    if(!ids.length)return toast("Оберіть хоча б одну кімнату.");
    var r=window.A·CEIL.BulkRoomActions.applyInsertToRooms(null,ids,{remove:true});
    toast(r.ok?"Вставку прибрано у "+r.count+" кімнатах.":"Не вдалося: "+(r.reason||"?"));
  });
  document.getElementById("aceil-bv-save-variant").addEventListener("click",function(){
    var label=prompt("Назва варіанта:","Варіант "+(variants.length+1));
    if(label==null)return;
    var r=window.A·CEIL.EstimateVariants.saveVariant(label);
    if(r.ok){toast("Збережено.");close();open();}else toast("Не вдалося: "+(r.reason||"?"));
  });
  var dupBtn=document.getElementById("aceil-bv-dup-variant");
  if(dupBtn)dupBtn.addEventListener("click",function(){
    if(!variants.length)return;
    var srcId=variants[0].id;
    if(variants.length>1){
      var pick=prompt("На основі якого варіанта? Введіть номер:\n"+variants.map(function(v,i){return (i+1)+". "+v.label;}).join("\n"),"1");
      var idx=parseInt(pick,10)-1;
      if(idx>=0&&idx<variants.length)srcId=variants[idx].id;
    }
    var label=prompt("Назва нового варіанта:","Варіант "+(variants.length+1));
    if(label==null)return;
    var r=window.A·CEIL.EstimateVariants.duplicateVariant(srcId,label);
    if(r.ok){toast("Створено. Тепер це активний стан — можна редагувати чи застосувати масові дії.");close();open();}else toast("Не вдалося: "+(r.reason||"?"));
  });
  overlay.querySelectorAll("[data-apply-variant]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-apply-variant");
      if(!confirm("Застосувати цей варіант як поточний стан кімнат?"))return;
      var r=window.A·CEIL.EstimateVariants.applyVariant(id);
      toast(r.ok?"Варіант застосовано.":"Не вдалося: "+(r.reason||"?"));
      close();
    });
  });
  overlay.querySelectorAll("[data-delete-variant]").forEach(function(btn){
    btn.addEventListener("click",function(){
      var id=btn.getAttribute("data-delete-variant");
      if(!confirm("Видалити цей варіант? Дію не можна скасувати."))return;
      var r=window.A·CEIL.EstimateVariants.deleteVariant(id);
      toast(r.ok?"Видалено.":"Не вдалося: "+(r.reason||"?"));
      close();open();
    });
  });
  var cmpBtn=document.getElementById("aceil-bv-compare");
  if(cmpBtn)cmpBtn.addEventListener("click",function(){
    var idA=document.getElementById("aceil-bv-cmp-a").value,idB=document.getElementById("aceil-bv-cmp-b").value;
    if(idA===idB)return toast("Оберіть два різні варіанти.");
    var cmp=window.A·CEIL.EstimateVariants.compareVariants(idA,idB);
    document.getElementById("aceil-bv-compare-out").innerHTML=renderCompare(cmp);
  });
}

window.A·CEILOpenVariantsPanel=open;
window.A·CEILCloseVariantsPanel=close;
})();
