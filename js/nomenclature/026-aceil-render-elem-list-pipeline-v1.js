/* Owner of window.renderElemList (core/007 pipeline). Layers register named stages instead of re-wrapping the global.
   Order is the real runtime wrapping order, inner -> outer. */
(function(){
"use strict";
var NS="A\u00b7CEIL",root=window[NS]||(window[NS]={});
if(!root.pipeline)return;
var base=window.renderElemList||(typeof renderElemList==="function"?renderElemList:null);
if(typeof base!=="function")return;
root.pipeline.define("renderElemList",{order:["cloudLoading","accessGate","customRules","offlineRestore","desktopSidebar","filmGroups"],base:base});
})();
