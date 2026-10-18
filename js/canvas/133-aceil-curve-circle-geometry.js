(function(){
"use strict";
if(window.__A·CEILCurveCircleGeometryV302)return;
window.__A·CEILCurveCircleGeometryV302=true;

/* Compatibility facade for code written against the short-lived V302 API.
   The canonical geometry is installed by V306 and the public wall functions
   remain owned by 129-aceil-curve-rebuild.js. */
window.A·CEILCurveMeasureGeometryV302={
  solve:function(i){
    var geometry=window.A·CEILCurveGeometryV306;
    return geometry?geometry.solve(i):{ok:false,error:"geometry_not_ready",points:[]};
  },
  canvasPoints:function(i){
    var geometry=window.A·CEILCurveGeometryV306;
    return geometry?geometry.canvasPoints(i):[];
  }
};
})();
