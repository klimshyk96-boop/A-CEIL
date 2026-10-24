const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page,errors}=await open(browser,width);await reveal(page);await page.waitForTimeout(1700);
 const result=await page.evaluate(async()=>{
  resetAllSilent();pts=[{x:100,y:100},{x:500,y:100},{x:500,y:600},{x:100,y:600}];realPts=[{x:0,y:0},{x:400,y:0},{x:400,y:500},{x:0,y:500}];lengths=[400,500,400,500];closed=true;document.getElementById('area').textContent='20';elemItems=[];elemGroups=[];window.__A·CEILNomenCatalogV339={items:[],groups:[]};
  const api=ACEILCustomFilm,picker=A_CEILColorPicker,E=A_CEIL_EstimateVariants;
  const widths=[{nominal:3.6,max:3.6,price:510},{nominal:5.1,max:5.6,price:620}];
  const c=api.saveColor({manufacturer:'Дескор',collection:'Преміум',texture:'mat',display:'Вайс 450',swatch:'#fefefe',widths});
  picker.select('L717','premium');picker.select(c.code,c.seriesId);
  function state(){return {pts,realPts,lengths,closed,elemItems:structuredClone(elemItems),elemGroups:structuredClone(elemGroups),wallMarks:[],lightMarks:[],linearElements:[]};}
  const saved=state(),material=picker.material(saved);
  const texts=[],swatches=[],paints=[],oldText=CanvasRenderingContext2D.prototype.fillText,oldFill=picker.swatchFill,oldPreview=_modernOpenPreview;
  CanvasRenderingContext2D.prototype.fillText=function(t,...args){texts.push(String(t));return oldText.call(this,t,...args)};
  picker.swatchFill=function(ctx,swatch,...args){swatches.push(swatch);paints.push({ctx,swatch,x:args[0],y:args[1],w:args[2]});return oldFill(ctx,swatch,...args)};
  _modernOpenPreview=function(){};
  const rs={..._loadRS(),drawing:false,nomenclature:false,dimensionsList:false,showLegend:false,showWallCoords:false,showLightCoords:false,grandTotal:false,reportAudience:'client'};
  const reports=[];
  try{
   for(const type of ['single','multi','installer']){
    texts.length=0;swatches.length=0;paints.length=0;
    if(type==='single')await generateModernSingleReport(rs);
    else {let obj={rooms:[{name:'Дескор',state:JSON.stringify(saved)}]};if(type==='installer')obj=A_CEIL_InstallerShare.cleanObject(obj);await generateModernObjectReport(obj,{...rs,reportAudience:type==='installer'?'contractor-sheet':'client'});}
    reports.push({type,texts:[...texts],swatches:[...swatches],pixels:paints.map(p=>{const scale=p.ctx.canvas.dataset.hdScale||1;return {swatch:p.swatch,pixel:[...p.ctx.getImageData(Math.round((p.x+p.w/2)*scale),Math.round((p.y+p.w/2)*scale),1,1).data]};})});
   }
  }finally{CanvasRenderingContext2D.prototype.fillText=oldText;picker.swatchFill=oldFill;_modernOpenPreview=oldPreview;}
  // A stale selection marker on an inactive colour must not win over charged film.
  const stale=structuredClone(saved);stale.elemItems.unshift({name:'L717 3.6м',filmWidth:3.6,colorCode:'L717',seriesId:'premium',qty:0,filmRoomSelected:true});
  const staleMaterial=picker.material(stale);
  function variant(code,seriesId){const room={id:'r1',name:'Room',area:20,state:JSON.stringify(state())},project={rooms:[room]};const v=E.createVariant(project,{scope:'all',changes:{film:{mode:'replace',code,seriesId}}});const res=E.computeRoomItems(project,room,v.variant.id);return res;}
  const customVariant=variant(c.code,c.seriesId);
  api.saveColor({seriesId:c.seriesId,originalCode:c.code,texture:'mat',display:'Вайс 450',swatch:'#fefefe',widths:[widths[0]]});picker.select(c.code,c.seriesId);
  const removedWidth={qty:elemItems.filter(it=>it.seriesId===c.seriesId).reduce((a,it)=>a+Number(it.qty||0),0),widths:picker.audit().widths.map(w=>w.nominal)};
  api.deleteColor(c.seriesId,c.code);
  const next=api.saveColor({seriesId:c.seriesId,texture:'mat',display:'OTHER',swatch:'#ff00ff',widths});
  const historic=picker.material(saved);
  const collision=api.saveColor({manufacturer:'Other Maker',texture:'mat',display:'M303',swatch:'#ff0000',widths});picker.select(collision.code,collision.seriesId);renderElemList();const collisionCurrent=picker.current();
  picker.select('M303','premium');picker.select('L303','premium');const builtinVariant=variant('L303','premium');
  window['A·CEIL'].ProjectRepository.replaceAll([{id:'manual-regression',name:'Descor',state:JSON.stringify(saved)}]);elemItems=[];await loadProject('manual-regression');
  const reopened=picker.material();
  localStorage.setItem('manual-regression-state',JSON.stringify(saved));
  return {material,reports,staleMaterial,customVariant,removedWidth,next,original:c,historic,collision,collisionCurrent,builtinVariant,reopened};
 });
 assert.equal(result.material.displayCode,'Вайс 450');assert.equal(result.material.swatch,'#fefefe');
 for(const r of result.reports){assert.ok(r.texts.some(t=>t.includes('Вайс 450')),r.type+' displays entered code');assert.ok(r.swatches.includes('#fefefe'),r.type+' paints Descor white');assert.ok(r.pixels.some(p=>p.swatch==='#fefefe'&&p.pixel.slice(0,3).every(v=>v===254)),r.type+' has actual white sample pixels');assert.ok(!r.texts.some(t=>/^M901 ·/.test(t)),r.type+' hides internal ID');}
 assert.equal(result.staleMaterial.displayCode,'Вайс 450');
 const charged=res=>(res.items||res).filter(it=>it.filmWidth&&it.qty>0);
 for(const [key,price] of [['customVariant',620],['builtinVariant',420]]){const rows=charged(result[key]);assert.equal(rows.length,1,key+' has one film charge');assert.equal(rows[0].qty,20);assert.equal(rows[0].price,price);}
 assert.deepEqual(result.removedWidth,{qty:0,widths:[3.6]});assert.notEqual(result.next.code,result.original.code);assert.equal(result.historic.displayCode,'Вайс 450');assert.equal(result.historic.swatch,'#fefefe');assert.equal(result.reopened.swatch,'#fefefe');
 assert.deepEqual(result.collisionCurrent,{code:result.collision.code,seriesId:result.collision.seriesId});
 await page.reload();await reveal(page);await page.waitForTimeout(1700);
 const after=await page.evaluate(()=>A_CEILColorPicker.material(JSON.parse(localStorage.getItem('manual-regression-state'))));assert.equal(after.displayCode,'Вайс 450');assert.equal(after.swatch,'#fefefe');assert.deepEqual(errors,[]);
 await page.close();console.log('PASS manual catalogue regressions at '+width+'px');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
