const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=process.env.ACEIL_PROFILE_ROOT||path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(browser,390,1,root);await reveal(page);
  await page.evaluate(()=>{
   resetAllSilent();
   pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;
   elemGroups=[{id:'profiles',name:'Профілі'}];
   elemItems=[{id:'base',groupId:'profiles',name:'Профіль базовий',source:'main_profile',qty:0,unit:'м',price:200},{id:'shadow',groupId:'profiles',name:'Тіньовий профіль білий',source:'shadow_profile',sourceVariant:'white',qty:0,unit:'м',price:700},
    {id:'insert',groupId:'profiles',name:'Вставка біла',source:'white_insert',insertSelected:true,qty:0,unit:'м',price:60},{id:'corners',groupId:'profiles',name:'Фіксація кутів',source:'corners',qty:0,unit:'шт',price:100},{id:'scorners',groupId:'profiles',name:'Фіксація кутів тіньового',source:'shadow_corners',qty:0,unit:'шт',price:100}];
   window.A_CEIL_AutoCount.setEnabled(true,{silent:true});window.rmUniversalAutoCountV319({noSave:true});
   renderElemList();document.getElementById('elementsModal').classList.add('open');
  });
  const q=()=>page.evaluate(()=>Object.fromEntries(['base','shadow','insert','corners','scorners'].map(id=>[id,elemItems.find(i=>i.id===id).qty])));
  assert.deepEqual(await q(),{base:16,shadow:0,insert:16,corners:4,scorners:0});
  await page.locator('#emrow_shadow .em-qty-input').fill('16');await page.waitForTimeout(700);
  assert.deepEqual(await q(),{base:0,shadow:16,insert:0,corners:0,scorners:4},'whole manual shadow contour zeroes H, insert and base corners');
  await page.locator('#emrow_shadow .em-qty-input').fill('0');await page.waitForTimeout(700);
  assert.deepEqual(await q(),{base:16,shadow:0,insert:16,corners:4,scorners:0},'clearing the manual shadow restores the standard profile');
  await page.locator('#emrow_shadow .em-qty-input').fill('6');await page.waitForTimeout(700);
  assert.equal((await q()).base,16,'a partial manual quantity does not zero H');
  assert.deepEqual(errors,[]);console.log('manual shadow zeroes H ok');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
