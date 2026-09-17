(function () {
  "use strict";
  if (window.__A_CEIL_PROJECT_CRM_V2) return;
  window.__A_CEIL_PROJECT_CRM_V2 = true;

  var SOURCES = [["", "Не вказано"], ["site", "Сайт"], ["instagram", "Instagram"], ["recommendation", "Рекомендація"], ["call", "Дзвінок"], ["other", "Інше"]];
  var STATUSES = [["new", "Нове КП"], ["in_progress", "В роботі"], ["won", "Договір підписано"], ["lost", "Відмова"]];
  var STORE = "A_CEIL_project_crm_v2";
  var REPORT_CACHE = Object.create(null);

  function client() { try { return (typeof _sb !== "undefined" && _sb) || window._sb || null; } catch (_) { return window._sb || null; } }
  function signedUser() { try { return (typeof _sbUser !== "undefined" && _sbUser) || window._sbUser || null; } catch (_) { return window._sbUser || null; } }
  function list() { try { return typeof getProjects === "function" ? getProjects() || [] : []; } catch (_) { return []; } }
  function saveList(items) { try { if (typeof setProjects === "function") setProjects(items); } catch (_) {} }
  function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function fingerprint(p) { return [clean(p && p.name).toLowerCase(), clean(p && p.addr).toLowerCase(), clean(p && p.phone).replace(/\D/g, "")].join("|"); }
  function activeRefs(ref) {
    var current = null, object = null;
    try { current = typeof _currentProjectId !== "undefined" ? _currentProjectId : window._currentProjectId; } catch (_) { current = window._currentProjectId; }
    try { object = typeof _activeObjectId !== "undefined" ? _activeObjectId : window._activeObjectId; } catch (_) { object = window._activeObjectId; }
    return [ref, current, object].filter(function (x) { return x != null && x !== ""; }).map(String);
  }
  function projectBy(ref) {
    var refs = activeRefs(ref);
    var items = list();
    return items.find(function (p) { return [p.id, p._dbId, p._localId].some(function (id) { return id != null && refs.indexOf(String(id)) >= 0; }); }) || (items.length === 1 ? items[0] : null);
  }
  function readStore() { try { var x = JSON.parse(localStorage.getItem(STORE) || "{}"); return x && typeof x === "object" ? x : {}; } catch (_) { return {}; } }
  function writeStore(data) { try { localStorage.setItem(STORE, JSON.stringify(data || {})); } catch (_) {} }
  function recordKey(p) { return clean(p && (p._dbId || p.id)) || fingerprint(p); }
  function remember(p, values) {
    if (!p) return;
    Object.assign(p, values || {});
    var data = readStore(), key = recordKey(p), fp = fingerprint(p);
    data[key] = Object.assign({}, data[key] || {}, values || {}, { fingerprint: fp, updatedAt: Date.now() });
    writeStore(data); saveList(list());
  }
  function restoreLocal() {
    var data = readStore(), items = list(), changed = false;
    items.forEach(function (p) {
      var row = data[recordKey(p)] || Object.keys(data).map(function (k) { return data[k]; }).find(function (x) { return x.fingerprint && x.fingerprint === fingerprint(p); });
      if (row) { ["order_source", "deal_status", "report_token", "report_published_at", "report_expires_at"].forEach(function (k) { if (row[k] !== undefined) p[k] = row[k]; }); changed = true; }
    });
    if (changed) saveList(items);
  }

  function hasActiveReport(p) {
    if (!p) return false;
    var cached = REPORT_CACHE[String(p._dbId || p.id || "")];
    var source = p.report_token ? p : cached;
    if (!source || !source.report_token) return false;
    if (!source.report_expires_at) return true;
    var expires = new Date(source.report_expires_at).getTime();
    return !isFinite(expires) || expires > Date.now();
  }
  function decorateReportBadges() {
    try {
      var items = list();
      document.querySelectorAll("#projectsList .rp-project-card").forEach(function (card) {
        var action = card.querySelector('[onclick*="editProject"]'), attr = action && action.getAttribute("onclick") || "";
        var match = attr.match(/editProject\(['\"]([^'\"]+)['\"]\)/), id = match && match[1];
        var p = id && items.find(function (x) { return [x.id, x._dbId, x._localId].some(function (v) { return v != null && String(v) === String(id); }); });
        var head = card.querySelector(".rp-project-head"), old = card.querySelector(".aceil-report-active-badge");
        if (!head || !hasActiveReport(p)) { if (old) old.remove(); return; }
        if (old) return;
        var badge = document.createElement("span");
        badge.className = "aceil-report-active-badge";
        badge.textContent = "🔗 ЗВІТ";
        badge.title = "Для цього проєкту відкрите активне посилання на звіт";
        badge.style.cssText = "display:inline-flex;align-items:center;flex:0 0 auto;white-space:nowrap;padding:5px 8px;border-radius:9px;background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;font-size:10px;font-weight:950;letter-spacing:.03em;box-shadow:0 4px 11px rgba(220,38,38,.34);border:1px solid rgba(255,255,255,.75)";
        var title = head.querySelector(".rp-project-title");
        head.insertBefore(badge, title && title.nextSibling || head.firstChild);
      });
    } catch (_) {}
  }
  function installReportBadges() {
    var old = window.renderProjects || (typeof renderProjects === "function" ? renderProjects : null);
    if (typeof old !== "function" || old.__reportBadgesV1) return;
    var next = function () { var result = old.apply(this, arguments); setTimeout(decorateReportBadges, 0); return result; };
    next.__reportBadgesV1 = true;
    window.renderProjects = next;
    try { renderProjects = next; } catch (_) {}
    window.addEventListener("aceil:report-link-change", function () {
      refresh().catch(function () { setTimeout(decorateReportBadges, 0); });
    });
  }

  function options(values) { return values.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(""); }
  function fieldBlock(prefix) {
    var wrap = document.createElement("div"); wrap.id = prefix + "CrmFields"; wrap.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 16px";
    wrap.innerHTML = '<div><label style="font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.06em">ДЖЕРЕЛО ЗАМОВЛЕННЯ</label><select id="' + prefix + 'OrderSource" style="width:100%;box-sizing:border-box;padding:12px 10px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;font-size:14px;margin-top:6px">' + options(SOURCES) + '</select></div><div><label style="font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.06em">СТАТУС УГОДИ</label><select id="' + prefix + 'DealStatus" style="width:100%;box-sizing:border-box;padding:12px 8px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;font-size:14px;margin-top:6px">' + options(STATUSES) + '</select></div>';
    return wrap;
  }
  function installFields(modalId, commentId, prefix) {
    var modal = document.getElementById(modalId), comment = document.getElementById(commentId);
    if (!modal || !comment || document.getElementById(prefix + "CrmFields")) return;
    comment.insertAdjacentElement("afterend", fieldBlock(prefix));
  }
  function installReportBox() {
    var modal = document.getElementById("editProjectModal"), fields = document.getElementById("editCrmFields");
    if (!modal || !fields || document.getElementById("editReportAccess")) return;
    var box = document.createElement("div"); box.id = "editReportAccess"; box.style.cssText = "margin:-4px 0 16px;padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0";
    box.innerHTML = '<div id="editReportState" style="font-size:13px;font-weight:800;color:#64748b">🔗 Посилання на КП не створено</div><div style="display:flex;gap:8px;margin-top:9px"><button type="button" id="editReportOpen" style="display:none;flex:1;padding:10px;border:0;border-radius:10px;background:#dbeafe;color:#1d4ed8;font-weight:800">Відкрити</button><button type="button" id="editReportRevoke" style="display:none;flex:1;padding:10px;border:0;border-radius:10px;background:#fee2e2;color:#b91c1c;font-weight:800">Закрити доступ</button></div>';
    fields.insertAdjacentElement("afterend", box);
    document.getElementById("editReportOpen").onclick = function () { var box = document.getElementById("editReportAccess"); if (box && box.dataset.url) window.open(box.dataset.url, "_blank", "noopener"); };
    document.getElementById("editReportRevoke").onclick = async function () {
      if (!confirm("Закрити доступ до опублікованого КП?")) return;
      this.disabled = true;
      try { await window.A_CEIL_ReportLinks.revoke(document.getElementById("editProjId").value); await updateReportBox(); if (typeof showToast === "function") showToast("🔒 Доступ до КП закрито"); }
      catch (e) { if (typeof showToast === "function") showToast("Не вдалося закрити доступ: " + (e.message || e)); }
      finally { this.disabled = false; }
    };
  }
  async function updateReportBox() {
    var state = document.getElementById("editReportState"), open = document.getElementById("editReportOpen"), revoke = document.getElementById("editReportRevoke"), box = document.getElementById("editReportAccess");
    if (!state || !open || !revoke || !box) return;
    state.textContent = "⏳ Перевіряємо посилання на КП…"; open.style.display = "none"; revoke.style.display = "none"; box.dataset.url = "";
    var ref = document.getElementById("editProjId").value, p = projectBy(ref), db = p && (p._dbId || p.id), row = null, c = client();
    if (c && uuid(db)) {
      var result = await c.from("projects").select("id,report_token,report_published_at,report_expires_at").eq("id", db).single();
      if (result.error) { state.textContent = "⚠️ Не вдалося перевірити посилання: " + (result.error.message || "помилка Supabase"); return; }
      row = result.data || null;
      if (p && row) remember(p, row);
    } else if (p) row = p;
    if (!row || !row.report_token) { state.textContent = "🔗 Посилання на КП не створено"; return; }
    var expires = row.report_expires_at ? new Date(row.report_expires_at) : null;
    if (expires && expires.getTime() <= Date.now()) { state.textContent = "⌛ Термін дії КП закінчився"; revoke.style.display = "block"; return; }
    box.dataset.url = location.origin.replace(/\/$/, "") + "/report/" + row.report_token;
    state.textContent = "🔗 КП активне до " + (expires && !isNaN(expires.getTime()) ? expires.toLocaleDateString("uk-UA") : "без вказаної дати");
    open.style.display = "block"; revoke.style.display = "block";
  }
  function values(prefix) { return { order_source: clean(document.getElementById(prefix + "OrderSource") && document.getElementById(prefix + "OrderSource").value), deal_status: clean(document.getElementById(prefix + "DealStatus") && document.getElementById(prefix + "DealStatus").value) || "new" }; }
  function fill(prefix, p) {
    var source = document.getElementById(prefix + "OrderSource"), status = document.getElementById(prefix + "DealStatus");
    if (source) source.value = clean(p && p.order_source); if (status) status.value = clean(p && p.deal_status) || "new";
  }
  async function push(p) {
    var db = p && (p._dbId || p.id), c = client(); if (!c || !uuid(db)) return;
    var result = await c.from("projects").update({ order_source: clean(p.order_source) || null, deal_status: clean(p.deal_status) || "new" }).eq("id", db);
    if (result.error) throw result.error;
  }
  async function refresh() {
    var c = client(), currentUser = signedUser(); if (!c || !currentUser || !currentUser.id) return;
    var result = await c.from("projects").select("id,order_source,deal_status,report_token,report_published_at,report_expires_at").eq("user_id", currentUser.id);
    if (result.error) return;
    var items = list(), data = readStore(), changed = false;
    (result.data || []).forEach(function (row) {
      REPORT_CACHE[String(row.id)] = row;
      var p = items.find(function (x) { return String(x._dbId || x.id) === String(row.id); });
      if (!p) return;
      Object.assign(p, row); changed = true;
      var key = recordKey(p); data[key] = Object.assign({}, data[key] || {}, row, { fingerprint: fingerprint(p), updatedAt: Date.now() });
    });
    if (changed) { writeStore(data); saveList(items); try { if (typeof renderProjects === "function") renderProjects(); } catch (_) {} }
    setTimeout(decorateReportBadges, 0);
  }
  function afterSave(prefix, ref) {
    setTimeout(function () { var p = projectBy(ref), v = values(prefix); if (!p) return; remember(p, v); push(p).catch(function () {}); }, 100);
  }
  function wrap(name, before, after) {
    var old = window[name]; if (typeof old !== "function" || old.__crmV2) return;
    var next = function () { var ctx = before ? before.apply(this, arguments) : null, result = old.apply(this, arguments); return Promise.resolve(result).then(function (value) { if (after) after(ctx, value); return value; }); };
    next.__crmV2 = true; window[name] = next; try { if (name === "saveProject") saveProject = next; else if (name === "saveEditProject") saveEditProject = next; else if (name === "createObject") createObject = next; else if (name === "loadProjectsFromCloud") loadProjectsFromCloud = next; } catch (_) {}
  }
  function install() {
    installFields("saveProjectModal", "projComment", "proj"); installFields("editProjectModal", "editProjComment", "edit"); installFields("newObjectModal", "newObjComment", "newObj"); installReportBox(); installReportBadges(); restoreLocal();
    var oldEdit = window.editProject; if (typeof oldEdit === "function" && !oldEdit.__crmV2) { window.editProject = function (id) { var r = oldEdit.apply(this, arguments); setTimeout(function () { fill("edit", projectBy(id)); updateReportBox().catch(function (error) { var state = document.getElementById("editReportState"); if (state) state.textContent = "⚠️ Не вдалося перевірити посилання: " + (error.message || error); }); }, 20); return r; }; window.editProject.__crmV2 = true; try { editProject = window.editProject; } catch (_) {} }
    var oldOpen = window.openSaveProjectModal; if (typeof oldOpen === "function" && !oldOpen.__crmV2) { window.openSaveProjectModal = function () { var r = oldOpen.apply(this, arguments); setTimeout(function () { fill("proj", projectBy()); }, 20); return r; }; window.openSaveProjectModal.__crmV2 = true; try { openSaveProjectModal = window.openSaveProjectModal; } catch (_) {} }
    var oldNew = window.openNewObjectModal; if (typeof oldNew === "function" && !oldNew.__crmV2) { window.openNewObjectModal = function () { var r = oldNew.apply(this, arguments); setTimeout(function () { fill("newObj", null); }, 20); return r; }; window.openNewObjectModal.__crmV2 = true; try { openNewObjectModal = window.openNewObjectModal; } catch (_) {} }
    var oldProjects = window.openProjectsModal; if (typeof oldProjects === "function" && !oldProjects.__reportBadgesV2) {
      window.openProjectsModal = function () {
        var result = oldProjects.apply(this, arguments);
        setTimeout(decorateReportBadges, 0);
        refresh().catch(function () {});
        return result;
      };
      window.openProjectsModal.__reportBadgesV2 = true;
      try { openProjectsModal = window.openProjectsModal; } catch (_) {}
    }
    wrap("saveProject", function () { return { refs: activeRefs(), values: values("proj") }; }, function (x) { var p = projectBy(activeRefs()[0] || x.refs[0]); if (p) { remember(p, x.values); push(p).catch(function () {}); } });
    wrap("saveEditProject", function () { return { ref: document.getElementById("editProjId").value, values: values("edit") }; }, function (x) { var p = projectBy(x.ref); if (p) { remember(p, x.values); push(p).catch(function () {}); } });
    wrap("createObject", function () { return values("newObj"); }, function (v) { var p = projectBy(activeRefs()[0]); if (p) { remember(p, v); push(p).catch(function () {}); } });
    wrap("loadProjectsFromCloud", null, function () { restoreLocal(); refresh().catch(function () {}); });
    var oldSync = window._syncObjectToCloud;
    if (typeof oldSync === "function" && !oldSync.__crmV2) {
      window._syncObjectToCloud = async function (object) {
        var result = await oldSync.apply(this, arguments);
        var p = projectBy(object && (object._dbId || object.id)) || object;
        if (p) { remember(p, { order_source: clean(p.order_source), deal_status: clean(p.deal_status) || "new" }); await push(p).catch(function () {}); }
        return result;
      };
      window._syncObjectToCloud.__crmV2 = true;
      window._updateObjectInCloud = window._syncObjectToCloud;
      try { _syncObjectToCloud = window._syncObjectToCloud; _updateObjectInCloud = window._syncObjectToCloud; } catch (_) {}
    }
    refresh().catch(function () {});
  }
  window.A_CEIL_ProjectCRM = { refresh: refresh, noteReport: remember };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
