const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH});try{
for(const width of [390,1440]){
 const {page}=await open(browser,width);await reveal(page);await page.waitForTimeout(1500);
 const r=await page.evaluate(()=>{
  const icons=code=>elemItems.filter(i=>i.filmPickerManaged===true&&(i.colorCode===code)).map(i=>i.icon);
  const out={};
  for(const [c,s] of [['M303','premium'],['L303','premium'],['S303','premium']]){A_CEILColorPicker.select(c,s);out[c]=icons(c);}
  // legacy row with the old roll icon and a row whose icon the user picked
  const g=elemItems.find(i=>i.colorCode==='M303').groupId;
  elemItems.forEach(i=>{if(i.colorCode==='M303'&&i.filmWidth===5.1){i.icon='svg:selected-film-roll';i.iconUserSelected=false}if(i.colorCode==='M303'&&i.filmWidth===5.8){i.icon='svg:selected-film-roll';i.iconUserSelected=true}});
  A_CEIL_NormalizeFilmGroups();A_CEILColorPicker.select('M303','premium');A_CEIL_NormalizeFilmGroups();
  out.legacy=elemItems.find(i=>i.colorCode==='M303'&&i.filmWidth===5.1).icon;out.user=elemItems.find(i=>i.colorCode==='M303'&&i.filmWidth===5.8).icon;
  return out});
 for(const c of ['M303','L303','S303'])assert.ok(r[c].length&&r[c].every(x=>x==='svg:laconic-film'),c+' '+JSON.stringify(r[c]));
 assert.equal(r.legacy,'svg:laconic-film','old roll icon is upgraded');
 assert.equal(r.user,'svg:selected-film-roll','icon chosen by the user is kept');
 console.log('PASS default film icon for every colour, upgrade of old icon, user choice kept '+width+'px');}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
