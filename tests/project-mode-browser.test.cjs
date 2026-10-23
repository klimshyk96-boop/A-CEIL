const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
 const {page,errors}=await open(browser,390);await reveal(page);
 const result=await page.evaluate(async()=>{
  const drawing={projectType:'apartment',multiRoom:true,rooms:[],closed:true,pts:[{x:100,y:100},{x:500,y:100},{x:500,y:400},{x:100,y:400}],realPts:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],lengths:[400,300,400,300]};
  const damaged={id:'damaged-single',_dbId:'damaged-single',name:'Звичайний проєкт',multiRoom:true,projectType:'apartment',rooms:[],state:JSON.stringify(drawing)};
  const room={id:'r1',name:'Кімната 1',state:JSON.stringify({...drawing,projectType:'room',multiRoom:false})};
  const apartment={id:'real-multi',_dbId:'real-multi',name:'Квартира',multiRoom:true,projectType:'apartment',rooms:[room],state:JSON.stringify({multiRoom:true,rooms:[room]})};
  window['A·CEIL'].ProjectRepository.replaceAll([damaged,apartment]);renderProjects();
  const cards=[...document.querySelectorAll('#projectsList .rp-project-card')].map(card=>({name:card.querySelector('.rp-project-title')?.textContent,action:card.querySelector('.rp-project-actions button')?.getAttribute('onclick'),badge:card.textContent.includes('Багатокімнатний')}));
  await loadProject('damaged-single');
  return {cards,current:_currentProjectId,object:_activeObjectId,closed,lengths:structuredClone(lengths)};
 });
 assert.deepEqual(result.cards,[{name:'Звичайний проєкт',action:"loadProject('damaged-single')",badge:false},{name:'Квартира',action:"openObjectRooms('real-multi')",badge:true}]);
 assert.equal(result.current,'damaged-single');assert.equal(result.object,null);assert.equal(result.closed,true);assert.deepEqual(result.lengths,[400,300,400,300]);assert.deepEqual(errors,[]);
 console.log('PASS stale multi-room flags route to the standalone canvas while a real apartment keeps its room flow');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exit(1)});
