const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=path.join(__dirname,'..');
const ID='11111111-1111-4111-8111-111111111111';
function room(id,name){
 return {id,name,area:'12',per:'14',state:{pts:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],lengths:[400,300,400,300],closed:true,
  elemGroups:[{id:'g1',name:'Профіль'},{id:'g2',name:'Монтаж'}],
  elemItems:[{id:'i1',groupId:'g1',name:'Профіль базовий',source:'main_profile',qty:10,unit:'м',price:100},
   {id:'i2',groupId:'g1',name:'Профіль преміум',qty:0,unit:'м',price:150},
   {id:'i3',groupId:'g2',name:'Монтаж',qty:1,unit:'шт',price:500}]}};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,2,root);await reveal(page);
  page.on('dialog',d=>d.accept());
  await page.evaluate(({ID,r1,r2})=>{
   window.__rpc=[];
   const base=_sb||{};
   _sb=new Proxy(base,{get(t,k){if(k==='rpc')return (name,args)=>{window.__rpc.push({name,args});return Promise.resolve({data:{},error:null})};const v=t[k];return v===undefined?(()=>({on(){return this},subscribe(){return this},select(){return this},eq(){return this}})):v}});
   _sbUser={id:'u1'};
   window.A·CEIL.ProjectRepository.replaceAll([{id:ID,_dbId:ID,name:'Квартира Test',addr:'вул. Тест 1',phone:'0500000000',multiRoom:true,projectType:'apartment',rooms:[r1,r2]}]);
   _activeObjectId=ID;
  },{ID,r1:room('r1','Зал'),r2:room('r2','Спальня')});
  // an alternative variant: premium profile instead of the base one in both rooms
  const variantId=await page.evaluate(()=>{
   const E=A_CEIL_EstimateVariants,p=E.findProjectRaw(_activeObjectId);
   const v=E.createVariant(p,{name:'Економ',scope:'all',changes:{}}).variant;
   v.overrides={r1:{profile:{mode:'replace',targetItemId:'i2'}},r2:{profile:{mode:'replace',targetItemId:'i2'}}};
   E.setActiveId(p,null);E.persistProject(p);return v.id;
  });
  const publish=async(vid)=>page.evaluate(async({vid})=>{
   const E=A_CEIL_EstimateVariants,p=E.findProjectRaw(_activeObjectId);E.setActiveId(p,vid);E.persistProject(p);
   return A_CEIL_ReportLinks.publishPayload({version:2,presentation:'generated-report',image:''},{projectId:_activeObjectId,backgroundSafe:true});
  },{vid});
  const urlMain=await publish(null),urlVar=await publish(variantId);
  assert.notEqual(urlMain,urlVar,'two calculations get two different links');
  let links=await page.evaluate(()=>A_CEIL_EstimateVariants.calcLinks(A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId)).map(l=>({name:l.name,kind:l.kind,total:l.total,variantId:l.variantId,token:l.token})));
  assert.equal(links.length,2);
  assert.deepEqual(links.map(l=>l.name).sort(),['Економ','Основний']);
  const main=links.find(l=>l.variantId===null),alt=links.find(l=>l.variantId===variantId);
  assert.equal(main.total,2*(10*100+500));assert.equal(alt.total,2*(10*150+500),'each link remembers the total of its own calculation');
  // survives a reload of the project list (stored with the project)
  assert.equal(await page.evaluate(()=>A·CEIL.ProjectRepository.list().find(p=>p.id===_activeObjectId).calcLinks.length),2);

  await page.evaluate(()=>A_CEIL_OpenEstimateVariants());await page.waitForSelector('#aceilVarBar .aceilv-link-row');
  const plate=await page.locator('.aceilv-plate').innerText();
  assert.match(plate,/2 прорахунки/);
  assert.equal(await page.locator('.aceilv-link-row').count(),2);

  // comparison model and picture
  const model=await page.evaluate(vid=>{const p=A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId),m=A_CEIL_EstimateVariantsUI.comparisonModel(p,vid);
   const canvas=A_CEIL_EstimateVariantsUI.buildComparisonReportCanvas(p,vid);
   return {changed:m.changed.map(r=>[r.name,r.main,r.variant,r.diff]),same:m.same.map(r=>r.name),verdict:A_CEIL_EstimateVariantsUI.comparisonVerdict(m),w:canvas.width,h:canvas.height,data:canvas.toDataURL('image/png').length};
  },variantId);
  assert.deepEqual(model.changed,[['Профіль',2000,3000,1000]]);
  assert.deepEqual(model.same,['Монтаж']);
  assert.match(model.verdict,/Варіант 2 дорожчий на/);
  assert.equal(model.w,1080);assert.ok(model.h>900&&model.data>5000);

  // publishing the comparison adds a third, separate link
  await page.evaluate(()=>{window.__rpc.length=0;});
  await page.evaluate(vid=>A_CEIL_EstimateVariantsUI.openCompareModal(A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId)),variantId);
  await page.selectOption('#aceilvCmpSelect',variantId);
  await page.click('#aceilvCmpPublish');
  await page.waitForSelector('#aceilvCmpLink input');
  const cmpCall=await page.evaluate(()=>window.__rpc.find(c=>c.name==='aceil_publish_report_snapshot'));
  assert.ok(cmpCall&&/^data:image\//.test(cmpCall.args.p_payload.image),'comparison is published as the picture the client sees');
  assert.equal(await page.evaluate(()=>A_CEIL_EstimateVariants.calcLinks(A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId)).filter(l=>l.kind==='comparison').length),1);
  await page.click('#aceilvCmpClose');

  // closing one link leaves the other open
  await page.evaluate(()=>A_CEIL_OpenEstimateVariants());await page.waitForSelector('#aceilVarBar .aceilv-link-row');
  await page.evaluate(()=>{window.__rpc.length=0;});
  await page.locator('.aceilv-link-row').filter({has:page.locator('b',{hasText:/^📄 Економ$/})}).locator('[data-aceilv-revoke-link]').click();
  await page.waitForFunction(()=>window.__rpc.some(c=>c.name==='aceil_revoke_report_snapshot'));
  const call=await page.evaluate(()=>window.__rpc.find(c=>c.name==='aceil_revoke_report_snapshot'));
  assert.match(call.args.p_token,/^[a-f0-9]{64}$/);
  await page.waitForFunction(()=>A_CEIL_EstimateVariants.calcLinks(A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId)).some(l=>l.name==='Економ'&&A_CEIL_EstimateVariants.linkState(l)==='revoked'));
  const state=await page.evaluate(()=>A_CEIL_EstimateVariants.calcLinks(A_CEIL_EstimateVariants.findProjectRaw(_activeObjectId)).map(l=>[l.name,A_CEIL_EstimateVariants.linkState(l)]));
  assert.ok(state.some(x=>x[0]==='Економ'&&x[1]==='revoked'));
  assert.ok(state.some(x=>x[0]==='Основний'&&x[1]==='active'),'the other link stays open');
  await page.waitForFunction(()=>!document.querySelector('.aceilv-plate'));
  assert.deepEqual(errors,[]);
  console.log('PASS calc links registry, plate, per-link revoke, comparison link');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
