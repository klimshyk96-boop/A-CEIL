(function () {
  "use strict";
  if (window.__A_CEIL_PROJECT_CRM_V2) return;
  window.__A_CEIL_PROJECT_CRM_V2 = true;

  var SOURCES = [["", "Не вказано"], ["site", "Сайт"], ["instagram", "Instagram"], ["recommendation", "Рекомендація"], ["call", "Дзвінок"], ["other", "Інше"]];
  var STATUSES = [["new", "Нове КП"], ["in_progress", "В роботі"], ["won", "Договір підписано"], ["lost", "Відмова"]];
  var STORE = "A_CEIL_project_crm_v2";

  function client() { try { return (typeof _sb !== "undefined" && _sb) || window._sb || null; } catch (_) { return window._sb || null; } }
  function signedUser() { try { return (typeof _sbUser !== "undefined" && _sbUser) || window._sbUser || null; } catch (_) { return window._sbUser || null; } }
  function list() { try { return typeof getProjects === "function" ? getProjects() || [] : []; } catch (_) { return []; } }
  function saveList(items) { try { if (typeof setProjects === "function") setProjects(items); } catch (_) {} }
  function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "")); }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function fingerprint(p) { return [clean(p && p.name).toLowerCase(), clean(p && p.addr).toLowerCase(), clean(p && p.phone).replace(/\D/g, "")].join("|"); }
  function projectBy(ref) {
    var refs = [ref, window._currentProjectId, window._activeObjectId].filter(function (x) { return x != null && x !== ""; }).map(String);
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
    document.getElementById("editReportOpen").onclick = function () { var status = window.A_CEIL_ReportLinks && window.A_CEIL_ReportLinks.status(document.getElementById("editProjId").value); if (status && status.url) window.open(status.url, "_blank", "noopener"); };
    document.getElementById("editReportRevoke").onclick = async function () {
      if (!confirm("Закрити доступ до опублікованого КП?")) return;
      this.disabled = true;
      try { await window.A_CEIL_ReportLinks.revoke(document.getElementById("editProjId").value); updateReportBox(); if (typeof showToast === "function") showToast("🔒 Доступ до КП закрито"); }
      catch (e) { if (typeof showToast === "function") showToast("Не вдалося закрити доступ: " + (e.message || e)); }
      finally { this.disabled = false; }
    };
  }
  function updateReportBox() {
    var state = document.getElementById("editReportState"), open = document.getElementById("editReportOpen"), revoke = document.getElementById("editReportRevoke");
    if (!state || !window.A_CEIL_ReportLinks) return;
    var status = window.A_CEIL_ReportLinks.status(document.getElementById("editProjId").value);
    if (status.status === "active") { state.textContent = "🔗 КП активне до " + (status.expiresAt ? status.expiresAt.toLocaleDateString("uk-UA") : "—"); open.style.display = "block"; revoke.style.display = "block"; }
    else if (status.status === "expired") { state.textContent = "⌛ Термін дії КП закінчився"; open.style.display = "none"; revoke.style.display = "block"; }
    else { state.textContent = "🔗 Посилання на КП не створено"; open.style.display = "none"; revoke.style.display = "none"; }
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
    var items = list(); (result.data || []).forEach(function (row) { var p = items.find(function (x) { return String(x._dbId || x.id) === String(row.id); }); if (p) remember(p, row); }); saveList(items);
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
    installFields("saveProjectModal", "projComment", "proj"); installFields("editProjectModal", "editProjComment", "edit"); installFields("newObjectModal", "newObjComment", "newObj"); installReportBox(); restoreLocal();
    var oldEdit = window.editProject; if (typeof oldEdit === "function" && !oldEdit.__crmV2) { window.editProject = function (id) { var r = oldEdit.apply(this, arguments); setTimeout(function () { refresh().catch(function () {}).finally(function () { fill("edit", projectBy(id)); updateReportBox(); }); }, 20); return r; }; window.editProject.__crmV2 = true; try { editProject = window.editProject; } catch (_) {} }
    var oldOpen = window.openSaveProjectModal; if (typeof oldOpen === "function" && !oldOpen.__crmV2) { window.openSaveProjectModal = function () { var r = oldOpen.apply(this, arguments); setTimeout(function () { fill("proj", projectBy()); }, 20); return r; }; window.openSaveProjectModal.__crmV2 = true; try { openSaveProjectModal = window.openSaveProjectModal; } catch (_) {} }
    var oldNew = window.openNewObjectModal; if (typeof oldNew === "function" && !oldNew.__crmV2) { window.openNewObjectModal = function () { var r = oldNew.apply(this, arguments); setTimeout(function () { fill("newObj", null); }, 20); return r; }; window.openNewObjectModal.__crmV2 = true; try { openNewObjectModal = window.openNewObjectModal; } catch (_) {} }
    wrap("saveProject", function () { return { ref: window._currentProjectId, values: values("proj") }; }, function (x) { var p = projectBy(window._currentProjectId || x.ref); if (p) { remember(p, x.values); push(p).catch(function () {}); } });
    wrap("saveEditProject", function () { return { ref: document.getElementById("editProjId").value, values: values("edit") }; }, function (x) { var p = projectBy(x.ref); if (p) { remember(p, x.values); push(p).catch(function () {}); } });
    wrap("createObject", function () { return values("newObj"); }, function (v) { afterSave("newObj", window._activeObjectId); var p = projectBy(window._activeObjectId); if (p) remember(p, v); });
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
