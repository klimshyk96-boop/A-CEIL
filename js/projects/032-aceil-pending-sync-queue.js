/* Canonical pending-sync queue. Public names are retained for existing callers. */
const PENDING_KEY = "ceiling_pendingSync";
(function () {
  "use strict";
  const memory = new Map(), flights = new Map();
  let sequence = 0;
  let retryTimer = null, retryAttempt = 0;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function client() { return (typeof _sb !== "undefined" && _sb) || window._sb || null; }
  function user() { return (typeof _sbUser !== "undefined" && _sbUser) || window._sbUser || null; }
  function owner() {
    const storage = window.A_CEIL_UserStorage;
    return String(storage ? storage.getUserId() || "guest" : (user() && user().id) || "guest");
  }
  function repository() { return window.A·CEIL && window.A·CEIL.ProjectRepository; }
  function projects() { const r = repository(); return r ? r.list({clone: true}) : []; }
  function matches(project, id) {
    return project && id != null && [project.id, project._dbId, project._localId].some(v => v != null && String(v) === String(id));
  }
  function related(a, b) {
    const ids = p => [p && p.localId, p && p.dbId].filter(v => v != null).map(String);
    const other = ids(b);
    return ids(a).some(id => other.includes(id));
  }
  function revision() { return Date.now().toString(36) + ":" + (++sequence) + ":" + Math.random().toString(36).slice(2); }
  function compact(op) {
    const out = clone(op);
    if (out.type === "save" && out.payload) {
      // ProjectRepository owns the drawing; queue entries need only references.
      delete out.payload.thumb;
      delete out.payload.stateObj;
    }
    // Legacy entries get a stable identity, including across failed writes.
    if (!out._queueId) out._queueId = "legacy:" + JSON.stringify(out);
    return out;
  }
  function normalize(input) {
    const out = [];
    (Array.isArray(input) ? input : []).forEach(value => {
      if (!value || !value.type) return;
      const op = compact(value);
      const index = op.type === "save" ? out.findIndex(x => x.type === "save" && related(x.payload, op.payload)) : -1;
      if (index >= 0) out[index] = op;
      else out.push(op);
    });
    // Never discard unsynced projects just because the queue is long.
    return out;
  }
  function read() {
    const key = owner();
    if (memory.has(key)) return clone(memory.get(key));
    try { return normalize(JSON.parse(localStorage.getItem(PENDING_KEY) || "[]")); }
    catch (_) { return []; }
  }
  function write(input) {
    const key = owner(), queue = normalize(input);
    // RAM is authoritative after a quota failure, even when the queue is empty.
    memory.set(key, queue);
    try {
      const repair = window.A·CEIL && window.A·CEIL.StorageRepair;
      const raw = JSON.stringify(queue);
      if (repair) {
        if (!repair.retrySetItem(PENDING_KEY, raw)) return false;
      } else localStorage.setItem(PENDING_KEY, raw);
      memory.delete(key);
      return true;
    } catch (_) { return false; }
  }
  function badge() {
    const n = read().length, el = document.getElementById("cloudStatus");
    if (el && n) {
      el.textContent = "⏳ " + n + " не збережено";
      el.title = "Є зміни, які очікують синхронізації.";
    }
  }
  function add(value) {
    const op = compact(value), queue = read();
    op._queueId = revision();
    // A queued deletion supersedes saves that have not yet been sent.
    const next = op.type === "delete" ? queue.filter(x => x.type !== "save" || !related(x.payload, op.payload)) : queue;
    next.push(op);
    write(next); badge();
  }
  function remove(id) {
    write(read().filter(op => ![op.payload && op.payload.localId, op.payload && op.payload.dbId].some(v => v != null && String(v) === String(id))));
    badge();
  }
  function acknowledge(op) { write(read().filter(x => x._queueId !== op._queueId)); }
  function findLocal(payload) {
    const all = projects();
    return all.find(p => matches(p, payload.localId)) || all.find(p => matches(p, payload.dbId)) || null;
  }
  function payloadFor(local, fallback, uid) {
    let state;
    try { state = typeof local.state === "string" ? JSON.parse(local.state || "{}") : clone(local.state || {}); }
    catch (_) { state = {}; }
    const mode=window.A_CEIL_ProjectMode;
    const isMulti=mode&&typeof mode.isMulti==='function'?mode.isMulti(local):(local.multiRoom || local.projectType === "apartment" || state.multiRoom);
    if (isMulti) {
      const rooms = Array.isArray(local.rooms) ? clone(local.rooms) : state.rooms || [];
      const drawn = rooms.some(room => {
        let st = room.state || {};
        try { if (typeof st === "string") st = JSON.parse(st); } catch (_) { st = {}; }
        return st.closed || st.circleMode || [st.pts, st.realPts, st.wallMarks, st.lightMarks].some(value => Array.isArray(value) && value.length);
      });
      if (!drawn) throw new Error("Порожній об'єкт не замінює хмарний проєкт");
      state = {schemaVersion: state.schemaVersion || 3, projectType: "apartment", multiRoom: true, rooms};
    } else if(mode&&typeof mode.cleanSingleState==='function') state=mode.cleanSingleState(local);
    const value = field => local[field] == null ? fallback[field] || "" : local[field];
    return {user_id: uid, name: value("name"), addr: value("addr"), phone: value("phone"), comment: value("comment"),
      area: value("area"), per: value("per"), in_corners: value("inC"), out_corners: value("outC"), thumb: local.thumb || "", state};
  }
  function signature(local, payload, uid) {
    return JSON.stringify([payloadFor(local, payload, uid), local.rooms || null, local._localUpdatedAt || null]);
  }
  function sameSession(session) {
    const current = user();
    return owner() === session.owner && current && String(current.id) === session.uid && client() === session.client;
  }
  function errorMessage(error) {
    return String(error && (error.message || error.error_description || error.details || error.hint) || error || "");
  }
  function isAuthError(error) {
    const status = Number(error && (error.status || error.statusCode) || 0);
    return status === 401 || /jwt|token|session|not authenticated|auth session missing/i.test(errorMessage(error));
  }
  function isTransientError(error) {
    const status = Number(error && (error.status || error.statusCode) || 0);
    return !navigator.onLine || status === 0 || status === 408 || status === 425 || status === 429 || status >= 500 ||
      /load failed|failed to fetch|networkerror|network request failed|timeout|timed out|таймаут/i.test(errorMessage(error));
  }
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  async function refreshAuth(session) {
    try {
      if (!sameSession(session) || !session.client.auth || typeof session.client.auth.refreshSession !== "function") return false;
      const result = await session.client.auth.refreshSession();
      return !!(result && !result.error && result.data && result.data.session);
    } catch (_) { return false; }
  }
  async function sendOperation(session, op, local) {
    const p = op.payload || {};
    if (op.type === "save") {
      const sentSignature = signature(local, p, session.uid);
      const payload = payloadFor(local, p, session.uid), dbId = local._dbId || p.dbId;
      const query = dbId ? session.client.from("projects").update(payload).eq("id", dbId) : session.client.from("projects").insert(payload);
      const result = await query.select().single();
      if (result.error) throw result.error;
      if (!result.data || !result.data.id) throw new Error("Сервер не підтвердив збереження");
      return {row: result.data, sentSignature};
    }
    if (op.type === "delete" && p.dbId) {
      const result = await session.client.from("projects").delete().eq("id", p.dbId);
      if (result.error) throw result.error;
    }
    return {};
  }
  async function sendWithRecovery(session, op, local) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await sendOperation(session, op, local); }
      catch (error) {
        lastError = error;
        if (!sameSession(session)) throw error;
        if (attempt === 0 && isAuthError(error) && await refreshAuth(session)) continue;
        if (attempt < 2 && isTransientError(error)) { await wait(700 * (attempt + 1)); continue; }
        throw error;
      }
    }
    throw lastError || new Error("Не вдалося синхронізувати проєкт");
  }
  function scheduleRetry() {
    if (retryTimer || !navigator.onLine || !read().length) return;
    /* Keep the queue alive after transient Safari/network failures. Backoff is
       capped so retries continue without creating a tight background loop. */
    const delay = Math.min(60000, 2500 * Math.pow(2, Math.min(retryAttempt++, 5)));
    retryTimer = setTimeout(() => {
      retryTimer = null;
      flush().then(ok => { if (ok) retryAttempt = 0; else scheduleRetry(); }).catch(scheduleRetry);
    }, delay);
  }
  function acceptSave(op, local, row, sentSignature, session) {
    // Bind later edits/deletions to the newly inserted cloud ID without changing
    // their revision identity. In particular, a second save must UPDATE, not INSERT.
    const pending = read();
    pending.forEach(next => {
      if (related(next.payload, op.payload)) next.payload.dbId = row.id;
    });
    write(pending);
    const all = projects(), index = all.findIndex(p => matches(p, local.id) || matches(p, local._dbId));
    if (index < 0) return; // Never resurrect a project deleted during the request.
    const current = all[index];
    const changed = signature(current, op.payload, session.uid) !== sentSignature;
    const newer = pending.some(x => x._queueId !== op._queueId && related(x.payload, op.payload));
    if (current._localId == null) current._localId = current.id;
    current.id = row.id; current._dbId = row.id;
    // Keep the open object attached to its assigned cloud ID, unless the user
    // has already navigated to another project while the request was pending.
    if (typeof _currentProjectId !== "undefined" && matches(local, _currentProjectId)) _currentProjectId = row.id;
    if (typeof _activeObjectId !== "undefined" && matches(local, _activeObjectId)) _activeObjectId = row.id;
    if (matches(local, window._currentProjectId)) window._currentProjectId = row.id;
    if (matches(local, window._activeObjectId)) window._activeObjectId = row.id;
    if (!changed && !newer) {
      const mode=window.A_CEIL_ProjectMode;if(mode&&typeof mode.repair==='function')mode.repair(current);
      delete current._syncStatus; delete current._dirty; delete current._localUpdatedAt;
    } else {
      current._syncStatus = "pending_update";
      current._dirty = true;
    }
    repository().replaceAll(all);
    if (changed && !newer) add({type: "save", payload: {localId: current.id, dbId: row.id}, addedAt: Date.now()});
  }
  async function drain(session) {
    const attempted = new Set();
    while (sameSession(session)) {
      const op = read().find(x => !attempted.has(x._queueId));
      if (!op) break;
      attempted.add(op._queueId);
      try {
        const p = op.payload || {};
        if (op.type === "save") {
          const local = findLocal(p);
          if (!local) { acknowledge(op); continue; }
          const result = await sendWithRecovery(session, op, local);
          if (!sameSession(session)) return false;
          acceptSave(op, local, result.row, result.sentSignature, session);
          acknowledge(op);
        } else if (op.type === "delete") {
          await sendWithRecovery(session, op, null);
          if (!sameSession(session)) return false;
          acknowledge(op);
        }
      } catch (error) {
        // Leave the failed revision in place; later revisions can still be sent.
        if (!sameSession(session)) return false;
        window.__A_CEIL_LAST_CLOUD_ERROR = {at: Date.now(), message: errorMessage(error)};
        if (window.__diagSilent) window.__diagSilent(error);
      }
    }
    if (!sameSession(session)) return false;
    const remaining = read().length, el = document.getElementById("cloudStatus");
    if (el) {
      el.textContent = remaining ? "⏳ " + remaining + " не збережено" : "☁️ синхронізовано";
      el.title = remaining ? "Є зміни, які очікують синхронізації." : "";
    }
    if (typeof hideSync === "function") hideSync();
    if (remaining) scheduleRetry(); else retryAttempt = 0;
    return remaining === 0;
  }
  function flush() {
    const c = client(), u = user(), key = owner();
    if (!c || !u || !repository()) return Promise.resolve(false);
    if (flights.has(key)) return flights.get(key);
    const session = {owner: key, uid: String(u.id), client: c};
    // Register the lock before any asynchronous cloud work begins.
    const promise = Promise.resolve().then(() => drain(session)).finally(() => { if (flights.get(key) === promise) flights.delete(key); });
    flights.set(key, promise);
    return promise;
  }
  window.getPendingQueue = read;
  window.setPendingQueue = write;
  window.addToPendingQueue = add;
  window.removeFromPendingQueue = remove;
  window._updatePendingBadge = badge;
  window.flushPendingQueue = flush;
  function retryNow() {
    retryAttempt = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (user() && read().length) flush().catch(error => { if (window.__diagSilent) window.__diagSilent(error); });
  }
  window.addEventListener("online", retryNow);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && navigator.onLine) retryNow(); });
  // Existing Safari queues must resume after a normal page reload too; neither
  // an `online` nor a visibility event is guaranteed during authentication.
  [1800, 5000, 10000].forEach(delay => setTimeout(() => {
    if (navigator.onLine && read().length) retryNow();
  }, delay));
})();
