const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const context={window:{},localStorage:{getItem:()=>null}};vm.runInNewContext(fs.readFileSync(require.resolve('../js/nomenclature/165-aceil-color-catalog.js'),'utf8'),context);
const palette=context.window.ACEIL_COLOR_CATALOG_BY_SERIES,rates=context.window.ACEIL_FILM_PRICING_BY_SERIES;
const catalog={version:1,items:{film:{name:'MSD Premium M303',price:380},classic:{name:'Al',price:200},classicCorners:{name:'Corners',price:100}},filmCatalog:rates,filmOverrides:{'premium:M303:5.1':443}};
const state={mode:'rectangle',width:4,length:5,profile:'classic',insert:'none',chandelier:0,spot:0,filmSeriesId:'premium',filmCode:'M303'};
assert.equal(M.estimate(state,catalog,palette).rows.find(r=>r.key==='film').price,443);
assert.equal(M.filmSelection({...state,filmCode:'L577'},M.config(catalog),palette).widths[1].price,420);
assert.equal(M.estimate({...state,filmCode:'M309'},catalog,palette).errors.includes('filmSpan'),true);
assert.equal(M.estimate({...state,filmSeriesId:'classic'},catalog,palette).complete,false,'Classic unset rates remain quotes');
assert.equal(M.estimate({...state,filmCode:'M000'},catalog,palette).valid,false);
assert.equal(M.estimate({...state,width:6,length:8,filmSeriesId:'classic'},catalog,palette).valid,false);
assert.equal(M.estimate({...state,width:6,length:8,filmSeriesId:'kralton'},catalog,palette).valid,true);
assert.ok(new URL(M.link('https://example.test/',catalog,state)).hash.length<24000,'full palette needs only compact tariffs in the URL');
assert.equal(M.corniceColor({name:'Карниз',source:'walltype:Ніша карниза біла'}),'white');
assert.equal(M.corniceKind({name:'UNO',source:'ceilingcornice:uno:white'}),'single');assert.equal(M.corniceColor({name:'UNO',source:'ceilingcornice:uno:black'}),'black');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await page.goto('http://aceil.test/calculator/?demo=1');await page.locator('[data-step="1"]').click();
  for(const series of ['premium','classic','kralton']){
   await page.locator('[data-film-series='+series+']').click();await page.locator('#openFilmPalette').click();
   assert.equal(await page.locator('#filmColorGrid [data-film-code]').count(),palette[series].length,'all colours, not just white presets');
   await page.locator('[data-film-texture=lak]').click();assert.equal(await page.locator('#filmColorGrid [data-film-code]').count(),palette[series].filter(e=>e.texture==='lak').length);
   await page.locator('[data-film-texture=""]').click();const code=series==='kralton'?'M501':'L577';
   await page.locator('#filmColorSearch').fill(code.toLowerCase());assert.equal(await page.locator('#filmColorGrid [data-film-code]').count(),1);await page.locator('[data-film-code='+code+']').click();
   assert.ok((await page.locator('#filmName').textContent()).includes(code));
  }
  await page.locator('#openFilmPalette').click();await page.screenshot({path:'/tmp/aceil-palette-'+width+'.png',fullPage:false});await page.keyboard.press('Escape');
  await page.locator(width===390?'#viewEstimate':'#viewEstimateDesktop').click();await page.locator('#save').click();const saved=await page.locator('#savedLink').inputValue(),payload=M.decode(new URL(saved).hash.slice(1));assert.equal(payload.state.filmCode,'M501');assert.equal(payload.state.filmSeriesId,'kralton');
  await page.goto('about:blank');await page.goto(saved);assert.ok((await page.locator('#filmName').textContent()).includes('M501'));
  await page.goto('http://aceil.test/');await reveal(page);await page.evaluate(()=>{
   window['__A·CEILNomenCatalogV339']={items:[
    {id:'cs',name:'Карниз накладний',unit:'м',price:650},
    {id:'chw',name:'Ніша карниза біла',unit:'м',price:1010},{id:'chb',name:'Ніша карниза чорна',unit:'м',price:1110},
    {id:'cww',name:'Карниз широкий',sourceVariant:'white',unit:'м.п.',price:1210},{id:'cwb',name:'Карниз широкий',sourceVariant:'black',unit:'м.п.',price:1310},
    {id:'cow',name:'UNO',source:'ceilingcornice:uno:white',unit:'м',price:1410},{id:'cob',name:'UNO',source:'ceilingcornice:uno:black',unit:'м',price:1510},
    {id:'private-corner',name:'Кут UNO',unit:'шт',price:9999,costPrice:1}]};
   elemItems=[{id:'chb',name:'Ніша карниза чорна',unit:'м',price:1},{id:'f',name:'M303 5.1м',colorCode:'M303',seriesId:'premium',filmWidth:5.1,unit:'м²',price:443,filmSelected:true},{id:'p',name:'Базовий',source:'main_profile',unit:'м',price:200},{id:'c',name:'Кути',source:'corners',unit:'шт',price:100}];
   document.getElementById('aceilClientSetupButton').click();document.querySelectorAll('#aceilClientSetup details').forEach(el=>el.open=true);
  });
  await page.locator('#aceilClientSetup [type=submit]').click();const ownerLink=await page.locator('#aceilClientSetup a').last().getAttribute('href'),config=M.decode(new URL(ownerLink).hash.slice(1)).config;
  assert.equal(config.filmOverrides['premium:M303:5.1'],443);assert.equal(config.options.cornice.length,7);assert.ok(config.options.cornice.every(it=>!it.requiresQuote));
  assert.ok(!JSON.stringify(config).includes('private-corner'));assert.ok(!JSON.stringify(config).includes('costPrice'));
  await page.goto(M.link('http://aceil.test/',{...config,catalogue:false}));assert.ok((await page.locator('#filmRule').textContent()).includes('443 грн'));
  await page.locator('[data-step="2"]').click();await page.locator('[data-extra=cornice]').click();
  for(const [kind,color,price] of [['surface',null,650],['hidden','white',1010],['hidden','black',1110],['wide','white',1210],['wide','black',1310],['single','white',1410],['single','black',1510]]){
   await page.locator('[data-cornice-kind='+kind+']').click();if(color)await page.locator('[data-cornice-color='+color+']').click();
   const row=await page.evaluate(()=>{const f=document.getElementById('form'),s={...Object.fromEntries(new FormData(f)),mode:'rectangle',cornice:true};return ACEILClientCalc.estimate(s,ACEILClientCalc.decode(location.hash.slice(1)).config).rows.find(r=>r.key==='cornice');});
   assert.equal(row.price,price,kind+' '+color+' price comes from nomenclature');assert.equal(row.total,price*3);
  }
  await page.screenshot({path:'/tmp/aceil-cornice-price-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();console.log('PASS full shared colour catalog, textures, tariff overrides, saved colours and seven master-catalogue cornice prices '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
