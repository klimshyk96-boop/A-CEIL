(function () {
  "use strict";
  if (window.__A_CEIL_REPORT_LINKS_V2) return;
  window.__A_CEIL_REPORT_LINKS_V2 = true;

  function sb() {
    try { return (typeof _sb !== "undefined" && _sb) || window._sb || null; }
    catch (_) { return window._sb || null; }
  }

  function user() {
    try { return (typeof _sbUser !== "undefined" && _sbUser) || window._sbUser || null; }
    catch (_) { return window._sbUser || null; }
  }

  function projects() {
    try {
      if (window["A·CEIL"] && window["A·CEIL"].ProjectRepository) {
        return window["A·CEIL"].ProjectRepository.list() || [];
      }
      return typeof getProjects === "function" ? getProjects() || [] : [];
    } catch (_) { return []; }
  }

  function uuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function activeProject(reference) {
    var list = projects();
    var activeObject = null, currentProject = null;
    try { activeObject = typeof _activeObjectId !== "undefined" ? _activeObjectId : window._activeObjectId; } catch (_) { activeObject = window._activeObjectId; }
    try { currentProject = typeof _currentProjectId !== "undefined" ? _currentProjectId : window._currentProjectId; } catch (_) { currentProject = window._currentProjectId; }
    var refs = [reference, activeObject, currentProject]
      .filter(function (x) { return x !== null && x !== undefined && x !== ""; })
      .map(String);
    var found = list.find(function (p) {
      return [p && p.id, p && p._dbId, p && p._localId].some(function (id) {
        return id !== null && id !== undefined && refs.indexOf(String(id)) >= 0;
      });
    });
    if (!found && list.length === 1) found = list[0];
    return found || null;
  }

  function dbId(project) {
    var id = project && (project._dbId || project.id);
    return uuid(id) ? String(id) : "";
  }

  function token() {
    var bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function publicUrl(value) {
    return location.origin.replace(/\/$/, "") + "/report/" + value;
  }

  function patchLocal(project, values) {
    if (!project) return;
    Object.assign(project, values);
    try {
      if (window["A·CEIL"] && window["A·CEIL"].ProjectRepository) {
        window["A·CEIL"].ProjectRepository.replaceAll(projects());
      } else if (typeof setProjects === "function") setProjects(projects());
    } catch (_) {}
    try {
      if (window.A_CEIL_ProjectCRM && window.A_CEIL_ProjectCRM.noteReport) {
        window.A_CEIL_ProjectCRM.noteReport(project, values);
      }
    } catch (_) {}
    try { if (typeof renderProjects === "function") setTimeout(function () { renderProjects(); }, 0); }
    catch (_) {}
    try { window.dispatchEvent(new CustomEvent("aceil:report-link-change", { detail: { projectId: dbId(project) || project.id || null } })); }
    catch (_) {}
  }

  async function publishPayload(payload, options) {
    options = options || {};
    var client = sb();
    if (!client || !user()) throw new Error("Для публікації КП потрібне підключення до хмари");
    var project = activeProject(options.projectId);
    var projectId = dbId(project);
    if (!projectId) throw new Error("Спочатку збережіть активний проєкт у хмарі");

    var value = token();
    var expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    var safePayload = Object.assign({}, payload || {}, { expiresAt: expires });
    var result = await client.rpc("aceil_publish_report_link", {
      p_project_id: projectId,
      p_token: value,
      p_payload: safePayload,
      p_expires_at: expires
    });
    if (result.error) throw result.error;
    patchLocal(project, {
      report_token: value,
      report_published_at: new Date().toISOString(),
      report_expires_at: expires
    });
    return publicUrl(value);
  }

  async function revoke(reference) {
    var client = sb();
    if (!client || !user()) throw new Error("Немає підключення до хмари");
    var project = activeProject(reference);
    var projectId = dbId(project);
    if (!projectId) throw new Error("Проєкт не знайдено");
    var result = await client.rpc("aceil_revoke_report_link", { p_project_id: projectId });
    if (result.error) throw result.error;
    patchLocal(project, { report_token: null, report_published_at: null, report_expires_at: null });
    return true;
  }

  function reportStatus(reference) {
    var project = activeProject(reference);
    if (!project || !project.report_token) return { status: "none", project: project };
    var expires = project.report_expires_at ? new Date(project.report_expires_at) : null;
    if (expires && expires.getTime() <= Date.now()) return { status: "expired", project: project, expiresAt: expires };
    return { status: "active", project: project, expiresAt: expires, url: publicUrl(project.report_token) };
  }

  window.A_CEIL_ReportLinks = {
    publishPayload: publishPayload,
    revoke: revoke,
    status: reportStatus,
    resolveProject: activeProject
  };
  window.A_CEILRevokeReport = revoke;

  function updateClassicUi(url, sourceButton) {
    var doc = sourceButton && sourceButton.ownerDocument || document;
    var panel = doc.getElementById("cloudReportReady") || doc.getElementById("cloudReady");
    var input = doc.getElementById("cloudReportUrl") || doc.getElementById("cloudUrl");
    var status = doc.getElementById("cloudStatus") || doc.getElementById("reportStatus");
    var button = sourceButton || doc.getElementById("btnPublishReport") || doc.getElementById("cloud");
    if (input) input.value = url;
    if (panel) { panel.dataset.url = url; panel.hidden = false; panel.style.display = "block"; }
    if (button) { button.dataset.reportUrl = url; button.style.display = "none"; }
    if (status) status.textContent = "☁️ посилання готове";
  }

  function classicFailure(error, sourceButton) {
    var doc = sourceButton && sourceButton.ownerDocument || document;
    var panel = doc.getElementById("cloudReportReady") || doc.getElementById("cloudReady");
    var status = doc.getElementById("cloudStatus") || doc.getElementById("reportStatus");
    var button = sourceButton || doc.getElementById("btnPublishReport") || doc.getElementById("cloud");
    if (panel) { panel.dataset.url = ""; panel.hidden = true; panel.style.display = "none"; }
    if (button) { button.dataset.reportUrl = ""; button.style.display = ""; button.disabled = false; button.textContent = "🔗 Повторити"; }
    if (status) { status.textContent = "Не вдалося створити посилання: " + (error.message || error); status.style.color = "#b91c1c"; }
    try { if (typeof showToast === "function") showToast("Не вдалося створити посилання: " + (error.message || error)); }
    catch (_) {}
  }

  function wrapClassicPublisher() {
    var previous = window["A·CEILPublishReport"];
    if (typeof previous !== "function" || previous.__secureReportV2) return;
    var wrapped = async function () {
      var sourceButton = arguments[1] || null;
      try {
        if (typeof window.A_CEIL_GetReportPayload !== "function") throw new Error("Дані звіту ще не готові. Сформуйте звіт повторно");
        var report = window.A_CEIL_GetReportPayload(arguments[0]);
        if (!report || !report.payload) throw new Error("Не вдалося підготувати дані звіту");
        var url = await publishPayload(report.payload, { projectId: report.projectId });
        updateClassicUi(url, sourceButton);
        return url;
      } catch (error) {
        classicFailure(error, sourceButton);
        return null;
      }
    };
    wrapped.__secureReportV2 = true;
    window["A·CEILPublishReport"] = wrapped;
    try { A·CEILPublishReport = wrapped; } catch (_) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wrapClassicPublisher, { once: true });
  else setTimeout(wrapClassicPublisher, 0);
})();
