'use strict';
/* Browser-level assurance for parser-safe deferring of the initial 173 classic scripts.
   All network responses use local repository files; no users/cloud/credentials. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');

(async()=>{
  const browser=await chromium.launch({headless:true,
    executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
  try{
    for(const width of [390,1440]){
      const {page,errors,missing}=await open(browser,width,1,undefined,async p=>{
        if(width===390){
          const cdp=await p.context().newCDPSession(p);
          await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
        }
        await p.addInitScript(()=>{
          const describe=node=>{
            if(!node||node.nodeType!==1)return null;
            return node.tagName.toLowerCase()+(node.id?'#'+node.id:'')+
              [...node.classList].slice(0,4).map(c=>'.'+c).join('');
          };
          const rect=r=>r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;
          const data=window.__aceilPaintAudit={lcp:[],shifts:[],overlay:[]};
          const observe=(type,fn)=>{
            if(!PerformanceObserver.supportedEntryTypes.includes(type))return;
            new PerformanceObserver(list=>list.getEntries().forEach(fn))
              .observe({type,buffered:true});
          };
          observe('largest-contentful-paint',e=>data.lcp.push({
            time:Math.round(e.startTime),renderTime:Math.round(e.renderTime),
            loadTime:Math.round(e.loadTime),size:e.size,element:describe(e.element)
          }));
          observe('layout-shift',e=>{
            if(!e.hadRecentInput)data.shifts.push({
              time:Math.round(e.startTime),value:e.value,
              sources:(e.sources||[]).map(s=>({node:describe(s.node),
                previous:rect(s.previousRect),current:rect(s.currentRect)}))
            });
          });
          let state;
          const record=()=>{
            const el=document.getElementById('aceilBootOverlay');
            const next=el?(el.classList.contains('aceil-hide')?'hiding':'visible'):'absent';
            if(next!==state){state=next;data.overlay.push({time:Math.round(performance.now()),state:next});}
          };
          new MutationObserver(record).observe(document,{subtree:true,childList:true,
            attributes:true,attributeFilter:['class']});
          record();
        });
      });
      // Observe late startup changes past the existing 4s overlay watchdog.
      const remaining=await page.evaluate(()=>Math.max(0,8000-performance.now()));
      if(remaining)await page.waitForTimeout(remaining);
      const paintAudit=await page.evaluate(()=>{
        const audit=window.__aceilPaintAudit;
        let best=0,sum=0,first=-1,last=-1;
        for(const e of audit.shifts){
          if(first<0||e.time-last>=1000||e.time-first>=5000){first=e.time;sum=0;}
          sum+=e.value;last=e.time;best=Math.max(best,sum);
        }
        return {lcp:audit.lcp,cls:best,shifts:audit.shifts,overlay:audit.overlay,
          authVisible:!!document.querySelector('#authScreen:not(.hidden)'),
          viewport:{width:innerWidth,height:innerHeight}};
      });
      console.log('STARTUP_PAINT_AUDIT '+JSON.stringify({width,...paintAudit}));
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
      assert.equal(result.scriptCount,173);
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
