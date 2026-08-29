
(function(){
"use strict";
window.A·CEIL=window.A·CEIL||{};
if(window.A·CEIL.StateManager)return;

function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(_){return Array.isArray(v)?v.slice():v;}}
function parse(v){try{return typeof v==="string"?JSON.parse(v||"{}"):v&&typeof v==="object"?v:{};}catch(_){return {};}}
function arr(name){try{var v=window[name];return Array.isArray(v)?clone(v):[];}catch(_){return [];}}
function val(name,fallback){
  /* `closed` is a built-in readonly Window property in Safari. The app also has
     a lexical variable named closed, so it must never be read through window.closed. */
  if(name==="closed"){
    try{return typeof closed!=="undefined"?!!closed:fallback;}catch(_){return fallback;}
  }
  try{return typeof window[name]!=="undefined"?window[name]:fallback;}catch(_){return fallback;}
}
function validPoint(p){return !!p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y));}
function sideCount(s){var p=Array.isArray(s.realPts)&&s.realPts.length?s.realPts:(Array.isArray(s.pts)?s.pts:[]);return p.length>=2?p.length:0;}
function normalizeWallTypes(v,n){var a=Array.isArray(v)?v.slice(0,n||v.length):[];while(a.length<n)a.push("straight");return a.map(function(x){return x==="arc"||x==="multi"||x==="curve"?x:"straight";});}
function normalizeArcPoints(v,n){var a=Array.isArray(v)?v.slice(0,n||v.length):[];while(a.length<n)a.push(null);return a.map(function(e){if(e==null)return null;if(Array.isArray(e)){var p=e.filter(validPoint).map(function(x){return{x:Number(x.x),y:Number(x.y)};});return p.length?p:null;}if(typeof e==="object"){var c=clone(e)||{};if(Array.isArray(c.points))c.points=c.points.filter(validPoint).map(function(x){return{x:Number(x.x),y:Number(x.y)};});if(c.control&&validPoint(c.control))c.control={x:Number(c.control.x),y:Number(c.control.y)};return c;}return null;});}
function normalize(state){state=parse(state);var n=sideCount(state);state.wallTypes=normalizeWallTypes(state.wallTypes,n);state.arcPoints=normalizeArcPoints(state.arcPoints,n);return state;}

