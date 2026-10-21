const assert=require('node:assert/strict'),M=require('../calculator/model.js');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});
 try{for(const width of [390,1440]){
  const {page,errors}=await open(browser,width);await reveal(page);
  await page.evaluate(()=>{
   elemGroups=[{id:'profiles',name:'Мої профілі та комплектуючі',collapsed:false}];
   window['__A·CEILNomenCatalogV339']={items:[],groups:elemGroups};
   elemItems=[
    {id:'f',groupId:'profiles',name:'Плівка Premium',source:'area',unit:'м²',price:380},
    {id:'p',groupId:'profiles',name:'Алюмінієвий профіль- h',source:'',unit:'м',price:185},
    {id:'pvc',groupId:'profiles',name:'Профіль ПВХ',unit:'м',price:120},
    {id:'c',groupId:'profiles',name:'Фіксація кутів',unit:'шт',price:100},
    {id:'sb',groupId:'profiles',name:'Тіньовий чорний',unit:'м.п. ',price:550},
    {id:'sw',groupId:'profiles',name:'Тіньовий',source:'walltypecolor:white:'+encodeURIComponent('Тіньовий профіль'),unit:'м',price:600},
    {id:'fb',groupId:'profiles',name:'Парящий чорний',source:'walltype:'+encodeURIComponent('Парящий профіль'),unit:'м',price:1350},
    {id:'fw',groupId:'profiles',name:'Модель F',source:'floating_profile',sourceVariant:'white',unit:'м',price:1400},
    {id:'scb',groupId:'profiles',name:'Фіксація кута – тіньовий чорний',unit:'шт',price:351},
    {id:'scw',groupId:'profiles',name:'Фіксація кута – тіньовий білий',unit:'шт',price:364},
    {id:'fc',groupId:'profiles',name:'Фіксація кута – парящий',unit:'шт',price:400},
    {id:'led',groupId:'profiles',name:'LED монохром',unit:'м',price:500},
    {id:'i',groupId:'profiles',name:'Вставка біла',unit:'м',price:60},
    {id:'ib',groupId:'profiles',name:'Вставка чорна',unit:'м',price:70},
    {id:'power',groupId:'profiles',name:'Блок живлення 24В 200Вт',unit:'шт',price:800}
   ];
   const cfg={version:1,company:'Test',items:{film:{name:'Film',price:380},classic:{name:'Al',price:185},classicCorners:{name:'Corners',price:100}}};
   localStorage.setItem('aceil-client-preset:local',JSON.stringify({company:'Test',__productRules:5,__catalog:cfg,__selection:{f:'film',p:'classic',c:'classicCorners',sb:'cornice'}}));
   document.getElementById('aceilClientSetupButton').click();
  });
  assert.equal(await page.locator('[data-client-item=sb] input').getAttribute('name'),'shadowOptions','recognizes the screenshot label and corrects stale mappings');
  for(const id of ['f','p','pvc','c','sb','sw','fb','fw','scb','fc','led','i','ib'])await page.locator('[data-client-item='+id+'] input').check();
  await page.locator('#aceilClientSetup [type=submit]').click();
  assert.ok((await page.locator('#aceilClientSetup output').textContent()).includes('Вибір збережено'));
  const url=await page.locator('#aceilClientSetup input[readonly]').inputValue(),cfg=M.decode(new URL(url).hash.slice(1)).config;
  assert.deepEqual(cfg.options.shadow.map(it=>[it.name,it.price,it.color,it.cornerPrice]),[['Тіньовий чорний',550,'black',351],['Тіньовий',600,'white',364]]);
  assert.deepEqual(cfg.options.floating.map(it=>[it.price,it.color]),[[1350,'black'],[1400,'white']]);
  assert.deepEqual(cfg.options.classic.map(it=>it.material),['aluminium','pvc']);assert.equal(cfg.items.white.price,60);assert.equal(cfg.items.black.price,70);assert.ok(!JSON.stringify(cfg).includes('Блок живлення'));
  const base={mode:'rectangle',width:4,length:5,profile:'shadow',cornice:false,chandelier:0,spot:0,doubleSpot:0};
  for(const [color,price,corner] of [['black',550,351],['white',600,364]]){
   const result=M.estimate({...base,shadowOption:cfg.options.shadow.find(it=>it.color===color).id},{...cfg,catalogue:false});assert.equal(result.valid,true);assert.equal(result.rows.find(it=>it.key==='shadow').price,price);assert.equal(result.rows.find(it=>it.key==='shadowCorners').total,corner*4);
  }
  await page.goto(url.replace('https://a-ceil.pp.ua','http://aceil.test'));await page.locator('[data-step="1"]').click();assert.equal(await page.getByRole('checkbox',{name:'Тіньовий чорний',exact:true}).isEnabled(),true);assert.equal(await page.getByRole('checkbox',{name:'Парящий чорний',exact:true}).isEnabled(),true);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS legacy and dynamic profile sources, screenshot label, colours, corner rates, inserts and saved calculator '+width+'px');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
