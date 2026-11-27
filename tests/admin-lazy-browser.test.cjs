'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,
  executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const requests=[];
  const {page,errors,missing}=await open(browser,390,1,undefined,async p=>{
    p.on('request',req=>requests.push(new URL(req.url()).pathname));
  });
  const heavy='/js/admin/166-aceil-admin.js';
  const initial=await page.evaluate(()=>({
    facade:!!window.A_CEIL_Admin,
    support:!!window.A_CEIL_Support,
    tel:window.A_CEIL_Support.link('phone','+380 67 000 00 00'),
    scripts:document.querySelectorAll('script[src]').length,
    editor:typeof window.draw,
    projects:typeof window.renderProjects
  }));
  assert.equal(initial.facade,true);
  assert.equal(initial.support,true);
  assert.equal(initial.tel,'tel:+380670000000');
  assert.equal(initial.editor,'function');
  assert.equal(initial.projects,'function');
  assert.equal(initial.scripts,173);
  assert.equal(requests.filter(p=>p===heavy).length,0,'full admin should not block startup');
  await page.evaluate(()=>window.A_CEIL_Support.open());
  await page.waitForFunction(()=>!!document.getElementById('aceilSupportModal'),{timeout:5000});
  assert.equal(requests.filter(p=>p===heavy).length,1,'support loads the original module once');
  const after=await page.evaluate(()=>({
    modal:!!document.getElementById('aceilSupportModal'),
    adminOpen:typeof window.A_CEIL_Admin.open,
    supportLink:window.A_CEIL_Support.link('telegram','@support_user')
  }));
  assert.equal(after.modal,true);
  assert.equal(after.adminOpen,'function');
  assert.equal(after.supportLink,'https://t.me/support_user');
  assert.deepEqual(missing,[]);
  assert.deepEqual(errors,[]);
  console.log('PASS admin lazy',JSON.stringify({initialScripts:initial.scripts,
    heavyRequestsAtBoot:0,heavyRequestsAfterSupport:1,modal:after.modal}));
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL admin lazy',e);process.exitCode=1;});
