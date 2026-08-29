
(function(){
"use strict";
window.A·CEIL = window.A·CEIL || {};

var STORAGE_KEY = "A·CEIL_debug_log";
var MAX_ENTRIES = 80;
var DEBOUNCE_MS = 2000;
var buffer = [];
var opCounter = 0;
var enabled = true;
var contextProvider = null;
var persistTimer = null;
var U = window.A·CEIL.Utils || null;

function makeSessionId(){
  try {
    return "sess_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  } catch(e){
    return "sess_" + Date.now();
  }
}
var sessionId = makeSessionId();

function defaultContext(){
  // Fallback only used if no contextProvider has been registered.
  var ctx = { projectId: null, roomId: null };
  try {
    if (window.currentProject && window.currentProject.id) ctx.projectId = window.currentProject.id;
    else if (typeof window._currentProjectId !== "undefined" && window._currentProjectId !== null) ctx.projectId = window._currentProjectId;
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try {
    if (window.currentRoom && window.currentRoom.id) ctx.roomId = window.currentRoom.id;
    else if (window.activeRoomId) ctx.roomId = window.activeRoomId;
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  return ctx;
}

function getContext(){
  if (typeof contextProvider === "function") {
    try {
      var ctx = contextProvider();
      if (ctx && typeof ctx === "object") {
        return {
          projectId: (typeof ctx.projectId === "undefined") ? null : ctx.projectId,
          roomId: (typeof ctx.roomId === "undefined") ? null : ctx.roomId
        };
      }
    } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  return defaultContext();
}

function nextOperationId(){
  opCounter++;
  return "op_" + Date.now().toString(36) + "_" + opCounter;
}

function schedulePersist(){
  if (persistTimer) return;
  persistTimer = setTimeout(function(){
    persistTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
    } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }, DEBOUNCE_MS);
}

function pushEntry(level, type, data){
  if (!enabled) return null;
  var ctx = getContext();
  var entry = {
    timestamp: (U && typeof U.nowIso === "function") ? U.nowIso() : (new Date()).toISOString(),
    version: window.A·CEIL.VERSION || null,
    sessionId: sessionId,
    level: level,
    type: type,
    data: (typeof data === "undefined") ? null : data,
    projectId: ctx.projectId,
    roomId: ctx.roomId,
    operationId: nextOperationId()
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
  try {
    if (window.A·CEIL_DEBUG) {
      var fn = level === "error" ? console.error : (level === "warn" ? console.warn : console.log);
      fn("[A·CEIL]", type, entry);
    }
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  schedulePersist();
  return entry;
}

function loadPersisted(){
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      buffer = parsed.slice(-MAX_ENTRIES);
    }
  } catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
loadPersisted();

window.A·CEIL.DebugLog = {
  log: function(type, data){ return pushEntry("log", type, data); },
  warn: function(type, data){ return pushEntry("warn", type, data); },
  error: function(type, data){ return pushEntry("error", type, data); },
  export: function(){
    try { return JSON.stringify(buffer, null, 2); }
    catch(e){ return "[]"; }
  },
  clear: function(){
    buffer = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return true;
  },
  enable: function(){ enabled = true; return true; },
  disable: function(){ enabled = false; return true; },
  isEnabled: function(){ return enabled; },
  setContextProvider: function(fn){
    contextProvider = (typeof fn === "function") ? fn : null;
    return true;
  },
  getSessionId: function(){ return sessionId; },
  _all: function(){ return buffer.slice(); }
};
})();
