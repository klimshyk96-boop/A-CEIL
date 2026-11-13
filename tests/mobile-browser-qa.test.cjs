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
        const grid=group?.querySelector('.aceil-quote-report-option')?.parentElement;
        const rect=group?.getBoundingClientRect();
        const cardRect=cards[0]?.getBoundingClientRect();
        const actionsRect=cards[0]?.querySelector('.rp-project-actions')?.getBoundingClientRect();
        const modal=document.querySelector('#projectsModal .modal')||document.getElementById('projectsModal');
        return {
          count:cards.length,hasGroup:!!group,visible:tiles.length,
          history:group?.querySelector('.aceil-quote-reports-history')?.textContent||'',
          statuses:tiles.map(tile=>tile.textContent),
          links:openLinks,
          bodyOverflow:document.documentElement.scrollWidth>innerWidth+2,
          width:innerWidth,
          groupBox:rect?{left:rect.left,right:rect.right,width:rect.width,top:rect.top}:null,
          cardBox:cardRect?{left:cardRect.left,right:cardRect.right,width:cardRect.width}:null,
          gridWidth:grid?.getBoundingClientRect().width||0,
          actionBottom:actionsRect?actionsRect.bottom:null,
          modalBox:{left:modal.getBoundingClientRect().left,right:modal.getBoundingClientRect().right}
        };
      });
      assert.equal(data.count,2,'only original plus one alternative in normal Projects; old copies are in recovery history');
      assert.equal(data.hasGroup,true,'source must display report links');
      assert.equal(data.visible,2,'compact display shows only 2 links');
      assert.match(data.history,/Попередні версії: 4/);
      assert.equal(data.links[0],'https://a-ceil.pp.ua/r/'+'a'.repeat(20),'legacy 64-hex token is compacted for the public URL');
      assert.equal(data.links[1],'https://a-ceil.pp.ua/r/'+'b'.repeat(20),'second report has its own compact public URL');
      assert.equal(data.bodyOverflow,false,'no horizontal page overflow');
      assert(data.groupBox.left>=-2&&data.groupBox.right<=width+2,'reports fit viewport');
      assert(Math.abs(data.groupBox.width-data.cardBox.width)<8,'report panel must span the whole project card, not a grid column or sidebar');
      assert(data.groupBox.top>=data.actionBottom-3,'report panel must appear below project actions, not beside them');
      assert(data.gridWidth<=883,'desktop report tiles must remain compact instead of stretching 1400px');
      assert(data.modalBox.left>=-2&&data.modalBox.right<=width+2,'project modal fits viewport');
      const historyButton=page.locator('#projectsList .aceil-quote-reports-history').first();
      await historyButton.click();
      data=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('#projectsList .rp-project-card')];
        const tabs=document.getElementById('aceilProjectArchiveTabs');
        return {
          count:cards.length,
          activeTab:tabs?.querySelector('[data-project-view="history"]')?.classList.contains('active'),
          names:cards.map(card=>card.textContent),
          reportStrips:document.querySelectorAll('#projectsList .aceil-quote-reports').length
        };
      });
      assert.equal(data.count,4,'four distinct historic drawings remain accessible, none silently deleted');
      assert.equal(data.activeTab,true,'history tab is active after clicking the previous versions control');
      assert.equal(data.reportStrips,0,'historic copies are not advertised as a third/fourth live quote');
      await page.locator('#aceilProjectArchiveTabs [data-project-view="active"]').click();
      assert.equal(await page.locator('#projectsList .aceil-quote-report-option').count(),2,'main view returns to exactly two quote tiles');
      await page.evaluate(()=>{
        const list=document.getElementById('projectsList');
        if(list)list.scrollTop=0;
      });
      await page.screenshot({path:path.join(screenshots,'reports-'+width+'.png'),fullPage:false});
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
      if(width===390){
        // Real browser and real bundled jsPDF: verify download from the image,
        // without any account, cloud write or external conversion service.
        const downloadWait=page.waitForEvent('download',{timeout:20000});
        await page.evaluate(async()=>{
          const canvas=document.createElement('canvas');
          canvas.width=800;canvas.height=1900;
          const ctx=canvas.getContext('2d');
          ctx.fillStyle='#fff';ctx.fillRect(0,0,800,1900);
          ctx.fillStyle='#0f172a';ctx.font='bold 32px Arial';
          ctx.fillText('A-CEIL PDF REPORT',50,110);
          await window.A_CEIL_ReportPdf.download(canvas.toDataURL('image/png'),'A-CEIL-qa-report.png');
        });
        const file=await downloadWait;
        assert.equal(file.suggestedFilename(),'A-CEIL-qa-report.pdf');
        const bytes=fs.readFileSync(await file.path());
        assert.equal(bytes.subarray(0,5).toString(),'%PDF-','download must be a valid PDF, not PNG with a new extension');
        assert(bytes.length>1000);
      }
      assert.equal(errors.length,0,'unexpected page errors: '+errors.join(' | '));
      console.log('PASS',JSON.stringify({width,reportTiles:2,expandedCount:6,restoreSearch:true,overflow:false,missingAssets:missing.length}));
      await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
