(function(){
  'use strict';
  window.A·CEIL=window.A·CEIL||{};
  function clone(value){try{return JSON.parse(JSON.stringify(value));}catch(_){return value;}}
  function stateOf(project){
    try{return typeof project?.state==='string'?JSON.parse(project.state||'{}'):(project?.state&&typeof project.state==='object'?clone(project.state):{});}catch(_){return {};}
  }
  function roomsOf(project,state){
    if(Array.isArray(project?.rooms))return project.rooms.filter(function(room){return room&&typeof room==='object';});
    return Array.isArray(state?.rooms)?state.rooms.filter(function(room){return room&&typeof room==='object';}):[];
  }
  function hasStandaloneDrawing(state){
    if(!state||typeof state!=='object')return false;
    return state.projectType==='room'||state.closed===true||(state.circleMode===true&&Number(state.circleDiamCm)>0)||
      [state.pts,state.realPts,state.lengths,state.wallMarks,state.lightMarks,state.linearElements].some(function(value){return Array.isArray(value)&&value.length>0;});
  }
  function inspect(project){
    var state=stateOf(project),rooms=roomsOf(project,state);
    var explicit=project?.multiRoom===true||project?.projectType==='apartment'||state.multiRoom===true||state.projectType==='apartment';
    var standalone=hasStandaloneDrawing(state);
    return {multi:rooms.length>0||(explicit&&!standalone),explicit:explicit,standalone:standalone,rooms:rooms,state:state};
  }
  function cleanSingleState(project){
    var info=inspect(project),state=info.state;
    if(info.multi)return state;
    delete state.multiRoom;delete state.rooms;
    if(state.projectType==='apartment')state.projectType='room';
    return state;
  }
  function repair(project){
    if(!project||inspect(project).multi)return project;
    delete project.multiRoom;delete project.rooms;
    if(project.projectType==='apartment')project.projectType='room';
    var state=cleanSingleState(project);
    project.state=typeof project.state==='string'?JSON.stringify(state):state;
    return project;
  }
  var api=Object.freeze({inspect:inspect,isMulti:function(project){return inspect(project).multi;},stateOf:stateOf,cleanSingleState:cleanSingleState,repair:repair});
  window.A·CEIL.ProjectMode=api;window.A_CEIL_ProjectMode=api;
})();
