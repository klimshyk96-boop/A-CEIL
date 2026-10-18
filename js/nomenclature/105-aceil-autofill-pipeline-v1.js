/* A·CEIL auto-fill pipeline: the ONE owner of window.autoFillNomenclature (built on core/007 pipeline factory).
   Stages are registered by 110 (linear), 140 (universal), 148 (colorFix), 170 (cornices), 179 (insertChoice), 187 (filmFix).
   Changing the order changes estimate results: update tests/golden.json deliberately. */
(function(){
"use strict";
var NS="A\u00b7CEIL",root=window[NS]||(window[NS]={});
if(root.autofill||!root.pipeline)return;
var base=window.autoFillNomenclature||(typeof autoFillNomenclature==="function"?autoFillNomenclature:null);
if(typeof base!=="function")return; /* same outcome as the old wrappers: nothing gets installed without a base */
root.autofill=root.pipeline.define("autoFillNomenclature",{order:["linear","universal","colorFix","cornices","insertChoice","filmFix"],base:base});
})();
