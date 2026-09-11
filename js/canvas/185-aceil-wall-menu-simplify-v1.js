(function(){
  "use strict";

  var STORAGE_KEY = "A·CEIL_wallMenuAdvanced_v1";

  function byId(id){ return document.getElementById(id); }

  function isAdvancedOn(){
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch(e){ return false; }
  }
  function setAdvanced(on){
    try { localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); } catch(e){}
  }

  // The real modal has plain <label> tags with no class/id, so we match
  // by their text content instead of a hypothetical .rwe2-label class.
  function findLabelByText(root, text){
    var labels = root.querySelectorAll("label");
    for (var i = 0; i < labels.length; i++){
      if (labels[i].textContent.trim() === text) return labels[i];
    }
    return null;
  }

  // Tags a label AND the field element right after it (input / color row)
  // so both can be hidden together via CSS.
  function tagField(modal, labelText){
    var label = findLabelByText(modal, labelText);
    if (!label) return;
    label.classList.add("rwe2-only-adv");
    var sib = label.nextElementSibling;
    if (sib) sib.classList.add("rwe2-only-adv");
  }

  function tagHiddenFields(modal){
    tagField(modal, "Назва на макеті"); // label + #wallEditType
    tagField(modal, "Колір на макеті"); // label + color-row div (#wallEditColor + swatches)
  }

  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="3"></circle>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
    '</svg>';

  function ensureToggleBtn(box){
    var btn = byId("rwe2AdvToggle");
    if (!btn){
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "rwe2AdvToggle";
      btn.className = "rwe2-adv-toggle";
      btn.title = "Назва і колір елемента";
      btn.setAttribute("aria-label", "Назва і колір елемента");
      btn.innerHTML = GEAR_SVG;
      btn.onclick = function(e){
        e.preventDefault();
        e.stopPropagation();
        setAdvanced(!isAdvancedOn());
        applyState();
      };
    }
    var head = box.querySelector(".rwe2-head");
    var close = head && head.querySelector(".rwe2-x");
    if (head && btn.parentNode !== head) head.insertBefore(btn, close || null);
    else if (!head && btn.parentNode !== box) box.appendChild(btn);
    return btn;
  }

  function applyState(){
    var modal = byId("wallEditModal");
    if (!modal) return;
    var box = modal.querySelector(".modal");
    if (!box) return;

    tagHiddenFields(box);
    var btn = ensureToggleBtn(box);

    var on = isAdvancedOn();
    box.classList.toggle("rwe2-advanced-open", on);
    if (btn) btn.classList.toggle("active", on);
  }

  // Re-apply whenever the modal is opened, and shortly after (other
  // scripts build parts of this modal asynchronously via setTimeout).
  var prevOpen = window.openWallEditModal;
  if (typeof prevOpen === "function" && !prevOpen.__menuSimplify){
    var wrapped = function(){
      var result = prevOpen.apply(this, arguments);
      applyState();
      setTimeout(applyState, 30);
      setTimeout(applyState, 120);
      setTimeout(applyState, 300);
      return result;
    };
    wrapped.__menuSimplify = true;
    window.openWallEditModal = wrapped;
    try { openWallEditModal = wrapped; } catch(e){ window.__diagSilent && window.__diagSilent(e); }
  }

  // Also keep state correct if other scripts rebuild bits of the modal
  // while it's already open (e.g. preset toolbar, preset select).
  document.addEventListener("click", function(e){
    if (e.target && e.target.closest && e.target.closest("#wallEditModal") && e.target.id !== "rwe2AdvToggle"){
      setTimeout(applyState, 0);
    }
  }, true);

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(applyState, 300); }, { once: true });
  } else {
    setTimeout(applyState, 300);
  }
})();
