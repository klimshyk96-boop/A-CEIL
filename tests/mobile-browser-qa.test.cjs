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
      // A single visible object card represents the original and the
      // independent alternative in cloud storage.
      const first=page.locator('#projectsList .rp-project-card').first();
      let data=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('#projectsList .rp-project-card')];
        const badge=cards[0]?.querySelector('.aceil-variants-badge');
        const modal=document.querySelector('#projectsModal .modal')||document.getElementById('projectsModal');
        return {count:cards.length,badge:badge?.textContent||'',hasOldPanel:!!document.querySelector('.aceil-quote-reports'),
          bodyOverflow:document.documentElement.scrollWidth>innerWidth+2,
          cardBox:cards[0]?.getBoundingClientRect().toJSON(),
          modalBox:modal.getBoundingClientRect().toJSON()};
      });
      assert.equal(data.count,1,'one physical object = one card, never two separate quote cards');
      assert.match(data.badge,/2 варіанти/);
      assert.equal(data.hasOldPanel,false,'no confusing two-report panel under the card');
      assert.equal(data.bodyOverflow,false,'no horizontal page overflow');
      assert(data.cardBox.left>=-2&&data.cardBox.right<=width+2,'project card fits viewport');
      assert(data.modalBox.left>=-2&&data.modalBox.right<=width+2,'project modal fits viewport');
      await page.screenshot({path:path.join(screenshots,'reports-'+width+'.png'),fullPage:false});

      // The card (not merely the little badge) must open exactly two clear
      // options with independent report state and correct URLs.
      await first.click({position:{x:15,y:25}});
      await page.waitForSelector('.aceil-variant-picker');
      data=await page.evaluate(()=>{
        const picker=document.querySelector('.aceil-variant-picker');
        const backdrop=document.querySelector('.aceil-variant-picker-backdrop');
        const rows=[...picker.querySelectorAll('.aceil-variant-choice')];
        return {
          count:rows.length,
          names:rows.map(row=>row.querySelector('.aceil-variant-choice-open')?.textContent),
          reportStatus:rows.map(row=>row.querySelector('.aceil-variant-report-status')?.textContent),
          links:rows.map(row=>row.querySelector('a[href]')?.href||''),
          history:picker.querySelector('.aceil-variant-history')?.textContent||'',
          panel:picker.getBoundingClientRect().toJSON(),
          backdrop:backdrop.getBoundingClientRect().toJSON()
        };
      });
      assert.equal(data.count,2,'one selector, exactly H and the current no-insert alternative');
      assert.match(data.names[0],/Основний — H/);
      assert.match(data.names[1],/Безвставочний/);
      assert.equal(data.links[0],'https://a-ceil.pp.ua/r/'+'a'.repeat(20));
      assert.equal(data.links[1],'https://a-ceil.pp.ua/r/'+'b'.repeat(20));
      assert.match(data.reportStatus[0],/опубліковано/);
      assert.match(data.history,/Попередні версії \(4\)/);
      assert(data.panel.left>=-2&&data.panel.right<=width+2,'variant chooser fits mobile viewport');
      await page.screenshot({path:path.join(screenshots,'variant-picker-'+width+'.png'),fullPage:false});

      // Choose alternative drawing. It must open that saved project ID,
      // not the original and not a newly created copy.
      await page.evaluate(()=>{window.__qaSelectedVariant=null;window.loadProject=function(id){window.__qaSelectedVariant=id}});
      await page.locator('.aceil-variant-choice-open').nth(1).click();
      assert.equal(await page.evaluate(()=>window.__qaSelectedVariant),ids[0]);
      assert.equal(await page.locator('.aceil-variant-picker').count(),0,'selector closes on selection');
      assert.equal(await page.locator('#projectsList .rp-project-card').count(),1);

      // Older drawings remain available separately, never as 3rd/4th
      // quote choice or duplicate cards on the active tab.
      await page.locator('#projectsList .aceil-variants-badge').first().click();
      await page.locator('.aceil-variant-history').click();
      data=await page.evaluate(()=>{
        const cards=[...document.querySelectorAll('#projectsList .rp-project-card')];
        const tabs=document.getElementById('aceilProjectArchiveTabs');
        return {count:cards.length,
          activeTab:tabs?.querySelector('[data-project-view="history"]')?.classList.contains('active'),
          badges:document.querySelectorAll('#projectsList .aceil-variants-badge').length};
      });
      assert.equal(data.count,4,'four historical distinct cloud drawings are kept in Reserves');
      assert.equal(data.activeTab,true);
      assert.equal(data.badges,0);
      await page.locator('#aceilProjectArchiveTabs [data-project-view="active"]').click();
      assert.equal(await page.locator('#projectsList .rp-project-card').count(),1);
      // Filter hides the source; the navigation helper must restore it
      // without rewriting the cloud project collection.
      const jump=await page.evaluate(id=>{
        const search=document.getElementById('projSearch');
        search.value='Копія 5';window.renderProjects();
        const hidden=!document.querySelector('.aceil-variants-badge');
        const found=window.A_CEIL_ProjectArchive.jumpToProject(id);
        return {hidden,found,search:search.value,restored:!!document.querySelector('.aceil-variants-badge'),projects:window.getProjects().length};
      },baseId);
      assert.deepEqual(jump,{hidden:true,found:true,search:'',restored:true,projects:6});
      if(width===390){
        // A4 PDF pages must stop before another room's header rather than
        // arbitrarily slicing the long printed report in the middle.
        const pageSlices=await page.evaluate(()=>{
          return window.A_CEIL_ReportPdf.planPages({naturalWidth:800,naturalHeight:1900},
            Math.floor(281*800/194),[0.5]);
        });
        assert.equal(pageSlices.length,2);
        assert.equal(pageSlices[0].end,950,'room #2 begins on an independent A4 sheet');
        assert.equal(pageSlices[1].start,950);
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
          await window.A_CEIL_ReportPdf.download(canvas.toDataURL('image/png'),
            'A-CEIL-qa-report.png',null,{breaks:[0.5]});
        });
        const file=await downloadWait;
        assert.equal(file.suggestedFilename(),'A-CEIL-qa-report.pdf');
        const bytes=fs.readFileSync(await file.path());
        assert.equal(bytes.subarray(0,5).toString(),'%PDF-','download must be a valid PDF, not PNG with a new extension');
        assert(bytes.length>1000);
      }
      assert.equal(errors.length,0,'unexpected page errors: '+errors.join(' | '));
      console.log('PASS',JSON.stringify({width,visibleObjectCards:1,variantChoices:2,historyCount:4,restoreSearch:true,overflow:false,missingAssets:missing.length}));
      await page.close();
    }
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
