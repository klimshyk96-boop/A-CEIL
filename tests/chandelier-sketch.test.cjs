const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{for(const width of [390,1440]){
 const {page,errors}=await open(browser,width);await reveal(page);
 const shape=await page.evaluate(()=>{resetAllSilent();A_CEIL_AutoCount.setEnabled(false,{silent:true});const w=ACEILCanvas.width(cv),h=ACEILCanvas.height(cv),s=Math.min(w,h)*.5,x=w*.2,y=h*.2;pts=[{x,y},{x:x+s,y},{x:x+s,y:y+s},{x,y:y+s}];realPts=pts.map(p=>({x:p.x-x,y:p.y-y}));lengths=[200,200,200,200];closed=true;viewScale=1;viewOffsetX=0;viewOffsetY=0;lightMarks=[{id:'camera-kept',type:'ce_camera_sensor',x:x+s*.1,y:y+s*.1}];draw();return{x,y,s}});
 async function points(){for(const ratio of [.3,.7]){const p={x:shape.x+shape.s*ratio,y:shape.y+shape.s*.5};const screen=await page.evaluate(p=>{const r=cv.getBoundingClientRect();return{x:r.left+(p.x*viewScale+viewOffsetX)*r.width/ACEILCanvas.width(cv),y:r.top+(p.y*viewScale+viewOffsetY)*r.height/ACEILCanvas.height(cv)}},p);
 if(width===390)await page.locator('#cv').dispatchEvent('pointerdown',{clientX:screen.x,clientY:screen.y,pointerType:'touch',isPrimary:true,button:0,bubbles:true});else await page.mouse.click(screen.x,screen.y);}}
 await page.evaluate(()=>{__aceilLightPlacementType='double_spot';rmStartChandelier()});
 await page.locator('#rmChSketch').click();assert.equal(await page.locator('#rmChandelierFlowModal').evaluate(e=>e.classList.contains('open')),false);assert.match(await page.locator('#rmSmartAlign347 .rm-sa-qty b').innerText(),/люстр/);
 await page.locator('#rmSaQty347').fill('2');await page.locator('#rmSmartAlign347 .rm-sa-start').click();await points();await page.locator('#rmSaConfirm347').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>lightMarks.length),1,'preview does not add fixtures');
 await page.locator('#rmSaConfirm347 button[onclick="rmSa347Apply()"]').click();
 const marks=await page.evaluate(()=>lightMarks);assert.equal(marks.filter(m=>m.type==='chandelier').length,2);assert.equal(marks.filter(m=>m.type==='spot'||m.type==='double_spot').length,0);assert.ok(marks.some(m=>m.id==='camera-kept'));assert.ok(marks.filter(m=>m.type==='chandelier').every(m=>m.smartAligned&&Number.isFinite(m.coordX)&&Number.isFinite(m.coordY)));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ceiling_v18')).lightMarks.filter(m=>m.type==='chandelier').length),2);
 await page.evaluate(()=>rmStartChandelier());await page.locator('#rmChSketch').click();await page.locator('#rmSmartAlign347 .rm-sa-cancel').click();assert.equal(await page.evaluate(()=>lightMarks.length),3);
 // A later spot sketch must not inherit the chandelier type.
 await page.evaluate(()=>{rmStartSpotFlow();rmSa347Open()});assert.match(await page.locator('#rmSmartAlign347 .rm-sa-qty b').innerText(),/світильників/);await page.locator('#rmSaQty347').fill('2');await page.locator('#rmSmartAlign347 .rm-sa-start').click();await points();await page.locator('#rmSaConfirm347 button[onclick="rmSa347Apply()"]').click();assert.equal(await page.evaluate(()=>lightMarks.filter(m=>m.type==='spot').length),2);assert.equal(await page.evaluate(()=>lightMarks.filter(m=>m.type==='chandelier').length),2);assert.deepEqual(errors,[]);await page.close();console.log('PASS chandelier sketch '+width+'px: type, touch/mouse, coordinates, save, cancel and subsequent spots');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
