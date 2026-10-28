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
    var explicit = reference !== null && reference !== undefined && reference !== "";
    var refs = (explicit ? [reference] : [activeObject, currentProject])
      .filter(function (x) { return x !== null && x !== undefined && x !== ""; })
      .map(String);
    // Resolve references in priority order, independent of project list order.
    for (var i = 0; i < refs.length; i++) {
      var found = list.find(function (p) {
        return [p && p.id, p && p._dbId, p && p._localId].some(function (id) {
          return id !== null && id !== undefined && String(id) === refs[i];
        });
      });
      if (found) return found;
    }
    return !explicit && list.length === 1 ? list[0] : null;
  }

  function dbId(project) {
    var id = project && (project._dbId || project.id);
    return uuid(id) ? String(id) : "";
  }

  function expandCompactToken(value) {
    value = String(value || "").toLowerCase();
    // Supabase's existing RPC contract accepts a 64-character hexadecimal
    // token. New links expose only the first 80 random bits and rebuild the
    // compatible storage token locally, so no database migration is needed.
    return /^[a-f0-9]{20}$/.test(value) ? value + value + value + value.slice(0, 4) : value;
  }

  function compactToken(value) {
    value = String(value || "").toLowerCase();
    if (/^[a-f0-9]{64}$/.test(value)) {
      var shortValue = value.slice(0, 20);
      if (expandCompactToken(shortValue) === value) return shortValue;
    }
    return value;
  }

  function token() {
    // 80 random bits remain in the public URL; storage keeps the existing
    // 64-hex RPC format for backward compatibility.
    var bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    var shortValue = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    return expandCompactToken(shortValue);
  }

  function publicUrl(value) {
    return "https://a-ceil.pp.ua/r/" + compactToken(value);
  }

  function withTimeout(promise, milliseconds, message) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error(message || "Операція триває надто довго"));
      }, milliseconds);
      Promise.resolve(promise).then(function (value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function canvasDataUrl(canvas, quality, fallback) {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () { finish(""); }, 7000);
      function finish(value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value || "");
      }
      function read(blob) {
        if (!blob) return finish("");
        var reader = new FileReader();
        reader.onload = function () { finish(typeof reader.result === "string" ? reader.result : ""); };
        reader.onerror = reader.onabort = function () { finish(""); };
        try { reader.readAsDataURL(blob); } catch (_) { finish(""); }
      }
      try {
        if (typeof canvas.toBlob === "function") {
          canvas.toBlob(read, "image/webp", quality || 0.84);
        } else {
          var value = canvas.toDataURL("image/jpeg", quality || 0.84);
          finish(value && value.length < String(fallback || "").length ? value : fallback);
        }
      } catch (_) { finish(""); }
    });
  }

  function optimizeImage(dataUrl, maxWidth, maxPixels, quality) {
    if (!/^data:image\//i.test(String(dataUrl || "")) || String(dataUrl).length < 240000) {
      return Promise.resolve(dataUrl || "");
    }
    return new Promise(function (resolve) {
      var image = new Image();
      var settled = false;
      var timer = setTimeout(function () { finish(dataUrl); }, 10000);
      function finish(value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        image.onload = image.onerror = null;
        resolve(value || dataUrl);
      }
      image.onload = async function () {
        try {
          var sourceWidth = image.naturalWidth || image.width || 1;
          var sourceHeight = image.naturalHeight || image.height || 1;
          var ratio = Math.min(
            1,
            (maxWidth || 1280) / sourceWidth,
            Math.sqrt((maxPixels || 4500000) / (sourceWidth * sourceHeight))
          );
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(sourceWidth * ratio));
          canvas.height = Math.max(1, Math.round(sourceHeight * ratio));
          var context = canvas.getContext("2d", { alpha: false });
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          var optimized = await canvasDataUrl(canvas, quality || 0.84, dataUrl);
          finish(optimized && optimized.length < String(dataUrl).length ? optimized : dataUrl);
        } catch (_) { finish(dataUrl); }
      };
      image.onerror = function () { finish(dataUrl); };
      try { image.src = dataUrl; } catch (_) { finish(dataUrl); }
    });
  }

  async function optimizePayload(payload, options) {
    options = options || {};
    var optimized = Object.assign({}, payload || {});
    if (optimized.presentation === "generated-report" && optimized.image) {
      // Public links show the already approved report 1:1. Structured data is
      // intentionally removed here so the viewer cannot replace that report
      // with its separately responsive/mobile reconstruction.
      if (!options.backgroundSafe) {
        optimized.image = await optimizeImage(optimized.image, 1600, 6500000, 0.90);
      }
      delete optimized.structured;
    } else if (optimized.structured && optimized.structured.drawing) {
      optimized.structured = Object.assign({}, optimized.structured);
      // Safari pauses requestAnimationFrame/Image/canvas work in the opener as
      // soon as the report popup becomes the active tab. In that case keep the
      // already prepared drawing and only remove the duplicate full snapshot.
      if (!options.backgroundSafe) {
        optimized.structured.drawing = await optimizeImage(optimized.structured.drawing, 1600, 3500000, 0.94);
      }
      // The structured cloud page renders this drawing directly. Keeping the
      // full canvas snapshot too only doubles the upload and can freeze Safari.
      delete optimized.image;
    } else if (optimized.image) {
      optimized.image = await optimizeImage(optimized.image, 1600, 6500000, 0.90);
    }
    return optimized;
  }

  function patchLocal(project, values) {
    if (!project) return;
    Object.assign(project, values);
    try {
      if (window["A·CEIL"] && window["A·CEIL"].ProjectRepository) {
        window["A·CEIL"].ProjectRepository.replaceAll(projects());
      } else if (typeof setProjects === "function") setProjects(projects());
    } catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try {
      if (window.A_CEIL_ProjectCRM && window.A_CEIL_ProjectCRM.noteReport) {
        window.A_CEIL_ProjectCRM.noteReport(project, values);
      }
    } catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try { if (typeof renderProjects === "function") setTimeout(function () { renderProjects(); }, 0); }
    catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try { window.dispatchEvent(new CustomEvent("aceil:report-link-change", { detail: { projectId: dbId(project) || project.id || null } })); }
    catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  async function publishPayload(payload, options) {
    options = options || {};
    var client = sb();
    if (!client || !user()) throw new Error("Для публікації КП потрібне підключення до хмари");
    var project = activeProject(options.projectId);
    var projectId = dbId(project);
    if (!projectId) throw new Error("Спочатку збережіть активний проєкт у хмарі");

    var value = token();
    var expires = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
    if (typeof options.onProgress === "function") options.onProgress("Оптимізація креслення…");
    var safePayload = Object.assign(await optimizePayload(payload, options), { expiresAt: expires });
    if (typeof options.onProgress === "function") options.onProgress("Завантаження звіту в хмару…");
    // Every publication is an immutable snapshot. The legacy project fields are
    // still refreshed below for the project list/CRM, but they are no longer
    // the authority for previously shared URLs.
    var snapshotResult = await withTimeout(client.rpc("aceil_publish_report_snapshot", {
      p_project_id: projectId,
      p_token: value,
      p_payload: safePayload,
      p_expires_at: expires
    }), 30000, "Хмара не відповіла за 30 секунд. Перевірте інтернет і повторіть");
    var snapshotReady = !snapshotResult.error;
    var snapshotUnavailable = snapshotResult.error && (
      snapshotResult.error.code === "PGRST202" ||
      /aceil_publish_report_snapshot|schema cache|function/i.test(String(snapshotResult.error.message || snapshotResult.error))
    );
    if (snapshotResult.error && !snapshotUnavailable) throw snapshotResult.error;

    var result = await withTimeout(client.rpc("aceil_publish_report_link", {
      p_project_id: projectId,
      p_token: value,
      p_payload: safePayload,
      p_expires_at: expires
    }), 30000, "Хмара не відповіла за 30 секунд. Перевірте інтернет і повторіть");
    // Before the snapshot migration exists the legacy RPC remains the safe
    // compatibility path. Once snapshots are available, a failure to refresh
    // the single "latest report" badge must not invalidate the new URL.
    if (result.error && !snapshotReady) throw result.error;
    patchLocal(project, {
      report_token: value,
      report_published_at: new Date().toISOString(),
      report_expires_at: expires
    });
    // Remember WHICH calculation this link shows (main estimate, an economy
    // variant, or the comparison) so the person can see what the client has.
    try {
      var variants = window.A_CEIL_EstimateVariants;
      if (variants && typeof variants.recordPublication === "function") {
        variants.recordPublication(project, {
          token: compactToken(value),
          kind: options.kind === "comparison" ? "comparison" : "estimate",
          variantId: options.variantId,
          expiresAt: expires
        });
        patchLocal(project, { calcLinks: project.calcLinks });
      }
    } catch (_) { window.__diagSilent && window.__diagSilent(_); }
    return publicUrl(value);
  }

  // Close one specific link (not only the latest one of the project).
  async function revokeToken(tokenValue, reference) {
    var client = sb();
    if (!client || !user()) throw new Error("Немає підключення до хмари");
    var project = activeProject(reference);
    if (!project) throw new Error("Проєкт не знайдено");
    var storage = expandCompactToken(tokenValue);
    var result = await client.rpc("aceil_revoke_report_snapshot", { p_token: storage });
    var unavailable = result.error && (
      result.error.code === "PGRST202" ||
      /aceil_revoke_report_snapshot|schema cache|function/i.test(String(result.error.message || result.error))
    );
    if (result.error && !unavailable) throw result.error;
    if (unavailable) {
      if (compactToken(project.report_token) === compactToken(storage)) return revoke(reference);
      throw new Error("Окреме закриття посилань ще не підтримується сервером");
    }
    var variants = window.A_CEIL_EstimateVariants;
    if (variants && typeof variants.markLinkRevoked === "function") {
      variants.markLinkRevoked(project, compactToken(storage), false);
      patchLocal(project, { calcLinks: project.calcLinks });
    }
    return true;
  }

  async function revoke(reference) {
    var client = sb();
    if (!client || !user()) throw new Error("Немає підключення до хмари");
    var project = activeProject(reference);
    var projectId = dbId(project);
    if (!projectId) throw new Error("Проєкт не знайдено");
    var currentToken = project.report_token || "";
    if (currentToken) {
      var snapshotResult = await client.rpc("aceil_revoke_report_snapshot", { p_token: currentToken });
      var snapshotUnavailable = snapshotResult.error && (
        snapshotResult.error.code === "PGRST202" ||
        /aceil_revoke_report_snapshot|schema cache|function/i.test(String(snapshotResult.error.message || snapshotResult.error))
      );
      if (snapshotResult.error && !snapshotUnavailable) throw snapshotResult.error;
    }
    var result = await client.rpc("aceil_revoke_report_link", { p_project_id: projectId });
    if (result.error) throw result.error;
    try {
      var variants = window.A_CEIL_EstimateVariants;
      if (variants && currentToken && typeof variants.markLinkRevoked === "function") variants.markLinkRevoked(project, compactToken(currentToken), false);
    } catch (_) { window.__diagSilent && window.__diagSilent(_); }
    patchLocal(project, { report_token: null, report_published_at: null, report_expires_at: null, calcLinks: project.calcLinks || [] });
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
    revokeToken: revokeToken,
    publicUrl: publicUrl,
    status: reportStatus,
    resolveProject: activeProject,
    expandToken: expandCompactToken,
    compactToken: compactToken
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
    catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  function wrapClassicPublisher() {
    var previous = window["A·CEILPublishReport"];
    if (typeof previous !== "function" || previous.__secureReportV2) return;
    var wrapped = async function () {
      var sourceButton = arguments[1] || null;
      try {
        if (sourceButton) {
          sourceButton.disabled = true;
          sourceButton.textContent = "⏳ Створюється посилання…";
        }
        var statusNode = sourceButton && sourceButton.ownerDocument && sourceButton.ownerDocument.getElementById("reportStatus");
        if (statusNode) statusNode.textContent = "Оптимізація та завантаження звіту…";
        if (typeof window.A_CEIL_GetReportPayload !== "function") throw new Error("Дані звіту ще не готові. Сформуйте звіт повторно");
        var report = window.A_CEIL_GetReportPayload(arguments[0]);
        if (!report || !report.payload) throw new Error("Не вдалося підготувати дані звіту");
        var url = await publishPayload(report.payload, {
          projectId: report.projectId,
          backgroundSafe: !!(sourceButton && sourceButton.ownerDocument && sourceButton.ownerDocument !== document),
          onProgress: function (text) { if (statusNode) statusNode.textContent = text; }
        });
        updateClassicUi(url, sourceButton);
        return url;
      } catch (error) {
        classicFailure(error, sourceButton);
        return null;
      }
    };
    wrapped.__secureReportV2 = true;
    window["A·CEILPublishReport"] = wrapped;
    try { A·CEILPublishReport = wrapped; } catch(_){window.__diagSilent&&window.__diagSilent(_)}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wrapClassicPublisher, { once: true });
  else setTimeout(wrapClassicPublisher, 0);
})();
