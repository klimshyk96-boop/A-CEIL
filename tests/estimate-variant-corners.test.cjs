/* Alternatives may change contour corner fixing prices without changing geometry,
   Main estimate, lighting/track/cornice corners, or other room estimates. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','js','reports','184-aceil-estimate-variants-ui.js'),'utf8');
const marker='/* === consolidated from js/reports/184-aceil-estimate-variants-ui.js === */';
assert.ok(source.includes(marker),'combined variant module must expose engine boundary');
const window={'A·CEIL':{}};
const context=vm.createContext({window,console});
vm.runInContext(source.slice(0,source.indexOf(marker)),context);
const api=window.A_CEIL_EstimateVariants;
assert.ok(api&&api.createVariant&&api.isContourCornerItem);

function room(id,normal,shadow){
  return {id,name:id,state:JSON.stringify({
    elemItems:[
      {id:'normal',groupId:'contour',name:'Фіксація кутів',source:'corners',unit:'шт',qty:normal,price:100},
      {id:'shadow',groupId:'contour',name:'Фіксація кута - тіньовий профіль',source:'shadow_corners',unit:'шт',qty:shadow,price:350},
      {id:'floating',groupId:'contour',name:'Фіксація кута - парящий',source:'floating_corners',unit:'шт',qty:0,price:400},
      {id:'noinsert',groupId:'contour',name:'Фіксація кутів - безвставочний профіль',source:'',unit:'шт',qty:0,price:200},
      {id:'track',groupId:'other',name:'Кут магнітний шинопровід',source:'linearcorners:magneticTrack',unit:'шт',qty:2,price:1000},
      {id:'light',groupId:'other',name:'Кут світлова лінія',source:'linear_corner',unit:'шт',qty:1,price:800},
      {id:'cornice',groupId:'other',name:'Кут карнизу',source:'cornice_corners',unit:'шт',qty:2,price:500},
      {id:'paint',groupId:'other',name:'Фарбування',source:'',unit:'шт',qty:1,price:50}
    ],
    elemGroups:[{id:'contour',name:'Фіксація кутів'},{id:'other',name:'Решта робіт'}]
  })};
}
function rows(project,roomId,variantId){
  return api.computeRoomItems(project,project.rooms.find(r=>r.id===roomId),variantId).items;
}
function qty(items,id){return items.find(i=>i.id===id).qty;}
const project={id:'p1',name:'Тестовий кошторис',rooms:[room('a',4,2),room('b',5,0)]};
let repository=[JSON.parse(JSON.stringify(project))];
window['A·CEIL'].ProjectRepository={
  list:()=>JSON.parse(JSON.stringify(repository)),
  replaceAll:items=>(repository=JSON.parse(JSON.stringify(items)),true)
};
const mainSnapshot=JSON.stringify(project.rooms);
const baseTotal=api.computeProjectBreakdown(project,null).grandTotal;

const corners=api.catalogItemsUnion(project).filter(api.isContourCornerItem);
assert.deepEqual(Array.from(corners,x=>x.id),['normal','shadow','floating','noinsert']);
assert.equal(api.isContourCornerItem(rows(project,'a',null).find(x=>x.id==='track')),false);
assert.equal(api.isContourCornerItem(rows(project,'a',null).find(x=>x.id==='light')),false);
assert.equal(api.isContourCornerItem(rows(project,'a',null).find(x=>x.id==='cornice')),false);

const first=api.createVariant(project,{
  name:'Інші кути',scope:'rooms',roomIds:['a'],
  changes:{corners:{mode:'item',targetItemId:'noinsert'}}
});
assert.equal(first.assumptions.length,0);
const firstA=rows(project,'a',first.variant.id);
const firstB=rows(project,'b',first.variant.id);
assert.equal(qty(firstA,'normal'),0);
assert.equal(qty(firstA,'shadow'),0);
assert.equal(qty(firstA,'noinsert'),6,'a mixed 4+2 corner contour must become six alternate corners');
assert.equal(qty(firstB,'normal'),5,'unselected room unchanged');
for(const id of ['track','light','cornice','paint'])
  assert.equal(qty(firstA,id),qty(rows(project,'a',null),id),id+' cannot be affected by contour corner choice');
assert.equal(api.computeProjectBreakdown(project,first.variant.id).grandTotal-baseTotal,100,'real catalog price changes total by +100 UAH');
assert.equal(JSON.stringify(project.rooms),mainSnapshot,'Main is immutable');

const second=api.createVariant(project,{
  name:'Тіньові кути',baseVariantId:first.variant.id,scope:'rooms',roomIds:['a'],
  changes:{corners:{mode:'item',targetItemId:'shadow'}}
});
const secondA=rows(project,'a',second.variant.id);
assert.equal(qty(secondA,'shadow'),6,'chained alternative transfers the already-variant quantity');
assert.equal(qty(secondA,'noinsert'),0);
assert.equal(qty(secondA,'normal'),0);

const removed=api.createVariant(project,{
  name:'Без фіксації',baseVariantId:second.variant.id,scope:'rooms',roomIds:['a'],
  changes:{corners:{mode:'remove'}}
});
assert.equal(qty(rows(project,'a',removed.variant.id),'shadow'),0);
assert.equal(qty(rows(project,'a',removed.variant.id),'track'),2,'track corners survive removal');

const virtual=api.virtualizeProjectForRender(project);
assert.equal(qty(JSON.parse(virtual.rooms[0].state).elemItems,'shadow'),0);
assert.equal(JSON.stringify(project.rooms),mainSnapshot,'report virtualization must not persist edits');

assert.equal(api.persistProject(project),true,'changes saved into project repository');
const persisted=JSON.parse(JSON.stringify(repository[0]));
assert.equal(persisted.rooms[0]._aceilVariantsShadow.variants.length,3,'variants copied to cloud-safe room shadow');
delete persisted.estimateVariants;
delete persisted._activeEstimateVariantId;
api.ensure(persisted);
assert.equal(persisted.estimateVariants.length,3,'variant restored from synced shadow');
assert.equal(qty(rows(persisted,'a',first.variant.id),'noinsert'),6,'corner selection survives sync/reopen');
assert.equal(JSON.stringify(project.rooms),JSON.stringify(repository[0].rooms.map((r,i)=>i===0?Object.assign({},r,{_aceilVariantsShadow:undefined}):r)).replaceAll(',"_aceilVariantsShadow":undefined',''),'Main items untouched');
console.log('Estimate variant corner selection, scope, comparison, chaining and storage: OK');
