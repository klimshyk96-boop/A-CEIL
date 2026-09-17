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
  function addStyle() {
    var style = document.createElement("style");
    style.textContent = "#A·CEILPublicReportView{position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#eef4ff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:14px;box-sizing:border-box}.rpr-loading,.rpr-error{max-width:620px;margin:20vh auto;background:#fff;border-radius:22px;padding:24px;text-align:center;font-weight:800;box-shadow:0 18px 50px rgba(15,23,42,.15)}.rpr-error{color:#b91c1c}.rpr-head{max-width:920px;margin:auto;display:flex;justify-content:space-between;align-items:flex-start;background:#fff;border-radius:20px 20px 0 0;padding:18px 18px 12px}.rpr-head b{color:#2563eb}.rpr-head h1{margin:5px 0 0;font-size:23px}.rpr-head span{font-size:12px;font-weight:800;color:#64748b}.rpr-info{max-width:920px;margin:auto;background:#fff;padding:0 18px 12px;line-height:1.55;color:#475569}.rpr-actions{max-width:920px;margin:auto;background:#fff;padding:0 18px 16px;display:grid;grid-template-columns:1fr 1fr;gap:9px}.rpr-actions a{min-height:48px;border-radius:14px;text-decoration:none;display:flex;align-items:center;justify-content:center;font-weight:850;background:#dcfce7;color:#047857}.rpr-actions a+a{background:#dbeafe;color:#1d4ed8}.rpr-image{display:block;width:min(100%,920px);height:auto;margin:0 auto 28px;border-radius:0 0 18px 18px;box-shadow:0 18px 50px rgba(15,23,42,.16)}@media(max-width:560px){#A·CEILPublicReportView{padding:0}.rpr-head{border-radius:0}.rpr-actions{grid-template-columns:1fr}.rpr-image{border-radius:0}}";
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
  function render(overlay, data) {
    if (data && data.reportType === "manager" && data.managerHtml) { document.open(); document.write(data.managerHtml); document.close(); return; }
    var meta = data.meta || {}, phone = String(meta.phone || "").replace(/[^+\d]/g, ""), map = route(data.location || null);
    overlay.innerHTML = '<header class="rpr-head"><div><b>A·CEIL PRO</b><h1>' + esc(meta.name || "Монтажний звіт") + '</h1></div><span>Монтажний лист</span></header><section class="rpr-info">' + (meta.address ? '<div>📍 ' + esc(meta.address) + '</div>' : "") + (phone ? '<div>📞 ' + esc(phone) + '</div>' : "") + (meta.comment ? '<div>💬 ' + esc(meta.comment) + '</div>' : "") + '</section><div class="rpr-actions">' + (map ? '<a href="' + esc(map) + '">🧭 Прокласти маршрут</a>' : "") + (phone ? '<a href="tel:' + esc(phone) + '">📞 Подзвонити клієнту</a>' : "") + '</div><img class="rpr-image" src="' + esc(data.image || "") + '" alt="Звіт A·CEIL">';
  }
  async function start() {
    addStyle();
    var overlay = document.createElement("div"); overlay.id = "A·CEILPublicReportView"; overlay.innerHTML = '<div class="rpr-loading">⏳ Завантаження звіту…</div>'; document.body.appendChild(overlay);
    try { render(overlay, await securePayload()); }
    catch (error) { overlay.innerHTML = '<div class="rpr-error">Звіт недоступний.<br><small>' + esc(error && error.message || error) + '</small></div>'; }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
