/* A·CEIL: pure coverage resolver for overlapping wall profile marks.
   A physical interval belongs to exactly one profile and colour.
   Family priority follows contour corner ownership: no-insert, shadow, floating.
   Within the same family a later mark replaces the earlier one.
   No stored project geometry is ever rewritten by this resolver. */
(function(){
"use strict";
window.A_CEIL_ProfileMarkCoverage=function(raw,lengths,familyOf){
  var bySide={},resolved=[],rank={noinsert_profile:0,shadow_profile:1,floating_profile:2};
  (Array.isArray(raw)?raw:[]).forEach(function(mark,index){
    var family=familyOf(mark),hasSide=!!(mark&&mark.sideIndex!=null&&String(mark.sideIndex).trim()!==""),
      side=hasSide?Number(mark.sideIndex):NaN,
      len=Math.max(0,Number(mark&&mark.lenCm)||0),
      wallLen=hasSide&&Number.isInteger(side)?Number((lengths||[])[side])||0:0;
    if(!family||!(len>0))return;
    // Legacy unpositioned marks have no reliable intersection to resolve.
    if(!hasSide||!Number.isInteger(side)||side<0||!(wallLen>0)){resolved.push(mark);return;}
    var start=Math.min(Math.max(0,Number(mark.offsetCm)||0),wallLen),
      end=Math.min(wallLen,start+len);
    if(end<=start)return;
    (bySide[side]||(bySide[side]=[])).push({
      mark:mark,index:index,family:family,start:start,end:end
    });
  });
  Object.keys(bySide).forEach(function(side){
    var entries=bySide[side],cuts=[],last=null;
    entries.forEach(function(e){cuts.push(e.start,e.end)});
    cuts.sort(function(a,b){return a-b});
    for(var i=1;i<cuts.length;i++){
      var a=cuts[i-1],b=cuts[i];
      if(b-a<=.00001)continue;
      var middle=(a+b)/2,winner=null;
      entries.forEach(function(e){
        if(e.start>middle||e.end<middle)return;
        if(!winner||rank[e.family]<rank[winner.family]
          ||rank[e.family]===rank[winner.family]&&e.index>winner.index)winner=e;
      });
      if(!winner)continue;
      if(last&&last.index===winner.index&&Math.abs(last.end-a)<.00001)last.end=b;
      else {
        last={index:winner.index,mark:winner.mark,start:a,end:b,side:Number(side)};
        resolved.push(last);
      }
    }
  });
  return resolved.map(function(e){
    if(!e||!e.mark)return e;
    return Object.assign({},e.mark,{
      sideIndex:e.side,offsetCm:e.start,lenCm:e.end-e.start
    });
  });
};
})();
