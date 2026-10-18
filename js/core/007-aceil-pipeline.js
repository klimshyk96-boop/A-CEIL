/* A·CEIL pipeline factory. Replaces the "wrap the previous window.X" habit.
   A chain of patches around one global function is declared once:
     A·CEIL.pipeline.define("name", { order: [stage ids, inner -> outer], base: function })
   The owner file passes the original function as `base`; every other file adds a named stage:
     A·CEIL.pipeline.get("name").stage(id, { enabled(), skipValue, around(next), after() })
   Execution equals the old nested wrappers: outer stage first; if enabled() is false the call returns skipValue
   (outer stages' own `after` still run); otherwise before/around -> inner stages -> base -> after.
   Registry keys are stage ids, so a stage can never be installed twice. The order is data, not load order. */
(function(){
"use strict";
var NS="A\u00b7CEIL",root=window[NS]||(window[NS]={});
if(root.pipeline)return;
var defined={};

function define(name,opts){
  if(defined[name])return defined[name];
  var order=(opts&&opts.order||[]).slice(),base=opts&&opts.base;
  if(typeof base!=="function")base=window[name];
  if(typeof base!=="function")return null;
  var stages={};
  function active(){var a=[];for(var i=0;i<order.length;i++)if(stages[order[i]])a.push(stages[order[i]]);return a;}
  function exec(list,i,self,args){
    if(i<0)return base.apply(self,args);
    var s=list[i];
    if(s.enabled&&!s.enabled.apply(self,args))return s.skipValue;
    var next=function(){return exec(list,i-1,self,args);};
    if(s.around)return s.around.call(self,next,args);
    var result=next();
    if(s.after)s.after.call(self,result,args);
    return result;
  }
  window[name]=function(){var list=active();return exec(list,list.length-1,this,arguments);};
  var registry=Object.freeze({
    name:name,
    order:order.slice(),
    has:function(id){return !!stages[id];},
    registered:function(){return order.filter(function(id){return !!stages[id];});},
    stage:function(id,def){
      if(order.indexOf(id)<0)throw new Error("A\u00b7CEIL pipeline '"+name+"': unknown stage '"+id+"'");
      if(stages[id])return false;
      stages[id]=def;return true;
    }
  });
  defined[name]=registry;
  return registry;
}
root.pipeline=Object.freeze({
  define:define,
  get:function(name){return defined[name]||null;},
  names:function(){return Object.keys(defined);}
});
})();
