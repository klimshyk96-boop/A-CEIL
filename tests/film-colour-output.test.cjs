const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
 const {page,errors}=await open(browser,390);await reveal(page);await page.waitForTimeout(1700);
 await page.evaluate(()=>{resetAllSilent();pts=[{x:100,y:100},{x:600,y:100},{x:600,y:400},{x:100,y:400}];realPts=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}];lengths=[500,300,500,300];closed=true;document.getElementById('area').textContent='15';elemItems=[];elemGroups=[];window.__A·CEILNomenCatalogV339={items:[],groups:[]};});
 for(const [code,text] of [['M303','rgb(15, 23, 42)'],['M347','rgb(255, 255, 255)'],['L717',null]]){
  const result=await page.evaluate(code=>{window.A_CEILColorPicker.select(code,'premium');const b=document.getElementById('aceilColorPickerBtn'),m=window.A_CEILColorPicker.material();return {background:b.style.background,color:getComputedStyle(b).color,widthColor:getComputedStyle(document.getElementById('acpbWidth')).color,swatch:m.swatch};},code);
  assert.ok(result.background);assert.ok(result.swatch);if(text)assert.equal(result.color,text);assert.equal(result.widthColor,result.color);
 }
 const report=await page.evaluate(async()=>{
  const picker=window.A_CEILColorPicker,expected=picker.material(),state={pts,realPts,lengths,closed:true,elemItems:structuredClone(elemItems),elemGroups:structuredClone(elemGroups),wallMarks:[],lightMarks:[],linearElements:[]};
  const clean=window.A_CEIL_InstallerShare.cleanObject({name:'Кольори',rooms:[{name:'Кімната',state:JSON.stringify(state)}]});
  const white=structuredClone(state);white.elemItems=[{id:'white',name:'M303 3.6м',colorCode:'M303',colorTexture:'mat',seriesId:'premium',filmWidth:3.6,qty:15,filmRoomSelected:true}];
  const texts=[],paints=[],oldText=CanvasRenderingContext2D.prototype.fillText,oldFill=picker.swatchFill,oldPreview=_modernOpenPreview;
  CanvasRenderingContext2D.prototype.fillText=function(t,...args){texts.push(String(t));return oldText.call(this,t,...args)};
  picker.swatchFill=function(ctx,swatch,x,y,w){paints.push({ctx,swatch,x,y,w});return oldFill(ctx,swatch,x,y,w)};
  _modernOpenPreview=function(canvas){window.__colourReport=canvas};
  const rs={..._loadRS(),drawing:false,nomenclature:false,dimensionsList:false,showLegend:false,showWallCoords:false,showLightCoords:false,grandTotal:false,harpoonColor:'white',productionTime:'normal'};
  function pixels(){return paints.map(p=>{const scale=p.ctx.canvas.dataset.hdScale||1;return {swatch:p.swatch,pixel:[...p.ctx.getImageData(Math.round((p.x+p.w/2)*scale),Math.round((p.y+p.w/2)*scale),1,1).data]}})}
  try{
   await generateModernSingleReport({...rs,reportAudience:'client'});const single=pixels();paints.length=0;
   await generateModernObjectReport({name:'Дві кімнати',rooms:[{name:'Колір',state:JSON.stringify(state)},{name:'Білий',state:JSON.stringify(white)}]},{...rs,reportAudience:'client'});const multi=pixels();paints.length=0;
   await generateModernObjectReport(clean,{...rs,reportAudience:'contractor-sheet'});const installer=pixels();paints.length=0;
   await generateModernObjectReport({rooms:[{name:'Оновлений колір',state:JSON.stringify(state),ceilingColor:'M303',ceilingSwatch:'#ffffff'}]},{...rs,reportAudience:'contractor-sheet'});const updated=pixels();
   return {expected,clean:clean.rooms[0],single,multi,installer,updated,texts};
  }finally{CanvasRenderingContext2D.prototype.fillText=oldText;picker.swatchFill=oldFill;_modernOpenPreview=oldPreview}
 });
 assert.equal(report.clean.ceilingSwatch,report.expected.swatch);assert.ok(report.clean.ceilingColor.includes('L717'));assert.deepEqual(JSON.parse(report.clean.state).elemItems,[],'installer data keeps no estimate');
 const hexes=report.expected.swatch.match(/#[0-9a-f]{6}/ig),hex=hexes[Math.floor(hexes.length/2)];const target=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 for(const [name,paints] of [['single',report.single],['multi',report.multi],['installer',report.installer],['updated contractor',report.updated]]){const p=paints.find(x=>x.swatch===report.expected.swatch);assert.ok(p,name+' contains the selected swatch');assert.ok(target.every((v,i)=>Math.abs(p.pixel[i]-v)<=3),name+' paints the actual colour');}
 assert.ok(report.multi.some(x=>x.swatch==='#ffffff'),'second room uses its own material');assert.ok(report.texts.some(x=>x.includes('L717')));assert.deepEqual(errors,[]);
 console.log('PASS selected button backgrounds and contrast; actual colour pixels in single, multi-room and cleaned installer reports');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
