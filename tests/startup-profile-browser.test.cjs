'use strict';
/* Synthetic offline startup profile: no auth, cloud data, or production writes.
   V8 precise coverage and CPU samples point to modules safe to make on-demand.
   Browser-route fixtures from browser-review intentionally block external APIs. */
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({
    headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined
  });
  try{
    let session;
    const {page,errors,missing}=await open(browser,390,1,undefined,async p=>{
      session=await p.context().newCDPSession(p);
      await session.send('Emulation.setCPUThrottlingRate',{rate:4});
      await p.coverage.startJSCoverage({resetOnNavigation:false,reportAnonymousScripts:false});
      await session.send('Profiler.enable');
      await session.send('Profiler.start');
      await p.addInitScript(()=>{
        window.__aceilLongTasks=[];
        try{
          new PerformanceObserver(list=>{
            list.getEntries().forEach(e=>window.__aceilLongTasks.push(
              {start:Math.round(e.startTime),duration:Math.round(e.duration)}));
          }).observe({entryTypes:['longtask']});
        }catch(_){}
      });
    });
    const {profile}=await session.send('Profiler.stop');
    const coverage=await page.coverage.stopJSCoverage();
    const own=coverage.filter(e=>/\/js\/|\/calculator\/|\/vendor\//.test(e.url));
    const rows=own.map(e=>{
      // V8 precise coverage includes the executed script TOP-LEVEL range,
      // often spanning the entire source. Counting that as all "used" is
      // wrong: nested zero-hit function ranges override the parent. Merge
      // all non-executed ranges to calculate meaningful unused bytes.
      const size=(e.source||'').length;
      const intervals=(e.functions||[]).flatMap(fn=>
        (fn.ranges||[]).filter(r=>r.count===0)
          .map(r=>({start:r.startOffset,end:r.endOffset})))
        .sort((a,b)=>a.start-b.start);
      let unused=0,start=-1,end=-1;
      for(const r of intervals){
        if(start<0){start=r.start;end=r.end}
        else if(r.start<=end){end=Math.max(end,r.end)}
        else{unused+=end-start;start=r.start;end=r.end}
      }
      if(start>=0)unused+=end-start;
      return {file:new URL(e.url).pathname,bytes:size,
        used:size-Math.min(size,unused)};
    }).sort((a,b)=>(b.bytes-b.used)-(a.bytes-a.used));
    const nameById=new Map(profile.nodes.map(n=>[n.id,n.callFrame.url||'']));
    const byUrl=new Map();
    for(const id of profile.samples||[]){
      const url=nameById.get(id);
      if(!url||!/\/js\/|\/vendor\/|\/calculator\//.test(url))continue;
      const f=new URL(url).pathname;
      byUrl.set(f,(byUrl.get(f)||0)+1);
    }
    const cpu=[...byUrl.entries()].sort((a,b)=>b[1]-a[1])
      .slice(0,18).map(([file,samples])=>({file,samples}));
    const current=await page.evaluate(()=>{
      const entries=performance.getEntriesByType('navigation');
      return {
        nav:entries.length?{
          domContentLoaded:Math.round(entries[0].domContentLoadedEventEnd),
          load:Math.round(entries[0].loadEventEnd)
        }:null,
        longTasks:window.__aceilLongTasks||[],
        scripts:document.querySelectorAll('script[src]').length,
        draw:typeof window.draw,
        pdf:!!window.A_CEIL_ReportPdf
      };
    });
    const summary={
      cpuThrottle:4,viewport:390,nav:current.nav,
      longTaskTotalMs:current.longTasks.reduce((s,e)=>s+e.duration,0),
      longTaskCount:current.longTasks.length,
      scriptCount:current.scripts,
      totalCodeKB:Math.round(rows.reduce((s,e)=>s+e.bytes,0)/1024),
      unusedCodeKB:Math.round(rows.reduce((s,e)=>s+e.bytes-e.used,0)/1024),
      topUnused:rows.slice(0,20).map(e=>({
        file:e.file,kb:Math.round(e.bytes/1024),
        unusedKB:Math.round((e.bytes-e.used)/1024)
      })),
      cpuSamples:cpu
    };
    assert.equal(missing.length,0,'Missing assets: '+missing.join(','));
    assert.equal(errors.length,0,'Runtime errors: '+errors.join('|'));
    assert.equal(current.draw,'function');
    assert.equal(current.pdf,true);
    assert(current.nav&&current.nav.domContentLoaded>0);
    const outDir=path.join(__dirname,'../qa-artifacts');
    fs.mkdirSync(outDir,{recursive:true});
    fs.writeFileSync(path.join(outDir,'startup-profile.json'),JSON.stringify(summary,null,2)+'\n');
    console.log('STARTUP_PROFILE '+JSON.stringify(summary));
    await page.close();
  }finally{await browser.close();}
})().catch(e=>{console.error('STARTUP_PROFILE_FAIL',e);process.exitCode=1});
