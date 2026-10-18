const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function makeContext({ items, groups, localStorage, base }) {
  const document = {
    readyState: "complete",
    body: { classList: { contains() { return false; } } },
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { style: {}, classList: { add() {}, remove() {} }, appendChild() {} }; }
  };
  const window = {
    elemItems: items,
    elemGroups: groups,
    renderElemList: base,
    A_CEIL_AutoCount: { isEnabled() { return true; } },
    __diagSilent() {}
  };
  const context = {
    window,
    document,
    localStorage,
    elemItems: items,
    elemGroups: groups,
    renderElemList: base,
    lengths: [300, 400, 300, 400],
    wallMarks: [],
    lightMarks: [],
    linearElements: [],
    pts: [],
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    console
  };
  vm.createContext(context);
  vm.runInContext(read("js/core/007-aceil-pipeline-v1.js"), context, { filename: "007-aceil-pipeline-v1.js" });
  vm.runInContext(read("js/nomenclature/026-aceil-render-elem-list-pipeline-v1.js"), context, { filename: "026-aceil-render-elem-list-pipeline-v1.js" });
  return context;
}

{
  const items = [{ id: "custom", source: "custom:room-per", qty: 0, unit: "шт" }];
  const groups = [{ id: "g1", name: "Мої правила" }];
  const rule = {
    updatedAt: 1,
    rules: [{ id: "room-per", name: "Периметр кімнати", scope: "room", operation: "perimeter", factor: 1 }]
  };
  let baseCalls = 0;
  const context = makeContext({
    items,
    groups,
    localStorage: storage({ A_CEIL_custom_auto_rules_v1: JSON.stringify(rule) }),
    base() { baseCalls++; }
  });
  vm.runInContext(read("js/nomenclature/170-aceil-autocount-menu-v1.js"), context, { filename: "170-aceil-autocount-menu-v1.js" });
  context.window.renderElemList();
  assert.equal(baseCalls, 1, "base list renderer must run once");
  assert.equal(items[0].qty, 14, "custom perimeter rule must run before rendering");
  assert.equal(items[0].unit, "м");
  assert.equal(groups[0]._aceilAutoRules.rules[0].id, "room-per", "rule snapshot must remain embedded");
}

{
  const groups = [
    { id: "ordinary", name: "Профілі" },
    { id: "film-old", name: "Плівка", roomScopedKind: "film-color", filmSeriesId: "premium" },
    { id: "film-active", name: "Полотно", roomScopedKind: "film-color", filmSeriesId: "premium" }
  ];
  const items = [
    { id: "old", groupId: "film-old", filmPickerManaged: true, filmWidth: 3.2, qty: 0 },
    { id: "active", groupId: "film-active", filmPickerManaged: true, filmWidth: 4.2, qty: 12 },
    { id: "legacy", groupId: "film-active", filmWidth: 3.2, qty: 0 },
    { id: "profile", groupId: "ordinary", qty: 5 }
  ];
  let snapshot = null;
  const context = makeContext({
    items,
    groups,
    localStorage: storage({
      A_CEIL_nomenclature_group_ui_v1: JSON.stringify({
        "film:premium": { collapsed: true, savedAt: 1 }
      })
    }),
    base() {
      snapshot = {
        groups: groups.map(group => group.id),
        items: items.map(item => item.id),
        collapsed: groups[0] && groups[0].collapsed
      };
    }
  });
  vm.runInContext(read("js/nomenclature/212-aceil-film-group-state-fix-v1.js"), context, { filename: "212-aceil-film-group-state-fix-v1.js" });
  context.window.renderElemList();
  assert.deepEqual(snapshot.groups, ["film-active", "ordinary"], "active film group must be the single first film group");
  assert.deepEqual(snapshot.items, ["active", "profile"], "duplicate and stale film rows must be removed");
  assert.equal(snapshot.collapsed, true, "saved film-group UI state must be applied before rendering");
}

console.log("Render pipeline rules and film groups: OK");
