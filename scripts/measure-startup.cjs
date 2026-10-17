/* Startup cost report: bytes executed vs shipped per script, grouped by folder, plus JS heap.
   Usage: WIDTH=390 node scripts/measure-startup.cjs   (needs playwright; uses the same offline harness as tests) */
const path=require('path');const {chromium}=require('playwright');const {open,reveal}=require(path.join(__dirname,'..','tests','browser-review.cjs'));
(async()=>{
 const width=Number(process.env.WIDTH)||390;
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const t0=Date.now();
  const {page}=await open(b,width,3,undefined,async p=>{await p.coverage.startJSCoverage({resetOnNavigation:false});});
  await reveal(page);await page.waitForTimeout(1500);
  const cov=await page.coverage.stopJSCoverage();if(process.env.DBG)console.error('cov',cov.length,cov[0]&&cov[0].url);
  const heap=await page.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576*10)/10:null);
  const nav=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return n?{dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}:null;});
  const rows=cov.filter(e=>/\/js\//.test(e.url)).map(e=>{
   const total=e.source?e.source.length:0;let used=0;
   for(const f of e.functions)for(const r of f.ranges)if(r.count>0&&f.isBlockCoverage===false)used+=0;
   const mask=new Uint8Array(total);
   for(const f of e.functions)for(const r of f.ranges){const v=r.count>0?1:0;for(let i=r.startOffset;i<Math.min(r.endOffset,total);i++)mask[i]=v;}
   // block ranges nest: later (inner) ranges override outer ones, which matches V8's reporting order
   used=mask.reduce((s,x)=>s+x,0);
   return {file:new URL(e.url).pathname.replace(/^\/js\//,''),total,used};
  });
  const by={};for(const r of rows){const d=r.file.split('/')[0];(by[d]=by[d]||{files:0,total:0,used:0});by[d].files++;by[d].total+=r.total;by[d].used+=r.used;}
  const sum=rows.reduce((s,r)=>({t:s.t+r.total,u:s.u+r.used}),{t:0,u:0});
  console.log(JSON.stringify({width,scripts:rows.length,totalKB:Math.round(sum.t/1024),executedAtStartupPct:Math.round(100*sum.u/sum.t),heapMB:heap,nav,wallMs:Date.now()-t0},null,1));
  console.log('\nfolder              files   KB   executed%');
  for(const [d,v] of Object.entries(by).sort((a,c)=>c[1].total-a[1].total))console.log(d.padEnd(18),String(v.files).padStart(5),String(Math.round(v.total/1024)).padStart(5),String(Math.round(100*v.used/v.total)).padStart(7)+'%');
  console.log('\nlargest never-executed-at-startup code (KB not run):');
  rows.sort((a,c)=>(c.total-c.used)-(a.total-a.used)).slice(0,15).forEach(r=>console.log(String(Math.round((r.total-r.used)/1024)).padStart(5)+' KB  '+r.file+'  ('+Math.round(100*r.used/r.total)+'% run)'));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
