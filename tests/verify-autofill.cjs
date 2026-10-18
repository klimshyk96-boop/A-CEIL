/* Auto-fill pipeline contract: one owner of window.autoFillNomenclature, fixed stage order, guards behave. */
const assert=require('assert/strict');const {chromium}=require('playwright');const {open,reveal}=require('./browser-review.cjs');
const checks=[];function check(n,v,i){assert.ok(v,n+': '+JSON.stringify(i));checks.push(n);}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(b,390,3);page.on('dialog',d=>d.accept());await reveal(page);await page.waitForTimeout(800);
  const r=await page.evaluate(async()=>{
   const N='A\u00b7CEIL',AF=window[N].autofill,API=window[N].API,o={};
   o.order=AF.order;o.registered=AF.registered();
   o.frozen=Object.isFrozen(AF);o.fnIsPipeline=String(window.autoFillNomenclature).indexOf('exec(list')>=0;
   try{AF.stage('nope',{});o.unknown='no throw'}catch(e){o.unknown='throws'}
   o.duplicate=AF.stage('linear',{after(){}});
   API.state.reset();
   realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];pts=realPts.map(p=>({x:100+p.x,y:100+p.y}));lengths=[500,300,500,300];closed=true;
   window.A_CEIL_AutoCount.setEnabled(true);
   await API.nomenclature.autoFill();o.filmOn=elemItems.find(x=>/3\.6/.test(x.name)).qty;
   API.state.reset();realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];pts=realPts.map(p=>({x:100+p.x,y:100+p.y}));lengths=[500,300,500,300];closed=true;
   window.A_CEIL_AutoCount.setEnabled(false);
   o.retOff=await API.nomenclature.autoFill();o.filmOff=(elemItems.find(x=>/3\.6/.test(x.name))||{qty:'none'}).qty;
   window.A_CEIL_AutoCount.setEnabled(true);
   return o;});
  check('stage order is fixed',JSON.stringify(r.order)==='["linear","universal","colorFix","cornices","insertChoice","filmFix"]',r.order);
  check('all six stages registered',r.registered.length===6,r.registered);
  check('pipeline owns window.autoFillNomenclature',r.fnIsPipeline,r);
  check('registry is frozen',r.frozen,r);
  check('unknown stage rejected',r.unknown==='throws',r);
  check('duplicate stage ignored',r.duplicate===false,r);
  check('film quantity filled when enabled',r.filmOn===15,r);
  check('auto-count off: skipped (undefined), film quantity stays 0',r.retOff===undefined&&r.filmOff===0,r);
  check('no page errors',errors.length===0,errors);
  console.log('PASS '+checks.length);
 }finally{await b.close();}
})().catch(e=>{console.error('FAIL',e.message.slice(0,500));process.exit(1);});
