const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_WALL_RESTORE_ROOT||path.join(__dirname,'..');
function unit(){
 const callbacks=[],c={window:null,setTimeout:fn=>callbacks.push(fn),wallMarks:[],linearElements:[],wallTypes:[],arcPoints:[],'A·CEIL':{}};c.window=c;
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/canvas/173-aceil-wall-elements-persistence.js'),'utf8'),c);
 const target={state:{wallMarks:[],linearElements:[],wallTypes:['straight'],arcPoints:[null]},wallMarks:[{id:'stale'}]};
 c['A·CEIL'].WallElementPersistence.restoreCanvasState(target);assert.equal(c.wallMarks.length,0);
 const fallback={state:'{}',wallMarks:[{id:'legacy'}]};c['A·CEIL'].WallElementPersistence.restoreCanvasState(fallback);assert.equal(c.wallMarks[0].id,'legacy');c.wallMarks[0].id='edited';assert.equal(fallback.wallMarks[0].id,'legacy');
 // Module installation may retry save wrappers; no callback may replay a wall snapshot.
 callbacks.forEach(fn=>fn());assert.equal(c.wallMarks[0].id,'edited');
 console.log('PASS explicit restoration: empty arrays win, legacy fallback cloned, no delayed state replay');
}
async function browserCase(browser,width){
 const {page,errors}=await open(browser,width,1,root);await reveal(page);
 await page.evaluate(()=>{
  resetAllSilent();
  const mark=id=>({id,type:'cornice',sideIndex:0,lenCm:50});
  const line=id=>({id,elementType:'lightLine',shape:'line',segments:[100],totalLengthCm:100,center:{x:100,y:100},centerCanvasPx:{x:200,y:200},baseIndex:0,rotationDeg:0,profileWidth:30});
  const state=(id,empty=false)=>JSON.stringify({pts:[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],lengths:[500,300,500,300],closed:true,wallMarks:empty?[]:[mark(id)],linearElements:empty?[]:[line('line-'+id)],wallTypes:['straight','straight','straight','straight'],arcPoints:[null,null,null,null],lightMarks:[],elemItems:[],elemGroups:[]});
  window['A·CEIL'].ProjectRepository.replaceAll([{id:'walls',name:'Walls',multiRoom:true,rooms:[{id:'rA',name:'A',state:state('a')},{id:'rB',name:'B',state:state('b')},{id:'empty',name:'Empty',state:state('none',true)}],state:'{}'},{id:'single',name:'Single',state:state('single')}]);
  _activeObjectId='walls';_activeRoomIdx=null;window._activeRoomId=null;_currentProjectId=null;
 });
 await page.evaluate(()=>openRoom(0));await page.waitForTimeout(350);
 assert.deepEqual(await page.evaluate(()=>({walls:wallMarks.map(x=>x.id),lines:linearElements.map(x=>x.id)})),{walls:['a'],lines:['line-a']});
 // A real edit made immediately after switching must survive all old redraw delays.
 await page.evaluate(()=>{openRoom(1);wallMarks.push({id:'new-edit',type:'cornice',sideIndex:1,lenCm:25});linearElements[0].segments=[150];linearElements[0].totalLengthCm=150});
 await page.waitForTimeout(350);
 assert.deepEqual(await page.evaluate(()=>({walls:wallMarks.map(x=>x.id),segment:linearElements[0]?.segments[0]})),{walls:['b','new-edit'],segment:150});
 await page.evaluate(()=>openRoom(2));await page.waitForTimeout(350);
 assert.deepEqual(await page.evaluate(()=>({walls:wallMarks.length,lines:linearElements.length})),{walls:0,lines:0});
 await page.evaluate(()=>loadProject('single'));await page.waitForTimeout(350);
 assert.deepEqual(await page.evaluate(()=>({walls:wallMarks.map(x=>x.id),lines:linearElements.map(x=>x.id)})),{walls:['single'],lines:['line-single']});
 await page.evaluate(()=>loadProject('walls'));await page.waitForTimeout(350);
 assert.deepEqual(await page.evaluate(()=>({walls:wallMarks.map(x=>x.id),lines:linearElements.map(x=>x.id)})),{walls:['a'],lines:['line-a']});
 // A line center scheduled by a previous load must never be resolved in a new room.
 const centers=await page.evaluate(()=>{
  const linear=window['A·CEIL'].LinearPersistence;if(!linear)return null;
  linear.restore([{id:'old',center:{x:20,y:30}}]);const old=linearElements;window.__oldLinesForTest=old;
  linear.restore([{id:'new',centerCanvasPx:{x:1,y:1}}]);return {old:old[0].centerCanvasPx||null,current:linearElements[0].id};
 });assert.deepEqual(centers,{old:null,current:'new'});
 await page.waitForTimeout(25);assert.equal(await page.evaluate(()=>window.__oldLinesForTest[0].centerCanvasPx||null),null);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS room/project wall and line restore, immediate edits, empty room and apartment state '+width+'px');
}
(async()=>{unit();const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{for(const width of [390,1440])await browserCase(browser,width)}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
