(function () {
  "use strict";
  var query = new URLSearchParams(location.search);
  var match = location.pathname.match(/^\/report\/([a-f0-9]{20,64})\/?$/i);
  var value = match ? match[1] : query.get("r");
  if (!value || !/^[a-f0-9]{20,64}$/i.test(value)) return;

  function esc(input) {
    return String(input == null ? "" : input).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function baseUrl() { try { return String(SUPABASE_URL || "").replace(/\/$/, ""); } catch (_) { return String(window.SUPABASE_URL || "").replace(/\/$/, ""); } }
  function anonKey() { try { return String(SUPABASE_ANON || ""); } catch (_) { return String(window.SUPABASE_ANON || ""); } }
  function enableBrowserZoom() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover");
    document.documentElement.classList.add("rpr-public-report");
  }
  function addStyle() {
    var style = document.createElement("style");
    style.textContent = "html.rpr-public-report,html.rpr-public-report body{touch-action:pan-x pan-y pinch-zoom!important;overflow:auto!important;overscroll-behavior:auto!important}#A·CEILPublicReportView{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#eef4ff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:14px;box-sizing:border-box;touch-action:pan-x pan-y pinch-zoom!important;-webkit-overflow-scrolling:touch}.rpr-loading,.rpr-error{max-width:620px;margin:20vh auto;background:#fff;border-radius:22px;padding:24px;text-align:center;font-weight:800;box-shadow:0 18px 50px rgba(15,23,42,.15)}.rpr-error{color:#b91c1c}.rpr-head{max-width:920px;margin:auto;display:flex;justify-content:space-between;align-items:flex-start;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px 12px}.rpr-head b{color:#2563eb}.rpr-head h1{margin:5px 0 0;font-size:23px}.rpr-head span{font-size:12px;font-weight:800;color:#64748b}.rpr-info{max-width:920px;margin:auto;background:#fff;padding:0 18px 12px;line-height:1.55;color:#475569}.rpr-actions{max-width:920px;margin:auto;background:#fff;padding:0 18px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px}.rpr-actions a{min-height:48px;border-radius:14px;text-decoration:none;display:flex;align-items:center;justify-content:center;font-weight:850;background:#dcfce7;color:#047857;text-align:center;padding:0 8px}.rpr-actions a+a{background:#dbeafe;color:#1d4ed8}.rpr-actions a+a+a{background:#ede9fe;color:#6d28d9}.rpr-zoom{position:sticky;top:8px;z-index:4;width:max-content;margin:10px auto;padding:6px;display:flex;align-items:center;gap:6px;border-radius:16px;background:rgba(15,23,42,.88);box-shadow:0 8px 24px rgba(15,23,42,.24);backdrop-filter:blur(8px)}.rpr-zoom button{border:0;border-radius:11px;min-width:48px;height:44px;padding:0 13px;background:#fff;color:#0f172a;font:800 17px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.rpr-zoom button:nth-child(2){min-width:72px;font-size:14px}.rpr-image{display:block;width:min(100%,920px);max-width:none;height:auto;margin:0 auto 28px;border-radius:0 0 18px 18px;box-shadow:0 18px 50px rgba(15,23,42,.16);touch-action:pan-x pan-y pinch-zoom!important}@media(max-width:560px){#A·CEILPublicReportView{padding:0}.rpr-head{border-radius:0}.rpr-actions{grid-template-columns:1fr}.rpr-image{border-radius:0}.rpr-zoom{top:6px}}";
    document.head.appendChild(style);
  }
  function route(loc) {
    if (!loc) return "";
    var direct = String(loc.mapUrl || "").trim(); if (direct) return direct;
    var lat = Number(loc.latitude == null ? loc.lat : loc.latitude), lng = Number(loc.longitude == null ? loc.lng : loc.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(lat + "," + lng) : "";
  }
  async function legacyPayload() {
    if (value.length !== 20) return null;
    var response = await fetch(baseUrl() + "/storage/v1/object/public/roomator-reports/r/" + value + ".json", { cache: "no-store" });
    if (!response.ok) return null;
    var payload = await response.json();
    if (payload && payload.revoked === true) throw new Error("Посилання закрито власником");
    if (payload && payload.expiresAt && new Date(payload.expiresAt).getTime() <= Date.now()) throw new Error("Термін дії посилання закінчився");
    return payload;
  }
  async function securePayload() {
    if (!window.supabase || !baseUrl() || !anonKey()) throw new Error("Сервіс звітів тимчасово недоступний");
    var client = window.supabase.createClient(baseUrl(), anonKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    var result = await client.rpc("aceil_get_public_report", { p_token: value.toLowerCase() });
    if (result.error) throw result.error;
    var data = result.data || {};
    if (data.status === "active" && data.payload) return data.payload;
    if (data.status === "revoked") throw new Error("Посилання закрито власником");
    if (data.status === "expired") throw new Error("Термін дії посилання закінчився");
    var legacy = await legacyPayload();
    if (legacy) return legacy;
    throw new Error("Посилання не знайдено");
  }
  function makeSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) {
      return (Number(c) ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16);
    });
  }

  // Ідентифікатор сесії створюється в браузері, а message_id і текст Telegram
  // зберігаються лише на сервері. Події не можуть підмінити чуже повідомлення.
  var reportSessionId = makeSessionId();
  var trackingReady = false;
  var pendingShared = false;
  var pendingDuration = 0;
  var lastDurationSent = 0;
  var visibleStartedAt = null;
  var visibleTotalMs = 0;

  function currentVisibleSeconds() {
    var total = visibleTotalMs;
    if (visibleStartedAt != null && document.visibilityState !== "hidden") total += Date.now() - visibleStartedAt;
    return Math.max(0, Math.round(total / 1000));
  }

  function pauseVisibleTimer() {
    if (visibleStartedAt == null) return;
    visibleTotalMs += Math.max(0, Date.now() - visibleStartedAt);
    visibleStartedAt = null;
  }

  function resumeVisibleTimer() {
    if (visibleStartedAt == null) visibleStartedAt = Date.now();
  }

  async function notifyReportOpen() {
    try {
      var url = baseUrl();
      if (!url) return;
      var response = await fetch(url + "/functions/v1/notify-report-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: value.toLowerCase(),
          session_id: reportSessionId
        }),
        keepalive: true
      });
      var json = await response.json().catch(function () { return null; });
      if (json && json.tracking === true && json.session_id === reportSessionId) {
        trackingReady = true;
        flushPendingEvents();
      }
    } catch (_) {}
  }

  function sendReportEvent(action, extra, preferBeacon) {
    if (!trackingReady) {
      if (action === "share") pendingShared = true;
      if (action === "duration") pendingDuration = Math.max(pendingDuration, Number(extra && extra.duration_seconds || 0));
      return;
    }
    try {
      var url = baseUrl();
      if (!url) return;
      var payload = Object.assign({
        token: value.toLowerCase(),
        session_id: reportSessionId,
        action: action
      }, extra || {});
      var body = JSON.stringify(payload);
      var endpoint = url + "/functions/v1/notify-report-event";

      if (preferBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain" }));
      } else {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function sendCurrentDuration(preferBeacon) {
    var seconds = Math.max(pendingDuration, currentVisibleSeconds());
    if (seconds < 1) return;
    if (!trackingReady) {
      pendingDuration = Math.max(pendingDuration, seconds);
      return;
    }
    if (seconds <= lastDurationSent) return;
    lastDurationSent = seconds;
    pendingDuration = 0;
    sendReportEvent("duration", { duration_seconds: seconds }, preferBeacon);
  }

  function flushPendingEvents() {
    if (!trackingReady) return;
    if (pendingShared) {
      pendingShared = false;
      sendReportEvent("share", null, false);
    }
    sendCurrentDuration(document.visibilityState === "hidden");
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      pauseVisibleTimer();
      sendCurrentDuration(true);
    } else {
      resumeVisibleTimer();
    }
  });
  window.addEventListener("pagehide", function () {
    pauseVisibleTimer();
    sendCurrentDuration(true);
  });

  async function shareReport() {
    var url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Звіт A·CEIL", url: url });
        sendReportEvent("share", { duration_seconds: currentVisibleSeconds() }, false);
        return;
      }
    } catch (_) {
      // Користувач закрив діалог "Поділитися" — це не помилка, нічого не шлемо.
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      sendReportEvent("share", { duration_seconds: currentVisibleSeconds() }, false);
      var btn = document.getElementById("rprShareBtn");
      if (btn) { var prev = btn.textContent; btn.textContent = "✅ Посилання скопійовано"; setTimeout(function () { btn.textContent = prev; }, 1800); }
    } catch (_) {}
  }
  window.__A·CEILShareReport = shareReport;

  var reportZoom = 1;
  function applyReportZoom(next) {
    reportZoom = Math.max(0.75, Math.min(3, Math.round(next * 4) / 4));
    var image = document.getElementById("rprReportImage");
    var label = document.getElementById("rprZoomLabel");
    if (image) {
      image.style.width = (reportZoom * 100) + "%";
      image.style.maxWidth = (reportZoom * 920) + "px";
    }
    if (label) label.textContent = Math.round(reportZoom * 100) + "%";
  }
  window.__A·CEILReportZoom = function (delta) { applyReportZoom(reportZoom + Number(delta || 0)); };
  window.__A·CEILReportZoomReset = function () { applyReportZoom(1); };

  function render(overlay, data) {
    if (data && data.reportType === "manager" && data.managerHtml) { document.open(); document.write(data.managerHtml); document.close(); return; }
    var meta = data.meta || {}, phone = String(meta.phone || "").replace(/[^+\d]/g, ""), map = route(data.location || null);
    overlay.innerHTML = '<header class="rpr-head"><div><b>A·CEIL PRO</b><h1>' + esc(meta.name || "Монтажний звіт") + '</h1></div><span>Монтажний лист</span></header><section class="rpr-info">' + (meta.address ? '<div>📍 ' + esc(meta.address) + '</div>' : "") + (phone ? '<div>📞 ' + esc(phone) + '</div>' : "") + (meta.comment ? '<div>💬 ' + esc(meta.comment) + '</div>' : "") + '</section><div class="rpr-actions">' + (map ? '<a href="' + esc(map) + '">🧭 Прокласти маршрут</a>' : "") + (phone ? '<a href="tel:' + esc(phone) + '">📞 Подзвонити клієнту</a>' : "") + '<a href="javascript:void(0)" id="rprShareBtn" onclick="window.__A·CEILShareReport()">🔗 Поділитися</a>' + '</div><div class="rpr-zoom" aria-label="Масштаб звіту"><button type="button" onclick="window.__A·CEILReportZoom(-0.25)" aria-label="Зменшити">−</button><button type="button" id="rprZoomLabel" onclick="window.__A·CEILReportZoomReset()" aria-label="Повернути масштаб 100%">100%</button><button type="button" onclick="window.__A·CEILReportZoom(0.25)" aria-label="Збільшити">+</button></div><img id="rprReportImage" class="rpr-image" src="' + esc(data.image || "") + '" alt="Звіт A·CEIL">';
    applyReportZoom(1);
  }
  async function start() {
    enableBrowserZoom();
    addStyle();
    var overlay = document.createElement("div"); overlay.id = "A·CEILPublicReportView"; overlay.innerHTML = '<div class="rpr-loading">⏳ Завантаження звіту…</div>'; document.body.appendChild(overlay);
    // Не даємо глобальним жестам редактора перехоплювати прокрутку/масштаб звіту.
    ["touchstart", "touchmove", "touchend"].forEach(function (eventName) {
      overlay.addEventListener(eventName, function (event) { event.stopPropagation(); }, { passive: true });
    });
    try {
      var data = await securePayload();
      render(overlay, data);
      resumeVisibleTimer();
      // Моніторинг запускається у фоні й ніколи не затримує показ звіту.
      notifyReportOpen();
    }
    catch (error) { overlay.innerHTML = '<div class="rpr-error">Звіт недоступний.<br><small>' + esc(error && error.message || error) + '</small></div>'; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
