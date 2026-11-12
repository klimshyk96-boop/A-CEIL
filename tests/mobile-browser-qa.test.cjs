/* Real Chromium interaction QA, synthetic data only; no account or cloud writes.
 * Runs only from the dedicated targeted QA workflow, not on every commit.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {open,reveal}=require('./browser-review.cjs');
const screenshots=path.join(__dirname,'..','qa-artifacts');
fs.mkdirSync(screenshots,{recursive:true});
const baseId='11111111-1111-4111-8111-111111111111';
const ids=Array.from({length:5},(_,i)=>'22222222-2222-4222-8222-'+String(i+1).padStart(12,'0'));
const rows=()=>[
  {id:baseId,_dbId:baseId,name:'Соборна, тест',state:'{}',report_token:'a'.repeat(64)},
  ...ids.map((id,i)=>({
    id,_dbId:id,_comparisonSourceId:baseId,name:'Соборна — Копія '+(i+1),
    state:JSON.stringify({comparisonSourceId:baseId}),
    report_token:i===0?'b'.repeat(64):i===2?'d'.repeat(64):null,
    ...(i===2?{report_expires_at:'2020-01-01T00:00:00Z'}:{})
  }))
];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
  try{
    for(const width of [320,390,1440]){
      const {page,errors,missing}=await open(browser,width);
      await reveal(page);
      await page.evaluate((projects)=>{
        window['A·CEIL'].ProjectRepository.replaceAll(projects);
        const search=document.getElementById('projSearch');
        if(search)search.value='';
        const modal=document.getElementById('projectsModal');
        modal.classList.add('open');
        modal.style.display='flex';
        window.renderProjects();
      },rows());
      const selector='#projectsList .rp-project-card';
      await page.waitForSelector(selector);
      let data=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('#projectsList .rp-project-card')];
        const group=cards[0]?.querySelector('.aceil-quote-reports');
        const tiles=[...(group?.querySelectorAll('.aceil-quote-report-option')||[])];
        const openLinks=tiles.map(tile=>tile.querySelector('a[href]')?.href||'');
        const rect=group?.getBoundingClientRect();
        const modal=document.querySelector('#projectsModal .modal')||document.getElementById('projectsModal');
        return {
          count:cards.length,hasGroup:!!group,visible:tiles.length,
          showMore:group?.querySelector('.aceil-quote-reports-toggle')?.textContent||'',
          statuses:tiles.map(tile=>tile.textContent),
          links:openLinks,
          bodyOverflow:document.documentElement.scrollWidth>innerWidth+2,
          width:innerWidth,
          groupBox:rect?{left:rect.left,right:rect.right,width:rect.width}:null,
          modalBox:{left:modal.getBoundingClientRect().left,right:modal.getBoundingClientRect().right}
        };
      });
      assert.equal(data.count,6,'all 6 source and copy cards remain in list');
      assert.equal(data.hasGroup,true,'source must display report links');
      assert.equal(data.visible,2,'compact display shows only 2 links');
      assert.match(data.showMore,/Показати ще 4/);
      assert.equal(data.links[0],'https://a-ceil.pp.ua/r/'+'a'.repeat(64));
      assert.equal(data.links[1],'https://a-ceil.pp.ua/r/'+'b'.repeat(64));
      assert.equal(data.bodyOverflow,false,'no horizontal page overflow');
      assert(data.groupBox.left>=-2&&data.groupBox.right<=width+2,'reports fit viewport');
      assert(data.modalBox.left>=-2&&data.modalBox.right<=width+2,'project modal fits viewport');
      const more=page.locator('#projectsList .aceil-quote-reports-toggle').first();
      await more.click();
      data=await page.evaluate(()=>{
        const group=document.querySelector('#projectsList .aceil-quote-reports');
        return {
          count:group?.querySelectorAll('.aceil-quote-report-option').length||0,
          expired:group?.textContent.includes('Посилання прострочене'),
          unpublished:group?.textContent.includes('Звіт ще не сформовано'),
          accessible:[...group.querySelectorAll('.aceil-quote-report-option')].map(tile=>Boolean(tile.querySelector('a[href]')))
        };
      });
      assert.equal(data.count,6,'old copies expand instead of disappearing');
      assert.equal(data.expired,true);
      assert.equal(data.unpublished,true);
      assert.equal(data.accessible.filter(Boolean).length,2,'never invent URLs for 4 unavailable links');
      await more.click();
      assert.equal(await page.locator('#projectsList .aceil-quote-report-option').count(),2,'collapse returns to two tiles');
      // Filter hides the source; the navigation helper must restore it
      // without rewriting the cloud project collection.
      const jump=await page.evaluate(id=>{
        const search=document.getElementById('projSearch');
        search.value='Копія 5';window.renderProjects();
        const hidden=!document.querySelector('.aceil-quote-reports');
        const found=window.A_CEIL_ProjectArchive.jumpToProject(id);
        return {hidden,found,search:search.value,restored:!!document.querySelector('.aceil-quote-reports'),projects:window.getProjects().length};
      },baseId);
      assert.deepEqual(jump,{hidden:true,found:true,search:'',restored:true,projects:6});
      await page.screenshot({path:path.join(screenshots,'reports-'+width+'.png'),fullPage:false});
      assert.equal(errors.length,0,'unexpected page errors: '+errors.join(' | '));
      console.log('PASS',JSON.stringify({width,reportTiles:2,expandedCount:6,restoreSearch:true,overflow:false,missingAssets:missing.length}));
      await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
