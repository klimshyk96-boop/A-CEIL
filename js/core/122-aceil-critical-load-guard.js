
(function(){
"use strict";
// Guard against cached/global wrappers from an earlier build in the same tab.
function unwrap(name){
  try{
    var fn=window[name];
    if(fn&&fn.__stateManagerBoundary&&typeof fn.__original==="function"){
      window[name]=fn.__original;
      if(name==="loadProject") loadProject=fn.__original;
      else if(name==="_loadRoomToCanvas") _loadRoomToCanvas=fn.__original;
      else if(name==="openObjectRooms") openObjectRooms=fn.__original;
      else if(name==="saveState") saveState=fn.__original;
    }
  }catch(_){window.__diagSilent&&window.__diagSilent(_)}
}
["loadProject","_loadRoomToCanvas","openObjectRooms","saveState"].forEach(unwrap);
})();