function collect(base){
  var s=parse(base);
  s.pts=arr("pts"); s.realPts=arr("realPts"); s.lengths=arr("lengths");
  s.closed=!!val("closed",false); s.diagonals=arr("diagonals");
  s.diagonalOverrides=clone(val("diagonalOverrides",{}))||{};
  s.circleMode=!!val("circleMode",false); s.circleDiamCm=Number(val("circleDiamCm",0))||0;
  s.notes=arr("notes"); s.elemItems=arr("elemItems"); s.elemGroups=arr("elemGroups");
  s.lightMarks=arr("lightMarks"); s.wallMarks=arr("wallMarks"); s.linearElements=arr("linearElements");
  s.wallTypes=arr("wallTypes"); s.arcPoints=arr("arcPoints");
  return normalize(s);
}
function assign(name,value){
  var copy=clone(value);
  /* Do not touch Window.closed: it is readonly in Safari/iOS. */
  if(name==="closed"){
    try{closed=!!copy;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return;
  }
  try{window[name]=copy;}catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
function apply(state,options){
  options=options||{};var s=normalize(state);
  var p=Array.isArray(s.pts)?s.pts:[],r=Array.isArray(s.realPts)?s.realPts:[];
  if(!p.length&&r.length)p=clone(r);if(!r.length&&p.length)r=clone(p);
  assign("pts",p);assign("realPts",r);assign("lengths",s.lengths||[]);
  try{closed=!!s.closed||p.length>=3;}catch(_){ /* no window.closed assignment */ }
  assign("diagonals",s.diagonals||[]);try{window.diagonalOverrides=diagonalOverrides=clone(s.diagonalOverrides||{});}catch(_){window.diagonalOverrides=clone(s.diagonalOverrides||{});}
  try{window.circleMode=circleMode=!!s.circleMode;window.circleDiamCm=circleDiamCm=Number(s.circleDiamCm)||0;}catch(_){window.circleMode=!!s.circleMode;window.circleDiamCm=Number(s.circleDiamCm)||0;}
  ["notes","elemItems","elemGroups","lightMarks","wallMarks","linearElements","wallTypes","arcPoints"].forEach(function(k){assign(k,s[k]||[]);});
  if(options.draw!==false){try{if(typeof requestDraw==="function")requestDraw();else if(typeof draw==="function")draw();}catch(_){window.__diagSilent&&window.__diagSilent(_)}}
  return s;
}
function clear(options){return apply({pts:[],realPts:[],lengths:[],closed:false,diagonals:[],diagonalOverrides:{},circleMode:false,circleDiamCm:0,notes:[],elemItems:[],elemGroups:[],lightMarks:[],wallMarks:[],linearElements:[],wallTypes:[],arcPoints:[]},{draw:!(options&&options.draw===false)});}

var SM={collect:collect,apply:apply,clear:clear,normalize:normalize};
window.A·CEIL.StateManager=SM;
window.collectState=function(base){return SM.collect(base);};
window.applyState=function(state,options){return SM.apply(state,options);};

// Persistence boundaries intentionally remain in the original A·CEIL loaders/savers.
// Do NOT wrap loadProject/_loadRoomToCanvas/openObjectRooms here: most editor state
// variables are lexical (`let`), not Window properties. Re-collecting them through
// window after a load erased geometry while leaving DOM/canvas elements behind.
// StateManager stays available as an explicit normalization API only.

// Schema + integrity live here, not in a separate curve patch.
try{var schema=window.A·CEIL.RoomSchema;if(schema&&schema.FIELDS){schema.FIELDS.WALL_TYPES="wallTypes";schema.FIELDS.ARC_POINTS="arcPoints";}var integrity=window.A·CEIL.ProjectIntegrity;if(integrity&&typeof integrity.registerRule==="function")integrity.registerRule({name:"curves",run:function(project,ctx){var errors=[],warnings=[],sc=ctx.schema;if(!project||typeof project!=="object"||!sc.getStateEntries)return{errors:errors,warnings:warnings};sc.getStateEntries(project).forEach(function(entry){var pr=sc.parseState(entry.raw);if(!pr.ok||!pr.value||typeof pr.value!=="object")return;var st=pr.value,n=sideCount(st),wt=st.wallTypes,ap=st.arcPoints;if(wt!==undefined&&!Array.isArray(wt))errors.push({code:"wall_types_invalid",message:entry.label+": wallTypes очікувався масивом"});if(ap!==undefined&&!Array.isArray(ap))errors.push({code:"arc_points_invalid",message:entry.label+": arcPoints очікувався масивом"});if(Array.isArray(wt)&&n&&wt.length!==n)warnings.push({code:"wall_types_length",message:entry.label+": wallTypes має "+wt.length+" записів для "+n+" стін"});if(Array.isArray(ap)&&n&&ap.length!==n)warnings.push({code:"arc_points_length",message:entry.label+": arcPoints має "+ap.length+" записів для "+n+" стін"});});return{errors:errors,warnings:warnings};}});}catch(e){console.warn("StateManager integrity registration failed",e);}

try{var T=window.A·CEILTests;if(T&&typeof T.test==="function"){T.test("StateManager: collect/apply зберігає криві",function(t){var old=SM.collect();SM.apply({pts:[{x:0,y:0},{x:100,y:0}],wallTypes:["arc","straight"],arcPoints:[[{x:50,y:-20}],null]},{draw:false});var s=SM.collect();t.assert(s.wallTypes[0]==="arc"&&Array.isArray(s.arcPoints[0]));SM.apply(old,{draw:false});});T.test("StateManager: нова кімната не успадковує криві",function(t){var s=SM.normalize({pts:[{x:0,y:0},{x:100,y:0},{x:100,y:100}]});t.assert(s.wallTypes.every(function(x){return x==="straight";})&&s.arcPoints.every(function(x){return x===null;}));});}}catch(e){console.warn("StateManager tests registration failed",e);}
})();
