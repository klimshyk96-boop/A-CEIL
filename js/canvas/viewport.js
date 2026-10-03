/* Logical drawing units are independent of the screen's backing-store pixels.
   Report exporters temporarily resize the canvas; those sizes remain unmanaged. */
(function () {
  'use strict';
  var canvas = null, logicalWidth = 750, logicalHeight = 750, ratio = 1;
  var resizeFrame = 0, before = new Map(), after = new Map();
  function managed(c) {
    return c === canvas && c.width === Math.round(logicalWidth * ratio) &&
      c.height === Math.round(logicalHeight * ratio);
  }
  function width(c) { return managed(c) ? logicalWidth : c.width; }
  function height(c) { return managed(c) ? logicalHeight : c.height; }
  function scale(c) { return managed(c) ? ratio : 1; }
  function screenTransform(c) {
    var r = scale(c.canvas);
    c.setTransform(r, 0, 0, r, 0, 0);
  }
  function resize() {
    if (!canvas || (typeof _reportMode !== 'undefined' && _reportMode) ||
        window.__A·CEILReportRendering) return;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    var next = Math.max(1, Math.min(3, Math.ceil(rect.width * (window.devicePixelRatio || 1) / logicalWidth)));
    ratio = next;
    var w = Math.round(logicalWidth * ratio), h = Math.round(logicalHeight * ratio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      if (typeof requestDraw === 'function') requestDraw();
    }
  }
  function scheduleResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  }
  function setSize(w, h) {
    logicalWidth = Math.max(1, Number(w) || 750);
    logicalHeight = Math.max(1, Number(h) || 750);
    resize();
  }
  function run(hooks) {
    hooks.forEach(function (fn) {
      try { fn(); } catch (error) {
        if (window.__diagSilent) window.__diagSilent(error);
      }
    });
  }
  function render(scene, context) {
    run(before);
    context.save();
    try {
      screenTransform(context);
      scene();
      run(after);
    } finally { context.restore(); }
  }
  function init() {
    canvas = document.getElementById('cv');
    if (!canvas) return;
    resize();
    window.addEventListener('resize', scheduleResize, {passive: true});
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(scheduleResize).observe(canvas);
    }
  }
  window.ACEILCanvas = Object.freeze({
    width: width, height: height, scale: scale, setSize: setSize,
    screenTransform: screenTransform, render: render,
    beforeDraw: function (name, fn) { before.set(name, fn); },
    afterDraw: function (name, fn) { after.set(name, fn); },
    inspect: function () { return {width:logicalWidth, height:logicalHeight, pixelRatio:ratio,
      before:Array.from(before.keys()), after:Array.from(after.keys())}; }
  });
  document.addEventListener('DOMContentLoaded', init, {once:true});
})();
