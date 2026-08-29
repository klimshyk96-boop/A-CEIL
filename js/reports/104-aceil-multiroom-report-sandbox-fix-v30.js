
(function(){
  'use strict';
  function clone(v){
    try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}
  }
  function parseState(v){
    try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{});}catch(e){return {};}
  }
  function projectList(){
    try{
      if(window.A·CEIL.ProjectRepository) return window.A·CEIL.ProjectRepository.list();
      if(typeof getProjects==='function') return getProjects();
    }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    return [];
  }
  function findObject(id){
    return projectList().find(function(p){
      return p && (String(p.id)===String(id)||String(p._dbId)===String(id)||String(p._localId)===String(id));
    }) || null;
  }
  function fitReportViewport(points, width, height){
    points=Array.isArray(points)?points.filter(function(p){return p&&isFinite(Number(p.x))&&isFinite(Number(p.y));}):[];
    if(points.length<2){
      viewScale=1; viewOffsetX=0; viewOffsetY=0;
      return;
    }
    var xs=points.map(function(p){return Number(p.x)}), ys=points.map(function(p){return Number(p.y)});
    var minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs);
    var minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
    var bw=Math.max(1,maxX-minX), bh=Math.max(1,maxY-minY);
    var pad=Math.max(100,Math.min(width,height)*0.10);
    var scale=Math.min((width-2*pad)/bw,(height-2*pad)/bh);
    if(!isFinite(scale)||scale<=0) scale=1;
    viewScale=scale;
    viewOffsetX=width/2-((minX+maxX)/2)*scale;
    viewOffsetY=height/2-((minY+maxY)/2)*scale;
  }
  function snapshotGlobals(){
    return {
      pts:clone(typeof pts!=='undefined'?pts:[]),
      lengths:clone(typeof lengths!=='undefined'?lengths:[]),
      realPts:clone(typeof realPts!=='undefined'?realPts:[]),
      closed:typeof closed!=='undefined'?closed:false,
      diagonals:clone(typeof diagonals!=='undefined'?diagonals:[]),
      circleMode:typeof circleMode!=='undefined'?circleMode:false,
      circleDiamCm:typeof circleDiamCm!=='undefined'?circleDiamCm:0,
      diagonalOverrides:clone(typeof diagonalOverrides!=='undefined'?diagonalOverrides:{}),
      notes:clone(typeof notes!=='undefined'?notes:[]),
      elemItems:clone(typeof elemItems!=='undefined'?elemItems:[]),
      elemGroups:clone(typeof elemGroups!=='undefined'?elemGroups:[]),
      lightMarks:clone(typeof lightMarks!=='undefined'?lightMarks:[]),
      wallMarks:clone(typeof wallMarks!=='undefined'?wallMarks:[]),linearElements:clone(typeof linearElements!=='undefined'?linearElements:[]),wallTypes:clone(typeof wallTypes!=='undefined'?wallTypes:[]),arcPoints:clone(typeof arcPoints!=='undefined'?arcPoints:[]),
      viewScale:typeof viewScale!=='undefined'?viewScale:1,
      viewOffsetX:typeof viewOffsetX!=='undefined'?viewOffsetX:0,
      viewOffsetY:typeof viewOffsetY!=='undefined'?viewOffsetY:0,
      reportMode:typeof _reportMode!=='undefined'?_reportMode:false,
      lightMode:typeof lightMode!=='undefined'?lightMode:null,
      selectedLightId:typeof selectedLightId!=='undefined'?selectedLightId:null,
      wallSideFlash:typeof _wallSideFlash!=='undefined'?_wallSideFlash:-1,
      canvasWidth:typeof cv!=='undefined'?cv.width:0,
      canvasHeight:typeof cv!=='undefined'?cv.height:0
    };
  }
  function restoreGlobals(s){
    pts=clone(s.pts); lengths=clone(s.lengths); realPts=clone(s.realPts); closed=!!s.closed;
    diagonals=clone(s.diagonals); circleMode=!!s.circleMode; circleDiamCm=s.circleDiamCm||0;
    diagonalOverrides=clone(s.diagonalOverrides); notes=clone(s.notes);
    elemItems=clone(s.elemItems); elemGroups=clone(s.elemGroups);
    lightMarks=clone(s.lightMarks); wallMarks=clone(s.wallMarks); linearElements=clone(s.linearElements||[]); wallTypes=clone(s.wallTypes||[]); arcPoints=clone(s.arcPoints||[]);
    viewScale=s.viewScale; viewOffsetX=s.viewOffsetX; viewOffsetY=s.viewOffsetY;
    _reportMode=!!s.reportMode; lightMode=s.lightMode;
    if(typeof selectedLightId!=='undefined') selectedLightId=s.selectedLightId;
    if(typeof _wallSideFlash!=='undefined') _wallSideFlash=s.wallSideFlash;
    if(typeof cv!=='undefined'&&s.canvasWidth&&s.canvasHeight){cv.width=s.canvasWidth;cv.height=s.canvasHeight;}
    window.lightMarks=lightMarks; window.wallMarks=wallMarks; window.linearElements=linearElements; window.wallTypes=wallTypes; window.arcPoints=arcPoints;
    try{draw();}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }
  function applyRoomState(st,rs){
    pts=clone(st.pts||[]);
    realPts=clone(st.realPts||[]);
    if(!pts.length&&realPts.length) pts=clone(realPts);
    if(!realPts.length&&pts.length) realPts=clone(pts);
    lengths=clone(st.lengths||[]);
    closed=!!st.closed||pts.length>=3;
    diagonals=clone(st.diagonals||[]);
    circleMode=!!st.circleMode;
    circleDiamCm=Number(st.circleDiamCm)||0;
    diagonalOverrides=clone(st.diagonalOverrides||{});
    notes=clone(st.notes||[]);
    elemItems=clone(st.elemItems||[]);
    elemGroups=clone(st.elemGroups||[]);
    lightMarks=rs&&rs.showLights===false?[]:clone(st.lightMarks||[]);
    wallMarks=clone(st.wallMarks||[]);
    linearElements=clone(st.linearElements||[]);
    wallTypes=clone(st.wallTypes||[]);
    arcPoints=clone(st.arcPoints||[]);
    window.lightMarks=lightMarks; window.wallMarks=wallMarks; window.linearElements=linearElements; window.wallTypes=wallTypes; window.arcPoints=arcPoints;
    lightMode=null;
    if(typeof selectedLightId!=='undefined') selectedLightId=null;
    if(typeof _wallSideFlash!=='undefined') _wallSideFlash=-1;
    _reportMode=true;
  }
  var previousRender=window._renderRoomForReport;
  window._renderRoomForReport=function(room,rs){
    if(!room) return '';
    var st=parseState(room.state);
    var hasGeometry=(Array.isArray(st.pts)&&st.pts.length)||(Array.isArray(st.realPts)&&st.realPts.length)||st.circleMode;
    if(!hasGeometry) return room.thumb||('function'===typeof previousRender?previousRender(room,rs):'');
    if(typeof cv==='undefined'||typeof draw!=='function') return room.thumb||'';
    var saved=snapshotGlobals();
    window.__A·CEILReportRendering=true;
    try{
      applyRoomState(st,rs||{});
      var scale=4;
      cv.width=Math.max(1,Math.round(saved.canvasWidth*scale));
      cv.height=Math.max(1,Math.round(saved.canvasHeight*scale));
      if(circleMode){
        viewScale=1;viewOffsetX=0;viewOffsetY=0;
      }else{
        fitReportViewport(pts.length?pts:realPts,cv.width,cv.height);
      }
      draw();
      return cv.toDataURL('image/png');
    }catch(e){
      console.error('A·CEIL report render failed',e);
      return room.thumb||'';
    }finally{
      restoreGlobals(saved);
      window.__A·CEILReportRendering=false;
    }
  };
  try{_renderRoomForReport=window._renderRoomForReport;}catch(e){window.__diagSilent&&window.__diagSilent(e)}

  // Report generation must never rebuild or overwrite the active room with a partial legacy state.
  var previousOpenObjectReport=window.openObjectReportFromCanvas;
  window.openObjectReportFromCanvas=async function(){
    if(typeof _activeObjectId==='undefined'||_activeObjectId===null){
      return typeof previousOpenObjectReport==='function'?previousOpenObjectReport.apply(this,arguments):void 0;
    }
    try{
      if(typeof window.saveCurrentRoom==='function'&&_activeRoomIdx!==null){
        Promise.resolve(window.saveCurrentRoom()).catch(function(err){
          try{
            if(window.A·CEIL&&window.A·CEIL.DebugLog){
              window.A·CEIL.DebugLog.warn('report_presave_failed',{
                objectId:typeof _activeObjectId!=='undefined'?_activeObjectId:null,
                message:err&&err.message?err.message:String(err),
                source:'openObjectReportFromCanvas'
              });
            }
          }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        });
      }
      if(typeof window.openReportSettings==='function'){
        return window.openReportSettings();
      }
      throw new Error('Report settings unavailable');
    }catch(e){
      console.error('A·CEIL report settings failed',e);
      if(typeof showToast==='function') showToast('Не вдалося відкрити налаштування звіту');
    }
  };
  try{openObjectReportFromCanvas=window.openObjectReportFromCanvas;}catch(e){window.__diagSilent&&window.__diagSilent(e)}

  // Preserve the report target while the settings modal is open.
  // saveToPhone() normally generates a single-room report whenever the current
  // room is closed, so MultiRoom must be intercepted before that legacy branch.
  function findReportObject(id){
    var arr=[];
    try{
      arr=window.A·CEIL.ProjectRepository&&typeof window.A·CEIL.ProjectRepository.list==='function'
        ? window.A·CEIL.ProjectRepository.list()
        : (typeof getProjects==='function'?getProjects():[]);
    }catch(e){ arr=[]; }
    var obj=(arr||[]).find(function(p){
      return p&&id!=null&&[p.id,p._dbId,p._localId].some(function(v){
        return v!=null&&String(v)===String(id);
      });
    });
    if(!obj) return null;
    var copy;
    try{ copy=JSON.parse(JSON.stringify(obj)); }catch(e){ copy=obj; }
    if(!Array.isArray(copy.rooms)){
      try{
        var st=typeof copy.state==='string'?JSON.parse(copy.state||'{}'):(copy.state||{});
        if(Array.isArray(st.rooms)) copy.rooms=JSON.parse(JSON.stringify(st.rooms));
      }catch(e){window.__diagSilent&&window.__diagSilent(e)}
    }
    return copy;
  }

  var previousOpenObjectReportFromCanvasV2=window.openObjectReportFromCanvas;
  window.openObjectReportFromCanvas=async function(){
    if(typeof _activeObjectId!=='undefined'&&_activeObjectId!==null){
      window.__A·CEILPendingMultiRoomReportId=_activeObjectId;
    }
    return previousOpenObjectReportFromCanvasV2.apply(this,arguments);
  };
  try{openObjectReportFromCanvas=window.openObjectReportFromCanvas;}catch(e){window.__diagSilent&&window.__diagSilent(e)}

  if(typeof window.openObjectReport==='function'){
    var previousOpenObjectReportV2=window.openObjectReport;
    window.openObjectReport=function(){
      if(typeof _activeObjectId!=='undefined'&&_activeObjectId!==null){
        window.__A·CEILPendingMultiRoomReportId=_activeObjectId;
      }
      return previousOpenObjectReportV2.apply(this,arguments);
    };
    try{openObjectReport=window.openObjectReport;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  var previousSaveToPhoneV2=window.saveToPhone||(
    typeof saveToPhone==='function'?saveToPhone:null
  );
  if(typeof previousSaveToPhoneV2==='function'){
    window.saveToPhone=async function(){
      var pendingId=window.__A·CEILPendingMultiRoomReportId;
      if(pendingId==null&&typeof _activeObjectId!=='undefined'&&_activeObjectId!==null){
        pendingId=_activeObjectId;
      }
      if(pendingId!=null){
        window.__A·CEILPendingMultiRoomReportId=null;
        try{
          if(typeof window.saveCurrentRoom==='function'&&
             typeof _activeRoomIdx!=='undefined'&&_activeRoomIdx!==null){
            Promise.resolve(window.saveCurrentRoom()).catch(function(e){
              try{
                if(window.A·CEIL&&window.A·CEIL.DebugLog){
                  window.A·CEIL.DebugLog.warn('report_presave_failed',{
                    objectId:pendingId,
                    message:e&&e.message?e.message:String(e),
                    source:'saveToPhone'
                  });
                }
              }catch(_){window.__diagSilent&&window.__diagSilent(_)}
            });
          }
          var obj=findReportObject(pendingId);
          if(obj&&Array.isArray(obj.rooms)&&obj.rooms.length&&
             typeof generateObjectReport==='function'){
            return await generateObjectReport(obj);
          }
        }catch(e){
          console.error('A·CEIL multiroom report failed',e);
          try{
            if(window.A·CEIL&&window.A·CEIL.DebugLog){
              window.A·CEIL.DebugLog.error('multiroom_report_failed',{
                objectId:pendingId,
                message:e&&e.message?e.message:String(e)
              });
            }
          }catch(_){window.__diagSilent&&window.__diagSilent(_)}
        }
      }
      return previousSaveToPhoneV2.apply(this,arguments);
    };
    try{saveToPhone=window.saveToPhone;}catch(e){window.__diagSilent&&window.__diagSilent(e)}
  }

  // NOTE (cleanup audit, safe removal): this block used to wrap window.saveCurrentRoom
  // and window._commitRoomToObject to block calls during report rendering. Both functions
  // are unconditionally redefined by A·CEIL-multiroom-lifecycle-v31 immediately below
  // (document order), with nothing in between able to invoke the wrapped versions, so the
  // wrap here was dead on arrival and has been removed. The report-rendering guard flag
  // (window.__A·CEILReportRendering) itself is still set above and is still honored by
  // v31's own commitLocal(), so report-sandboxing behavior is unaffected.
})();
