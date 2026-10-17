/* A·CEIL public API (strangler seam).
   New code, tests and future modules call the app ONLY through window["A·CEIL"].API.
   Every entry resolves the current implementation at call time, so the legacy wrapper chains behind it
   can be merged or replaced one at a time without touching callers. Nothing here changes behaviour. */
(function(){
"use strict";
var NS="A\u00b7CEIL",root=window[NS]||(window[NS]={});
function bind(name){
  return function(){
    var fn=window[name];
    if(typeof fn!=="function")throw new Error("A\u00b7CEIL API: '"+name+"' is not available");
    return fn.apply(this,arguments);
  };
}
function group(map){var o={};Object.keys(map).forEach(function(k){o[k]=bind(map[k]);});return Object.freeze(o);}
root.API=Object.freeze({
  apiVersion:1,
  state:group({reset:"resetAllSilent"}),
  projects:group({list:"getProjects",replaceAll:"setProjects",saveProject:"saveProject",saveCurrentRoom:"saveCurrentRoom",openRoom:"openRoom",deleteRoom:"deleteRoom"}),
  nomenclature:group({autoFill:"autoFillNomenclature",openEditor:"openElementsModal"}),
  estimate:group({recalc:"recalcElemTotal",stableProjectTotal:"A_CEIL_GetStableProjectTotal"}),
  report:group({buildStructured:"A_CEIL_buildCloudStructuredReport",openSettings:"openReportSettings"}),
  lights:group({summarizeLinear:"linearElementsSummary"})
});
})();
