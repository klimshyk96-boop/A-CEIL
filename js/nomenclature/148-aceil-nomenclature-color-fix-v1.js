
!function(){
"use strict";
if (window.__rmColorFixV1) return;
window.__rmColorFixV1 = true;

function normLocal(s){ return String(s||"").trim().toLowerCase(); }

function markColorOf(m){
  if (!m) return "";
  if ("white" === m.profileColor || "black" === m.profileColor) return m.profileColor;
  return (typeof _colorWordFromName === "function") ? _colorWordFromName(m.type) : "";
}

// Words in the item's name besides the base category word and its own color word
// (e.g. "Карниз прихований широкий білий" + category "карниз" + color "white" -> ["прихован","широк"]).
// Loosely stemmed (first 5 chars) so "широкий"/"широка"/"широкого" count the same.
function descriptorStems(fullName, categoryKeyword, colorWord){
  var words = normLocal(fullName).split(/\s+/).filter(Boolean);
  var catStem = categoryKeyword.slice(0, 5);
  return words
    .filter(function(w){ return w.indexOf(catStem) === -1; })
    .filter(function(w){ return !(colorWord === "white" && /^біл/.test(w)) && !(colorWord === "black" && /^чорн/.test(w)); })
    .map(function(w){ return w.slice(0, 5); });
}

function markMatchesDescriptors(markTypeNorm, stems){
  return stems.every(function(stem){ return markTypeNorm.indexOf(stem) !== -1; });
}

function fixColorAwareQuantities(){
  try {
    if (typeof elemItems === "undefined" || !Array.isArray(elemItems)) return;
    if (typeof _itemColorWord !== "function") return;
    var marks = Array.isArray(window.wallMarks) ? window.wallMarks
              : (typeof wallMarks !== "undefined" && Array.isArray(wallMarks) ? wallMarks : []);

    var CATEGORIES = ["карниз", "парящ", "брус"];

    // Which category each relevant item belongs to (only items with no explicit "Джерело").
    function categoryOf(it){
      var name = normLocal(it.name);
      for (var i = 0; i < CATEGORIES.length; i++){
        if (name.indexOf(CATEGORIES[i]) !== -1) return CATEGORIES[i];
      }
      return null;
    }

    var relevant = elemItems.filter(function(it){
      return it && !it.source && it.manualQtyOverride !== true && categoryOf(it);
    });
    if (!relevant.length) return;

    // Group relevant items by (category, color) so we only require descriptor-word
    // disambiguation when two or more price-list items would otherwise collide.
    var groups = {};
    relevant.forEach(function(it){
      var cat = categoryOf(it);
      var color = _itemColorWord(it);
      var key = cat + "|" + color;
      (groups[key] = groups[key] || []).push(it);
    });

    var changed = false;
    relevant.forEach(function(it){
      var cat = categoryOf(it);
      var colorWord = _itemColorWord(it);
      var key = cat + "|" + colorWord;
      var needsDisambiguation = groups[key].length > 1;
      var stems = needsDisambiguation ? descriptorStems(it.name, cat, colorWord) : [];

      var sum = 0;
      marks.forEach(function(m){
        if (!m) return;
        var type = normLocal(m.type || "");
        if (type.indexOf(cat) === -1) return;
        if (colorWord && markColorOf(m) !== colorWord) return;
        if (needsDisambiguation && !markMatchesDescriptors(type, stems)) return;
        sum += Number(m.lenCm) || 0;
      });

      var correctQty = Math.round(sum) / 100;
      if (it.qty !== correctQty) {
        it.qty = correctQty;
        it.unit = "м";
        it.autoFilled = true;
        it.autoZero = !(correctQty > 0);
        changed = true;
      }
    });

    if (changed) {
      try { if (typeof renderElemList === "function") renderElemList(); } catch(e){}
      try { if (typeof updateElemBadge === "function") updateElemBadge(); } catch(e){}
      try { if (typeof recalcElemTotal === "function") recalcElemTotal(); } catch(e){}
      try { if (typeof saveState === "function") saveState(); } catch(e){}
    }
  } catch(e){}
}

var oldAutoFill = window.autoFillNomenclature;
if ("function" == typeof oldAutoFill && !oldAutoFill.__colorFix401) {
  var wrappedAutoFill = function(){
    var r = oldAutoFill.apply(this, arguments);
    try { fixColorAwareQuantities(); } catch(e){}
    return r;
  };
  wrappedAutoFill.__colorFix401 = true;
  window.autoFillNomenclature = wrappedAutoFill;
  try { autoFillNomenclature = wrappedAutoFill; } catch(e){}
}

}();
