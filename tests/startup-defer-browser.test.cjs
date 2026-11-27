'use strict';
/* Browser-level assurance for parser-safe deferring of the 176 classic scripts.
   All network responses use local repository files; no users/cloud/credentials. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');

(async()=>{
  const browser=await chromium.launch({headless:true,
    executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
  try{
    for(const width of [390,1440]){
      const {page,errors,missing}=await open(browser,width);
      const result=await page.evaluate(()=>{
        const nav=performance.getEntriesByType('navigation')[0];
        const painted=performance.getEntriesByType('paint')
          .filter(entry=>entry.name==='first-contentful-paint')[0];
        return {
          scriptCount:document.querySelectorAll('script[src]').length,
          blockingScripts:[...document.querySelectorAll('script[src]')]
            .filter(node=>!node.defer).map(node=>node.src),
          ready:document.readyState,
          hasCanvas:!!document.querySelector('canvas'),
          draw:typeof window.draw,
          save:typeof window.saveState,
          projects:typeof window.renderProjects,
          reports:!!window.A_CEIL_ReportPdf,
          admin:!!window.A_CEIL_Admin,
          archive:!!window.A_CEIL_ProjectArchive,
          nav:nav?{responseEnd:Math.round(nav.responseEnd),
            dcl:Math.round(nav.domContentLoadedEventEnd),
            load:Math.round(nav.loadEventEnd)}:null,
          fcp:painted?Math.round(painted.startTime):null,
          viewport:document.querySelector('meta[name="viewport"]')?.content
        };
      });
      assert.equal(result.scriptCount,176);
      assert.deepEqual(result.blockingScripts,[]);
      assert.equal(result.ready,'complete');
      assert.equal(result.hasCanvas,true);
      assert.equal(result.draw,'function');
      assert.equal(result.save,'function');
      assert.equal(result.projects,'function');
      assert.equal(result.reports,true);
      assert.equal(result.admin,true);
      assert.equal(result.archive,true);
      assert.equal(missing.length,0,'missing local scripts/assets: '+missing.join(','));
      assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
      assert(result.nav&&result.nav.dcl>0&&result.nav.load>=result.nav.dcl,
        'navigation events must complete after ordered deferred modules');
      assert(!/user-scalable=no|maximum-scale=1/.test(result.viewport));
      console.log('PASS startup',JSON.stringify({width,...result}));
      await page.close();
    }
  }finally{await browser.close();}
})().catch(err=>{console.error('FAIL startup browser:',err);process.exitCode=1;});
