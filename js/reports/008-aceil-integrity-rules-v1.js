
/* Consolidated rule registrations; execution order preserved. */
(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

window.A·CEIL.ProjectIntegrity.registerRule({
  name: "project",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;

    if (!project || typeof project !== "object") {
      errors.push({ code: "project_missing", message: "Проект відсутній або не є обʼєктом" });
      return { errors: errors, warnings: warnings };
    }

    var id = schema.getId ? schema.getId(project) : project.id;
    if (id === undefined || id === null || id === "") {
      errors.push({ code: "project_id_missing", message: "Відсутній project.id" });
    }

    var name = schema.getName ? schema.getName(project) : project.name;
    if (typeof name !== "string" || name.trim() === "") {
      warnings.push({ code: "project_name_missing", message: "Відсутня або порожня назва проекту (project.name)" });
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

window.A·CEIL.ProjectIntegrity.registerRule({
  name: "rooms",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;
    if (!project || typeof project !== "object") return { errors: errors, warnings: warnings };

    var rooms = schema.getRooms ? schema.getRooms(project) : (Array.isArray(project.rooms) ? project.rooms : null);

    if (Array.isArray(rooms)) {
      if (rooms.length === 0) {
        errors.push({ code: "rooms_empty", message: "project.rooms порожній (потрібна щонайменше одна кімната)" });
      }
      var seenIds = {};
      for (var i = 0; i < rooms.length; i++) {
        var room = rooms[i];
        if (room === null || typeof room === "undefined") {
          errors.push({ code: "room_null", message: "Кімната з індексом " + i + " є null/undefined" });
          continue;
        }
        var rid = schema.getId ? schema.getId(room) : room.id;
        if (rid === undefined || rid === null || rid === "") {
          errors.push({ code: "room_id_missing", message: "Відсутній id у кімнати з індексом " + i });
        } else {
          var key = String(rid);
          if (seenIds[key]) {
            errors.push({ code: "room_id_duplicate", message: "Дублікат room.id: " + key });
          }
          seenIds[key] = true;
        }
      }
    } else if (typeof project[schema.FIELDS ? schema.FIELDS.STATE : "state"] === "undefined") {
      warnings.push({ code: "no_rooms_no_state", message: "Проект не містить ані rooms, ані state" });
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

// Responsible for state existence/parseability + schemaVersion presence.
// Geometry/Lights/Elements rules assume this rule already reported any
// parse-level problems, so they silently skip entries that failed to parse
// here (avoids duplicate errors for the same underlying problem).
window.A·CEIL.ProjectIntegrity.registerRule({
  name: "state",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;
    if (!project || typeof project !== "object" || !schema.getStateEntries) return { errors: errors, warnings: warnings };

    var entries = schema.getStateEntries(project);
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var parsed = schema.parseState(entry.raw);
      if (parsed.wasEmpty) {
        warnings.push({ code: "state_missing", message: entry.label + ": стан кімнати порожній (ще не малювалась)" });
        continue;
      }
      if (!parsed.ok) {
        errors.push({ code: "state_unparsable", message: entry.label + ": state пошкоджено — не вдалося розібрати як JSON" });
        continue;
      }
      if (!parsed.value || typeof parsed.value !== "object") {
        errors.push({ code: "state_invalid", message: entry.label + ": state не є обʼєктом" });
        continue;
      }
      if (typeof parsed.value[schema.FIELDS.SCHEMA_VERSION] === "undefined") {
        warnings.push({ code: "schema_version_missing", message: entry.label + ": відсутній schemaVersion у state" });
      }
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

window.A·CEIL.ProjectIntegrity.registerRule({
  name: "geometry",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;
    if (!project || typeof project !== "object" || !schema.getStateEntries) return { errors: errors, warnings: warnings };

    var entries = schema.getStateEntries(project);
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var parsed = schema.parseState(entry.raw);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") continue; // reported by "state" rule
      var s = parsed.value;
      if (!Array.isArray(s[schema.FIELDS.PTS]) && !Array.isArray(s[schema.FIELDS.REAL_PTS])) {
        warnings.push({ code: "geometry_missing", message: entry.label + ": відсутні точки геометрії (pts/realPts)" });
      }
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

// Covers lightMarks and wallMarks (both are "mark" arrays on the room state).
window.A·CEIL.ProjectIntegrity.registerRule({
  name: "lights",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;
    if (!project || typeof project !== "object" || !schema.getStateEntries) return { errors: errors, warnings: warnings };

    var entries = schema.getStateEntries(project);
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var parsed = schema.parseState(entry.raw);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") continue; // reported by "state" rule
      var s = parsed.value;
      if (typeof s[schema.FIELDS.LIGHT_MARKS] !== "undefined" && !Array.isArray(s[schema.FIELDS.LIGHT_MARKS])) {
        warnings.push({ code: "lights_invalid", message: entry.label + ": lightMarks очікувався масивом" });
      }
      if (typeof s[schema.FIELDS.WALL_MARKS] !== "undefined" && !Array.isArray(s[schema.FIELDS.WALL_MARKS])) {
        warnings.push({ code: "wallmarks_invalid", message: entry.label + ": wallMarks очікувався масивом" });
      }
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

window.A·CEIL.ProjectIntegrity.registerRule({
  name: "elements",
  run: function(project, ctx){
    var errors = [], warnings = [];
    var schema = ctx.schema;
    if (!project || typeof project !== "object" || !schema.getStateEntries) return { errors: errors, warnings: warnings };

    var entries = schema.getStateEntries(project);
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var parsed = schema.parseState(entry.raw);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") continue; // reported by "state" rule
      var s = parsed.value;
      if (typeof s[schema.FIELDS.ELEM_ITEMS] !== "undefined" && !Array.isArray(s[schema.FIELDS.ELEM_ITEMS])) {
        warnings.push({ code: "elements_invalid", message: entry.label + ": elemItems (кастомні елементи) очікувався масивом" });
      }
      if (typeof s[schema.FIELDS.ELEM_GROUPS] !== "undefined" && !Array.isArray(s[schema.FIELDS.ELEM_GROUPS])) {
        warnings.push({ code: "element_groups_invalid", message: entry.label + ": elemGroups очікувався масивом" });
      }
    }

    return { errors: errors, warnings: warnings };
  }
});
})();

(function(){
"use strict";
if (!window.A·CEIL || !window.A·CEIL.ProjectIntegrity) return;

function checkSerializable(value){
  try {
    JSON.stringify(value);
    return { ok: true };
  } catch(e){
    var msg = (e && e.message) || "";
    if (/circular/i.test(msg)) {
      return { ok: false, code: "circular_reference", message: "Знайдено циклічне посилання у даних проекту" };
    }
    return { ok: false, code: "not_serializable", message: "Дані проекту неможливо серіалізувати в JSON (" + msg + ")" };
  }
}

function scanForFunctions(value, path, results, seen, depth){
  if (depth > 25) return; // safety guard against pathological deep trees
  if (value === null || typeof value !== "object") {
    if (typeof value === "function") results.push(path);
    return;
  }
  if (seen.indexOf(value) !== -1) return;
  seen.push(value);
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      scanForFunctions(value[i], path + "[" + i + "]", results, seen, depth + 1);
    }
  } else {
    for (var k in value) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        var v = value[k];
        if (typeof v === "function") results.push(path + "." + k);
        else if (v && typeof v === "object") scanForFunctions(v, path + "." + k, results, seen, depth + 1);
      }
    }
  }
}

window.A·CEIL.ProjectIntegrity.registerRule({
  name: "serialization",
  run: function(project, ctx){
    var errors = [], warnings = [];
    if (!project || typeof project !== "object") return { errors: errors, warnings: warnings };

    var serializeResult = checkSerializable(project);
    if (!serializeResult.ok) {
      errors.push({ code: serializeResult.code, message: serializeResult.message });
    }

    var fnPaths = [];
    try { scanForFunctions(project, "project", fnPaths, [], 0); } catch(e){window.__diagSilent&&window.__diagSilent(e)}
    if (fnPaths.length) {
      errors.push({ code: "functions_in_data", message: "Знайдено функції всередині даних проекту", paths: fnPaths });
    }

    return { errors: errors, warnings: warnings };
  }
});
})();
