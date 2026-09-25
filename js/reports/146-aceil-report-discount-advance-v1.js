
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

function loadPaymentSettings(){
  var raw={};
  try{raw=JSON.parse(localStorage.getItem("reportSettings")||"{}")||{};}catch(e){}
  return {discountPercent:clampPct(raw.discountPercent),advanceAmount:clampAmount(raw.advanceAmount)};
}

// --- 1. Persist discount/advance % inside reportSettings ---
var oldSaveRS = window.saveReportSettings;
if ("function" == typeof oldSaveRS && !oldSaveRS.__discAdv401) {
  var wrappedSaveRS = function(){
    var r = oldSaveRS.apply(this, arguments);
    try {
      var rs={};
      try{rs=JSON.parse(localStorage.getItem("reportSettings")||"{}")||{};}catch(_e){rs={};}
      var dEl=document.getElementById("rsDiscountPercent");
      var aEl=document.getElementById("rsAdvanceAmount");
      if(dEl)rs.discountPercent=clampPct(dEl.value);
      if(aEl)rs.advanceAmount=clampAmount(aEl.value);
      localStorage.setItem("reportSettings",JSON.stringify(rs));
      window.reportSettings=Object.assign(window.reportSettings||{},rs);
    } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return r;
  };
  wrappedSaveRS.__discAdv401 = true;
  window.saveReportSettings = wrappedSaveRS;
  try { saveReportSettings = wrappedSaveRS; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

// --- 2. Inject two number inputs into the "Кошторис" card of report settings modal ---
function injectDiscountAdvanceUI(){
  var rs = loadPaymentSettings();
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

// --- 4. Build the summary rows (label, value, style) ---
function buildSummaryRows(rawTotal, rs){
  if (rs && rs.reportAudience === "installer") return null; // installer-only report hides pricing
  var persistedPayment=loadPaymentSettings();
  var discountPct=clampPct(rs&&rs.discountPercent!=null?rs.discountPercent:persistedPayment.discountPercent);
  var advanceAmountRaw=clampAmount(rs&&rs.advanceAmount!=null?rs.advanceAmount:persistedPayment.advanceAmount);
  if (!(rawTotal > 0) || (discountPct <= 0 && advanceAmountRaw <= 0)) return null;

  var discountAmount = rawTotal * discountPct / 100;
  var afterDiscount = rawTotal - discountAmount;
  var advanceAmount = Math.min(advanceAmountRaw, afterDiscount); // advance can't exceed the total due
  var remainder = afterDiscount - advanceAmount;

  var rows = [];
  if (discountPct > 0) {
    rows.push({label:"Сума без знижки", value:fmtUAH(rawTotal), color:"#334155", weight:"normal", size:17});
    rows.push({label:"Знижка ("+discountPct+"%)", value:"-"+fmtUAH(discountAmount), color:"#dc2626", weight:"bold", size:17});
  }
  rows.push({label:"До сплати", value:fmtUAH(afterDiscount), color:"#1e3a8a", weight:"bold", size:22});
  if (advanceAmount > 0) {
    rows.push({label:"Аванс", value:fmtUAH(advanceAmount), color:"#334155", weight:"normal", size:17});
    rows.push({label:"Залишок при монтажі", value:fmtUAH(remainder), color:"#15803d", weight:"bold", size:17});
  }
  return rows;
}

// --- 5. Draw the "💳 Розрахунок оплати" card directly onto the report canvas.
// Earlier versions tried to inject an HTML card into the report's popup window
// by capturing window.open(). That silently failed for two reasons: (a) some
// report paths resolve the outer promise before their popup actually opens
// (canvas.toBlob() callbacks that aren't awaited), and (b) when A·CEIL runs
// as an installed PWA (Додано на головний екран), the report is shown with
// _modernOpenPreview -> openReportInsideApp(), which never calls window.open()
// at all — it paints the image straight into the current page. So there was
// often no popup window to inject into in the first place.
// Baking the card into the canvas pixels themselves works no matter how the
// resulting image is later displayed (popup tab or in-app PWA viewer), and
// matches the pattern already used elsewhere in this codebase (see the
// ceiling-cornice legend helper in js/canvas/187-*.js) for appending extra
// canvas content before a report image is finalized.
function roundedRectPath(c, x, y, w, h, r){
  if (typeof c.roundRect === "function") { c.beginPath(); c.roundRect(x, y, w, h, r); return; }
  c.beginPath();
  c.moveTo(x+r, y);
  c.arcTo(x+w, y, x+w, y+h, r);
  c.arcTo(x+w, y+h, x, y+h, r);
  c.arcTo(x, y+h, x, y, r);
  c.arcTo(x, y, x+w, y, r);
  c.closePath();
}

function appendPaymentSummary(sourceCanvas, rawTotal, rs){
  var rows = buildSummaryRows(rawTotal, rs);
  if (!rows || !rows.length || !sourceCanvas || !sourceCanvas.width) return sourceCanvas;

  var W = sourceCanvas.width;
  var PADX = Math.round(W * 0.044);
  var cardW = W - PADX * 2;
  var rowH = 46;
  var titleH = 54;
  var cardH = titleH + rows.length * rowH + 16;
  var extra = cardH + 24;

  var next = document.createElement("canvas");
  next.width = W;
  next.height = sourceCanvas.height + extra;
  var c = next.getContext("2d");
  c.fillStyle = "#f8fafc";
  c.fillRect(0, 0, next.width, next.height);
  c.drawImage(sourceCanvas, 0, 0);

  var y = sourceCanvas.height + 12;
  c.save();
  c.shadowColor = "rgba(15,23,42,.12)";
  c.shadowBlur = 16;
  c.shadowOffsetY = 4;
  c.fillStyle = "#ffffff";
  roundedRectPath(c, PADX, y, cardW, cardH, 18);
  c.fill();
  c.restore();

  c.textAlign = "left";
  c.fillStyle = "#1e293b";
  c.font = "bold 20px Arial";
  c.fillText("💳 Розрахунок оплати", PADX + 22, y + 34);

  var ry = y + titleH;
  rows.forEach(function(row, i){
    c.fillStyle = "#334155";
    c.font = (row.weight === "bold" ? "bold " : "") + row.size + "px Arial";
    c.textAlign = "left";
    c.fillText(row.label, PADX + 22, ry + 26);
    c.fillStyle = row.color;
    c.textAlign = "right";
    c.fillText(row.value, PADX + cardW - 22, ry + 26);
    c.textAlign = "left";
    if (i < rows.length - 1) {
      c.strokeStyle = "#f1f5f9";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(PADX + 18, ry + rowH - 8);
      c.lineTo(PADX + cardW - 18, ry + rowH - 8);
      c.stroke();
    }
    ry += rowH;
  });

  return next;
}

// --- 6. Hook the single real chokepoint every report path funnels through:
// _modernOpenPreview(canvas, fileName), right before the canvas is handed off
// for display. We deliberately wait for window "load" before grabbing it, so
// that every other script that also wraps _modernOpenPreview (there are
// several, loaded at various points in index.html) has already registered
// its own wrapper. That way our wrapper becomes the outermost one and always
// runs first, guaranteeing the payment card is baked in before any of those
// other wrappers decide how to actually show the image (popup window vs the
// in-app PWA viewer vs anything added later).
function installPaymentSummaryHook(){
  var current = window._modernOpenPreview;
  if ("function" != typeof current || current.__discAdv401Final) return;
  var wrapped = function(canvasArg, fileName){
    var finalCanvas = canvasArg;
    try {
      var rs = ("function" == typeof _loadRS) ? _loadRS() : (window.reportSettings || {});
      var rawTotal = computeRawTotal();
      finalCanvas = appendPaymentSummary(canvasArg, rawTotal, rs) || canvasArg;
    } catch(e){ window.__diagSilent&&window.__diagSilent(e); finalCanvas = canvasArg; }
    return current.call(this, finalCanvas, fileName);
  };
  wrapped.__discAdv401Final = true;
  window._modernOpenPreview = wrapped;
  try { _modernOpenPreview = wrapped; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

if (document.readyState === "complete") {
  setTimeout(installPaymentSummaryHook, 0);
} else {
  window.addEventListener("load", function(){ setTimeout(installPaymentSummaryHook, 0); });
}

// --- 7. Also cover the legacy (non-modern) canvas.toBlob-based saveToPhone /
// generateObjectReport path, in case reportStyle is ever not "modern". These
// build their own popup synchronously most of the time, but call
// canvas.toBlob() without awaiting it, so we poll briefly for the popup
// before giving up on adding the back button / summary there too.
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
      if (!capturedWin) {
        var waited = 0;
        while (!capturedWin && waited < 4000) {
          await new Promise(function(res){ setTimeout(res, 50); });
          waited += 50;
        }
      }
    } finally {
      window.open = nativeOpen;
    }
    if (capturedWin) {
      setTimeout(function(){ injectReportBackButton(capturedWin); }, 20);
    }
  };
  wrappedSaveToPhone.__discAdv401 = true;
  window.saveToPhone = wrappedSaveToPhone;
  try { saveToPhone = wrappedSaveToPhone; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}

}();
