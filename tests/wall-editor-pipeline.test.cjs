const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=path.join(__dirname,'..'),baseline=process.env.ACEIL_WALL_EDITOR_BASELINE;
const expected={openWallEditModal:['presets','closeMenus','anchor','preview','toolbar','profileColor','placement','simplify'],rwe2Save:['profileColor','autocount','colorAutosource','breaks','distance']};
async function run(browser,source,width){
 const {page,errors}=await open(browser,width,1,source);await reveal(page);await page.waitForTimeout(1000);
 const result=[];
 for(const scenario of [
  {anchor:'start',type:'Парящий чорний',len:150,offset:35,color:'black',force:false},
  {anchor:'end',type:'Тіньовий білий',len:170,offset:45,color:'white',force:false},
  {anchor:'center',type:'Карниз білий',len:200,offset:0,color:'white',force:true},
  {anchor:'full',type:'Карниз білий',len:500,offset:0,color:'white',force:false},
  {anchor:'start',type:'Карниз білий',len:550,offset:10,color:'white',force:true}
 ]){
  await page.evaluate(()=>{
   resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];
   realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
   elemGroups=[{id:'profiles',name:'Профілі'},{id:'cornices',name:'Карнизи'}];
   elemItems=[{id:'h',groupId:'profiles',name:'Алюмінієвий H',source:'main_profile',qty:0,price:200,unit:'м'},
    {id:'floating',groupId:'profiles',name:'Парящий чорний',source:'floating_profile',sourceVariant:'black',qty:0,price:750,unit:'м'},
    {id:'shadow',groupId:'profiles',name:'Тіньовий білий',source:'shadow_profile',sourceVariant:'white',qty:0,price:550,unit:'м'},
    {id:'cornice',groupId:'cornices',name:'Карниз білий',source:'walltype:Карниз білий',qty:0,price:400,unit:'м'}];
   window.wallMarks=wallMarks=[{id:'a',sideIndex:0,type:'Парящий чорний',lenCm:120,offsetCm:25,anchor:'start',color:'#2563eb',profileColor:'black',wallDistanceCm:15},{id:'b',sideIndex:1,type:'Карниз білий',lenCm:100,offsetCm:0,anchor:'start',color:'#f97316',profileColor:'white'}];
   _activeObjectId=null;_activeRoomIdx=null;_currentProjectId='wall-pipeline-fixture';
   window['A·CEIL'].ProjectRepository.replaceAll([{id:_currentProjectId,name:'Wall test',state:JSON.stringify({schemaVersion:3,projectType:'room',pts,realPts,lengths,closed,wallMarks,lightMarks,elemItems,elemGroups})}]);
   openWallEditModal('a');
  });
  await page.waitForTimeout(600);
  const opened=await page.evaluate(()=>{const v=id=>document.getElementById(id)?.value;return {open:document.getElementById('wallEditModal').classList.contains('open'),name:v('rwe2Name'),anchor:v('rwe2Anchor'),len:v('rwe2Len'),offset:v('rwe2Offset'),color:window.__rwe2ProfileColor,distance:v('rwe2WallDistance')}});
  assert.equal(opened.open,true);assert.equal(opened.name,'Парящий чорний');assert.equal(opened.color,'black');
  await page.evaluate(s=>{
   const v=(id,value)=>{const e=document.getElementById(id);assertElement(e,id);e.value=String(value);return e};
   function assertElement(e,id){if(!e)throw new Error('Missing '+id)}
   v('rwe2Name',s.type).dispatchEvent(new Event('input',{bubbles:true}));
   v('rwe2Anchor',s.anchor);rwe2AnchorChanged();v('rwe2Len',s.len);v('rwe2Offset',s.offset);
   v('rwe2WallDistance',23);v('rwe2ColorValue','#7c3aed');rwe2SetProfileColor(s.color);
   document.getElementById('rwe2ForceBreaks').checked=s.force;rwe2Save();
  },scenario);
  await page.waitForTimeout(180);
  const saved=await page.evaluate(()=>{
   const fields=m=>{const out={};for(const k of ['id','sideIndex','type','lenCm','offsetCm','anchor','color','profileColor','wallDistanceCm','forceBreaks','_fresh'])if(m&&m[k]!==undefined)out[k]=m[k];return out};
   const local=JSON.parse(localStorage.getItem('ceiling_v18'));
   const project=JSON.parse(getProjects().find(p=>p.id===_currentProjectId).state);
   return {mark:fields(wallMarks.find(m=>m.id==='a')),local:fields(local.wallMarks.find(m=>m.id==='a')),project:fields(project.wallMarks.find(m=>m.id==='a')),items:elemItems.filter(i=>['h','floating','shadow','cornice'].includes(i.id)).map(i=>({id:i.id,qty:i.qty,source:i.source,variant:i.sourceVariant})),open:document.getElementById('wallEditModal').classList.contains('open')};
  });
  assert.equal(saved.open,false);assert.equal(saved.mark.profileColor,scenario.color);assert.equal(saved.mark.wallDistanceCm,23);
  assert.deepEqual(saved.local,saved.mark);assert.deepEqual(saved.project,saved.mark);
  assert.equal(saved.mark.lenCm,scenario.len);assert.equal(saved.mark.offsetCm,scenario.anchor==='end'?285:scenario.anchor==='center'?150:scenario.anchor==='full'?0:scenario.offset);
  result.push({opened,saved});
 }
 if(source===root){
  const contract=await page.evaluate(()=>Object.fromEntries(['openWallEditModal','rwe2Save'].map(name=>{const p=window['A·CEIL'].pipeline.get(name);return[name,{order:p.order,stages:p.registered(),duplicate:p.stage(p.order[0],{})}]})));
  for(const[name,order]of Object.entries(expected)){assert.deepEqual(contract[name].order,order);assert.deepEqual(contract[name].stages,order);assert.equal(contract[name].duplicate,false)}
 }
 // Rapidly selecting another mark must still edit that mark after delayed UI setup.
 await page.evaluate(()=>{openWallEditModal('a');openWallEditModal('b')});await page.waitForTimeout(600);
 assert.equal(await page.locator('#rwe2Name').inputValue(),'Карниз білий');
 assert.deepEqual(errors,[]);await page.close();return result;
}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 for(const width of [390,1440]){const actual=await run(browser,root,width);if(baseline)assert.deepEqual(actual,await run(browser,baseline,width));console.log('PASS wall editor: anchors, colours, distance, breaks, overhang, local persistence and pipeline '+width+'px'+(baseline?' (matches baseline)':''))}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
