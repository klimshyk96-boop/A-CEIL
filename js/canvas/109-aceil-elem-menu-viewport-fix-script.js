
(function(){
  "use strict";
  var menu = null;
  var trigger = null;

  function getMenu(){ return document.getElementById("elemMenu"); }
  function getTrigger(){
    return document.querySelector('#elementsModal [onclick*="toggleElemMenu"]') ||
           document.querySelector('#elementsModal [title="Меню"]');
  }

  function positionMenu(){
    menu = getMenu();
    trigger = getTrigger();
    if (!menu || !trigger || !menu.classList.contains("open")) return;

    var r = trigger.getBoundingClientRect();
    var gap = 8;
    var margin = 12;
    var width = Math.min(320, window.innerWidth - margin * 2);

    menu.style.width = width + "px";
    menu.style.left = Math.max(margin, Math.min(window.innerWidth - width - margin, r.right - width)) + "px";

    var availableBelow = window.innerHeight - r.bottom - gap - margin;
    var availableAbove = r.top - gap - margin;
    var naturalHeight = Math.min(menu.scrollHeight || 360, window.innerHeight - margin * 2);
    var openBelow = availableBelow >= Math.min(naturalHeight, 260) || availableBelow >= availableAbove;

    if (openBelow) {
      menu.style.top = (r.bottom + gap) + "px";
      menu.style.bottom = "auto";
      menu.style.maxHeight = Math.max(140, availableBelow) + "px";
    } else {
      menu.style.top = "auto";
      menu.style.bottom = (window.innerHeight - r.top + gap) + "px";
      menu.style.maxHeight = Math.max(140, availableAbove) + "px";
    }
  }

  function openMenu(){
    menu = getMenu();
    trigger = getTrigger();
    if (!menu || !trigger) return;

    if (menu.parentElement !== document.body) document.body.appendChild(menu);
    menu.classList.add("rm-viewport-menu", "open");
    menu.style.display = "block";
    requestAnimationFrame(positionMenu);
  }

  function closeMenuFixed(){
    menu = getMenu();
    if (!menu) return;
    menu.classList.remove("open");
    menu.style.display = "none";
  }

  window.toggleElemMenu = function(){
    var m = getMenu();
    if (!m) return;
    if (m.classList.contains("open")) closeMenuFixed();
    else openMenu();
  };
  window.closeElemMenu = closeMenuFixed;
  try { toggleElemMenu = window.toggleElemMenu; } catch(e){window.__diagSilent&&window.__diagSilent(e)}
  try { closeElemMenu = window.closeElemMenu; } catch(e){window.__diagSilent&&window.__diagSilent(e)}

  window.addEventListener("resize", positionMenu, {passive:true});
  window.addEventListener("orientationchange", function(){ setTimeout(positionMenu, 120); }, {passive:true});
  document.addEventListener("scroll", function(e){
    if (getMenu() && getMenu().classList.contains("open")) positionMenu();
  }, true);

  document.addEventListener("pointerdown", function(e){
    var m = getMenu();
    var t = getTrigger();
    if (!m || !m.classList.contains("open")) return;
    if (m.contains(e.target) || (t && t.contains(e.target))) return;
    closeMenuFixed();
  }, true);
})();
