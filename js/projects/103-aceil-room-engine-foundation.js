
(function(){
  'use strict';
  if(window.A·CEILRoomEngine) return;
  const stages=[];
  const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>{
    if(window.A·CEILProjectSchema&&typeof window.A·CEILProjectSchema.clone==='function') return window.A·CEILProjectSchema.clone(v);
    if(typeof structuredClone==='function') try{return structuredClone(v);}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}
  };
  function normalizeStage(stage){
    if(!stage||typeof stage.name!=='string'||!stage.name.trim()||typeof stage.run!=='function') throw new TypeError('RoomEngine.register: потрібні name і run');
    return Object.freeze({name:stage.name.trim(),run:stage.run,order:Number.isFinite(stage.order)?stage.order:100,enabled:stage.enabled!==false});
  }
  function register(stage){
    const normalized=normalizeStage(stage);
    const index=stages.findIndex(item=>item.name===normalized.name);
    if(index>=0) stages[index]=normalized; else stages.push(normalized);
    stages.sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name));
    return api;
  }
  function unregister(name){
    const index=stages.findIndex(item=>item.name===String(name));
    if(index<0) return false;
    stages.splice(index,1);return true;
  }
  function list(){return stages.map(item=>({name:item.name,order:item.order,enabled:item.enabled}));}
  function run(input,options){
    const opts=isObject(options)?options:{};
    const context={input:opts.clone===false?input:clone(input),value:null,result:null,meta:{startedAt:Date.now(),stages:[]},options:opts};
    context.value=context.input;
    for(const stage of stages){
      if(!stage.enabled||Array.isArray(opts.only)&&!opts.only.includes(stage.name)||Array.isArray(opts.skip)&&opts.skip.includes(stage.name)) continue;
      const started=Date.now();
      try{
        const returned=stage.run(context.value,context);
        if(returned!==undefined) context.value=returned;
        context.meta.stages.push({name:stage.name,ok:true,durationMs:Date.now()-started});
      }catch(error){
        context.meta.stages.push({name:stage.name,ok:false,durationMs:Date.now()-started,error:String(error&&error.message||error)});
        error.A·CEILStage=stage.name;
        if(opts.continueOnError) continue;
        throw error;
      }
    }
    context.result=context.value;
    context.meta.durationMs=Date.now()-context.meta.startedAt;
    return context;
  }
  function validate(input){
    const issues=[];
    if(!isObject(input)) issues.push('Вхідні дані не є об’єктом');
    if(isObject(input)&&input.state!=null&&typeof input.state!=='string'&&!isObject(input.state)) issues.push('state має бути JSON-рядком або об’єктом');
    return issues;
  }
  const api=Object.freeze({register,unregister,list,run,validate,clone});
  window.A·CEILRoomEngine=api;
  register({name:'schema',order:10,run(value){
    const schema=window.A·CEILProjectSchema;
    return schema&&typeof schema.migrateProject==='function'&&isObject(value)?schema.migrateProject(value):value;
  }});
  register({name:'validate',order:20,run(value,ctx){
    const issues=validate(value);ctx.meta.validationIssues=issues;
    if(issues.length&&ctx.options.strict) throw new Error(issues.join('; '));
    return value;
  }});
  register({name:'location',order:30,run(value){
    const locationApi=window.A·CEILLocation;
    if(!isObject(value)||!locationApi||typeof locationApi.normalize!=='function') return value;
    const normalized=locationApi.normalize(value.location||value);
    if(normalized&&value.location!==normalized) value.location=normalized;
    return value;
  }});
  register({name:'geometry',order:40,run(value,ctx){
    const geometry=window.A·CEILGeometry;
    if(!geometry||typeof geometry.calculate!=='function') return value;
    ctx.meta.geometry=geometry.calculate(value);
    return value;
  }});
})();
