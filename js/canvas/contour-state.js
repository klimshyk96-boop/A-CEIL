(function () {
  'use strict';
  function clearOpenCurves() {
    if (typeof closed === 'undefined' || closed) return;
    if (Array.isArray(wallTypes)) {
      wallTypes.length = 0;
      for (var i = 0; i < Math.max(0, pts.length - 1); i++) wallTypes.push('straight');
    }
    if (Array.isArray(arcPoints)) {
      arcPoints.length = 0;
      for (var j = 0; j < Math.max(0, pts.length - 1); j++) arcPoints.push([]);
    }
  }
  function reset() {
    var project = typeof _activeObjectId !== 'undefined' && _activeObjectId != null ? String(_activeObjectId) : 'none';
    var room = typeof _activeRoomId !== 'undefined' && _activeRoomId != null ? String(_activeRoomId) : 'single';
    window.A·CEILCurves = {};
    window.A·CEILComplexWalls = {};
    try {
      localStorage.removeItem('A·CEIL_curves_v1::' + project + '::' + room);
      localStorage.removeItem('A·CEIL_complex_walls_v1::' + project + '::' + room);
    } catch (error) { if (window.__diagSilent) window.__diagSilent(error); }
  }
  ACEILCanvas.beforeDraw('open-contour-curves', clearOpenCurves);
  window.ACEILContour = Object.freeze({reset:reset});
})();
