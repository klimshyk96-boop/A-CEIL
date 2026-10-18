
!function(){
"use strict";

function fmtUAH(v){
  v = Number(v)||0;
  try { return "₴" + v.toFixed(2); } catch(e){ return String(v.toFixed ? v.toFixed(2) : v); }
}

function clampPct(v){
  v = parseFloat(v);
  if (!isFinite(v) || v < 0) v = 0;
  if (v > 100) v = 100;
  return v;
}

function clampAmount(v){
  v = parseFloat(v);
  if (!isFinite(v) || v < 0) v = 0;
  return v;
}

// --- 1. Persist discount/advance % inside reportSettings ---
var oldSaveRS = window.saveReportSettings;
if ("function" == typeof oldSaveRS && !oldSaveRS.__discAdv401) {
  var wrappedSaveRS = function(){
    var r = oldSaveRS.apply(this, arguments);
    try {
      var rs = ("function" == typeof _loadRS) ? _loadRS() : (window.reportSettings || {});
      var dEl = document.getElementById("rsDiscountPercent");
      var aEl = document.getElementById("rsAdvanceAmount");
      if (dEl) rs.discountPercent = clampPct(dEl.value);
      if (aEl) rs.advanceAmount = clampAmount(aEl.value);
      localStorage.setItem("reportSettings", JSON.stringify(rs));
      window.reportSettings = rs;
    } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return r;
  };
  wrappedSaveRS.__discAdv401 = true;
  window.saveReportSettings = wrappedSaveRS;
  try { saveReportSettings = wrappedSaveRS; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

// --- 2. Inject two number inputs into the "Кошторис" card of report settings modal ---
function injectDiscountAdvanceUI(){
  var rs = ("function" == typeof _loadRS) ? _loadRS() : (window.reportSettings || {});
  var existing = document.getElementById("rsDiscountPercent");
  if (existing) {
    existing.value = (rs.discountPercent != null) ? rs.discountPercent : "";
    var advEl = document.getElementById("rsAdvanceAmount");
    if (advEl) advEl.value = (rs.advanceAmount != null) ? rs.advanceAmount : "";
    return;
  }
  var cards = document.querySelectorAll(".rspro-card");
  var targetCard = null;
  for (var i = 0; i < cards.length; i++){
    var t = cards[i].querySelector(".rspro-card-title");
    if (t && t.textContent.indexOf("Кошторис") !== -1) { targetCard = cards[i]; break; }
  }
  if (!targetCard) return; // older settings modal without this card - skip silently
  var wrap = document.createElement("div");
  wrap.className = "rspro-fields";
  wrap.style.marginTop = "10px";
  wrap.innerHTML =
    '<input id="rsDiscountPercent" class="rspro-input" type="number" min="0" max="100" step="1" inputmode="decimal" placeholder="Знижка, %" oninput="saveReportSettings()">' +
    '<input id="rsAdvanceAmount" class="rspro-input" type="number" min="0" step="1" inputmode="decimal" placeholder="Аванс, ₴" oninput="saveReportSettings()">';
  targetCard.appendChild(wrap);
  document.getElementById("rsDiscountPercent").value = (rs.discountPercent != null) ? rs.discountPercent : "";
  document.getElementById("rsAdvanceAmount").value = (rs.advanceAmount != null) ? rs.advanceAmount : "";
}

var oldOpenRS = window.openReportSettings;
if ("function" == typeof oldOpenRS && !oldOpenRS.__discAdv401) {
  var wrappedOpenRS = function(){
    var r = oldOpenRS.apply(this, arguments);
    try { setTimeout(injectDiscountAdvanceUI, 30); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return r;
  };
  wrappedOpenRS.__discAdv401 = true;
  window.openReportSettings = wrappedOpenRS;
  try { openReportSettings = wrappedOpenRS; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

// --- 3. Compute totals ---
function sumElemItems(items){
  var total = 0;
  (items || []).forEach(function(it){
    var qty = parseFloat(it && it.qty) || 0;
    var price = parseFloat(it && it.price) || 0;
    total += qty * price;
  });
  return total;
}

function computeRawTotal(){
  try {
    if (typeof _activeObjectId !== "undefined" && _activeObjectId !== null && typeof getProjects === "function") {
      var obj = getProjects().find(function(p){
        return String(p.id) === String(_activeObjectId) || String(p._dbId) === String(_activeObjectId);
      });
      if (obj && obj.multiRoom && obj.rooms && obj.rooms.length) {
        var sum = 0;
        obj.rooms.forEach(function(room){
          try {
            var st = (typeof room.state === "string") ? JSON.parse(room.state) : (room.state || {});
            sum += sumElemItems(st.elemItems);
          } catch(e){window.__diagSilent&&window.__diagSilent(e)}
        });
        return sum;
      }
    }
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try {
    if (typeof elemItems !== "undefined") return sumElemItems(elemItems);
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return 0;
}

// --- 4. Build HTML summary card ---
function buildSummaryHtml(rawTotal, rs){
  if (rs && rs.reportAudience === "installer") return ""; // installer-only report hides pricing
  var discountPct = clampPct(rs && rs.discountPercent);
  var advanceAmountRaw = clampAmount(rs && rs.advanceAmount);
  if (!(rawTotal > 0) || (discountPct <= 0 && advanceAmountRaw <= 0)) return "";

  var discountAmount = rawTotal * discountPct / 100;
  var afterDiscount = rawTotal - discountAmount;
  var advanceAmount = Math.min(advanceAmountRaw, afterDiscount); // advance can't exceed the total due
  var remainder = afterDiscount - advanceAmount;

  var rows = [];
  if (discountPct > 0) {
    rows.push('<div class="ps-row"><span>Сума без знижки</span><span>' + fmtUAH(rawTotal) + '</span></div>');
    rows.push('<div class="ps-row ps-discount"><span>Знижка (' + discountPct + '%)</span><span>-' + fmtUAH(discountAmount) + '</span></div>');
  }
  rows.push('<div class="ps-row ps-final"><span>До сплати</span><span>' + fmtUAH(afterDiscount) + '</span></div>');
  if (advanceAmount > 0) {
    rows.push('<div class="ps-row"><span>Аванс</span><span>' + fmtUAH(advanceAmount) + '</span></div>');
    rows.push('<div class="ps-row ps-remainder"><span>Залишок при монтажі</span><span>' + fmtUAH(remainder) + '</span></div>');
  }
  return '<div class="ps-card"><div class="ps-title">💳 Розрахунок оплати</div>' + rows.join("") + '</div>';
}

var PS_STYLE = '<style>' +
  '.ps-card{max-width:520px;width:100%;background:#fff;border-radius:16px;padding:18px 20px;margin:0 0 12px;box-shadow:0 4px 14px rgba(0,0,0,.10);font-family:Arial,sans-serif;box-sizing:border-box}' +
  '.ps-title{font-weight:800;font-size:15px;color:#1e293b;margin-bottom:10px}' +
  '.ps-row{display:flex;justify-content:space-between;padding:6px 0;font-size:15px;color:#334155;border-bottom:1px solid #f1f5f9}' +
  '.ps-row:last-child{border-bottom:none}' +
  '.ps-discount span:last-child{color:#dc2626;font-weight:700}' +
  '.ps-final{font-weight:800;font-size:18px;color:#1e3a8a}' +
  '.ps-remainder span:last-child{font-weight:800;color:#15803d}' +
  '</style>';

function injectReportBackButton(win){
  if (!win || !win.document) return;
  try {
    var doc = win.document;
    var editorUrl = "";
    try { editorUrl = String(window.location.href || ""); } catch(_){}
    var attempt = function(){
      if (!doc.body) { setTimeout(attempt, 20); return; }
      if (doc.getElementById("rmReportBackBtn")) return;

      var btn = doc.createElement("button");
      btn.id = "rmReportBackBtn";
      btn.type = "button";
      btn.textContent = "← Назад";
      btn.setAttribute("aria-label","Повернутися до A·CEIL");
      btn.style.cssText =
        "position:fixed;top:max(12px,env(safe-area-inset-top));left:12px;z-index:2147483647;" +
        "min-height:42px;padding:0 16px;border:0;border-radius:999px;" +
        "background:rgba(15,23,42,.92);color:#fff;font:800 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
        "box-shadow:0 5px 18px rgba(15,23,42,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
        "cursor:pointer;touch-action:manipulation";

      btn.onclick = function(){
        try {
          if (win.opener && !win.opener.closed) win.opener.focus();
        } catch(_){}
        try { win.close(); } catch(_){}
        /* iOS/PWA fallback: якщо standalone-вікно не дозволило close(), повертаємо редактор у цьому ж вікні. */
        setTimeout(function(){
          try {
            if (!win.closed && editorUrl) win.location.replace(editorUrl);
          } catch(_){}
        },120);
      };
      doc.body.appendChild(btn);
    };
    attempt();
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

function injectIntoPopup(win, html){
  if (!win || !win.document) return;
  try {
    var doc = win.document;
    var attempt = function(){
      if (!doc.body) { setTimeout(attempt, 20); return; }
      var holder = doc.createElement("div");
      holder.innerHTML = PS_STYLE + html;
      var img = doc.getElementById("img");
      if (img && img.parentNode) {
        img.parentNode.insertBefore(holder, img.nextSibling);
      } else {
        doc.body.insertBefore(holder, doc.body.firstChild);
      }
    };
    attempt();
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

// --- 5. Wrap saveToPhone (covers classic + modern, single + multi-room, via window.open capture) ---
var oldSaveToPhone = window.saveToPhone;
if ("function" == typeof oldSaveToPhone && !oldSaveToPhone.__discAdv401) {
  var wrappedSaveToPhone = async function(){
    var capturedWin = null;
    var nativeOpen = window.open;
    window.open = function(){
      capturedWin = nativeOpen.apply(window, arguments);
      return capturedWin;
    };
    try {
      await oldSaveToPhone.apply(this, arguments);
    } finally {
      window.open = nativeOpen;
    }
    try {
      var rs = ("function" == typeof _loadRS) ? _loadRS() : (window.reportSettings || {});
      var rawTotal = computeRawTotal();
      var html = buildSummaryHtml(rawTotal, rs);
      if (capturedWin) {
        setTimeout(function(){ injectReportBackButton(capturedWin); }, 20);
      }
      if (html && capturedWin) {
        setTimeout(function(){ injectIntoPopup(capturedWin, html); }, 60);
      }
    } catch(e){
      try{ if(capturedWin) injectReportBackButton(capturedWin); }catch(_){}
      window.__diagSilent&&window.__diagSilent(e)
    }
  };
  wrappedSaveToPhone.__discAdv401 = true;
  window.saveToPhone = wrappedSaveToPhone;
  try { saveToPhone = wrappedSaveToPhone; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

}();
