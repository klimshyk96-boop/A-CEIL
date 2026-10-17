/* A·CEIL auto-fill pipeline: the ONE owner of window.autoFillNomenclature.
   Legacy feature layers register named stages instead of wrapping the global repeatedly.
   The order is inner -> outer and must remain stable because it affects estimate results. */
(function(){
"use strict";
var NS="A\u00b7CEIL",root=window[NS]||(window[NS]={});
if(root.autofill)return;
var base=window.autoFillNomenclature||(typeof autoFillNomenclature==="function"?autoFillNomenclature:null);
if(typeof base!=="function")return;

var ORDER=["linear","universal","colorFix","cornices","insertChoice","filmFix"];
var stages={};

function active(){
  var list=[];
  for(var i=0;i<ORDER.length;i++)if(stages[ORDER[i]])list.push(stages[ORDER[i]]);
  return list;
}
function exec(list,i,self,args){
  if(i<0)return base.apply(self,args);
  var stage=list[i];
  if(stage.enabled&&!stage.enabled.apply(self,args))return stage.skipValue;
  var next=function(){return exec(list,i-1,self,args);};
  if(stage.around)return stage.around.call(self,next,args);
  var result=next();
  if(stage.after)stage.after.call(self,result,args);
  return result;
}
var pipeline=function(){var list=active();return exec(list,list.length-1,this,arguments);};
window.autoFillNomenclature=pipeline;
try{autoFillNomenclature=pipeline;}catch(_){window.__diagSilent&&window.__diagSilent(_)}

root.autofill=Object.freeze({
  order:ORDER.slice(),
  has:function(id){return !!stages[id];},
  registered:function(){return ORDER.filter(function(id){return !!stages[id];});},
  stage:function(id,definition){
    if(ORDER.indexOf(id)<0)throw new Error("A\u00b7CEIL autofill: unknown stage '"+id+"'");
    if(stages[id])return false;
    stages[id]=definition;
    return true;
  }
});
})();
