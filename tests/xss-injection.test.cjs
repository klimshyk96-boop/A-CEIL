/* Exercise the three production sinks, then remove each protection in an isolated
   browser response to prove this suite detects its regression. No cloud writes. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
const root=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(__dirname,'..'));
const payloads=[
 '"><img src=x onerror="window.__xss=(window.__xss||0)+1">',
 "'><svg onload=\"window.__xss=(window.__xss||0)+1\">",
 "');window.__xss=(window.__xss||0)+1;//",
 '</script><img src=x onerror="window.__xss=(window.__xss||0)+1">'
];
const sinks={
 room:{file:'js/projects/031-aceil-objects-rooms-flow.js',safe:'bar.querySelector("[data-room-save-name]").textContent=String(roomName==null?"":roomName)',unsafe:'bar.querySelector("[data-room-save-name]").innerHTML=String(roomName==null?"":roomName)'},
 confidence:{file:'js/reports/128-aceil-report-confidence-gate.js',safe:'escapeRoomName(p.name)',unsafe:'p.name'},
 installer:{file:'js/reports/223-aceil-installer-share.js',safe:'image.alt=String(title==null?"":title)',unsafe:'image.outerHTML=\'<img alt="\'+title+\'">\''}
};
async function fixture(browser,width,mutation){
 return open(browser,width,1,root,async page=>{
  for(const [sink,{file,safe,unsafe}] of Object.entries(sinks)){
   let source=fs.readFileSync(path.join(root,file),'utf8');
   if(sink===mutation){
    assert.equal(source.split(safe).length,2,'mutation anchor must match exactly once: '+mutation);
    source=source.replace(safe,unsafe);
   }
   // Capture the production implementation when loaded. Later compatibility
   // layers may replace the public entry point with a no-op; that must never
   // let this security test silently skip the vulnerable implementation.
   if(sink==='room')source+='\nwindow.__xssTestRoomSaveBar=_showRoomSaveBar;';
   if(sink==='confidence')source+='\nwindow.__xssTestGenerateObjectReport=window.generateObjectReport;';
   await page.route('**/'+file+'?*',route=>route.fulfill({contentType:'application/javascript',body:source}));
  }
 });
}
async function runSink(page,sink,payload){
 return page.evaluate(async({sink,payload})=>{
  window.__xss=0;
  const requireFn=name=>{if(typeof window[name]!=='function')throw new Error('missing production entry point: '+name);return window[name];};
  let target,literal,continued;
  if(sink==='room'){
   requireFn('__xssTestRoomSaveBar')(payload);
   target=document.getElementById('roomSaveBar');
   if(!target)throw new Error('room save bar did not open');
   literal=target.querySelector('[data-room-save-name]').textContent;
  }else if(sink==='confidence'){
   const generate=requireFn('__xssTestGenerateObjectReport');
   // Only substitute the analysis result; invoke the actual report entry point.
   window._analyzeRoomState=()=>({verdict:{type:'proven',icon:'!',text:'Test discrepancy'}});
   const promise=generate({id:'xss-report',name:'Report',rooms:[{name:payload,state:'{}'}]});
   Promise.resolve(promise).catch(error=>{window.__xssReportError=String(error)});
   target=document.getElementById('rmConfidenceGateModal');
   if(!target||getComputedStyle(target).display==='none')throw new Error('confidence gate did not open through generateObjectReport');
   literal=target.querySelector('b').textContent;
  }else{
   const API=window['A·CEIL'].API;
   if(typeof API?.projects?.replaceAll!=='function')throw new Error('missing projects fixture API');
   const room={name:'Room',state:JSON.stringify({pts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],realPts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:0,y:300}],lengths:[500,300,500,300],closed:true})};
   API.projects.replaceAll([{id:'xss-installer',_localId:'xss-installer',name:payload,rooms:[room],multiRoom:true}]);
   _activeObjectId='xss-installer';_activeRoomIdx=null;
   window._analyzeRoomState=()=>({verdict:{type:'ok'}});
   Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
   // Stub image generation, preserving the public installer flow and preview DOM.
   window.generateModernObjectReport=async()=>{const canvas=document.createElement('canvas');canvas.width=20;canvas.height=20;window._modernOpenPreview(canvas,'test.png');};
   if(!window.A_CEIL_InstallerShare)throw new Error('missing installer API');
   window.A_CEIL_InstallerShare.open();
   document.querySelector('#aceilInstallerShareModal [data-harpoon=white]').click();
   document.querySelector('#aceilInstallerShareModal [data-time=normal]').click();
   await window.A_CEIL_InstallerShare.build();
   target=document.getElementById('aceilInstallerPreview');
   if(!target)throw new Error('installer preview did not open');
   literal=target.querySelector('img').alt;
  }
  await new Promise(resolve=>setTimeout(resolve,100));
  const bad=[...target.querySelectorAll('[onerror*="__xss"],[onload*="__xss"],script')].map(el=>el.tagName);
  const result={bad,executed:window.__xss,literal};
  if(sink==='room')requireFn('_hideRoomSaveBar')();
  if(sink==='confidence'){
   // Cancel without invoking the report generator behind the gate.
   target.style.display='none';window._rmPendingReportProceed=null;
  }
  if(sink==='installer')target.remove();
  return result;
 },{sink,payload});
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  for(const width of [390,1440]){
   const {page,errors,missing}=await fixture(browser,width);await reveal(page);
   try{
    for(const sink of Object.keys(sinks))for(const payload of payloads){
     const result=await runSink(page,sink,payload);
     assert.equal(result.executed,0,sink+': executed payload');
     assert.deepEqual(result.bad,[],sink+': injected element');
     if(sink==='installer')assert.ok(result.literal.endsWith(payload),'installer title must preserve literal input');
     else assert.equal(result.literal,payload,sink+': literal input was lost');
    }
    assert.deepEqual(errors,[],'unexpected browser exception');assert.deepEqual(missing,[],'missing runtime asset');
    console.log('PASS three XSS sinks, four payloads, literal text '+width+'px');
   }finally{await page.close();}
  }
  for(const sink of Object.keys(sinks)){
   const {page}=await fixture(browser,390,sink);await reveal(page);
   try{
    const result=await runSink(page,sink,payloads[0]);
    assert.ok(result.executed>0||result.bad.length>0,'test failed to detect removed protection: '+sink);
    console.log('PASS regression detector catches removed protection: '+sink);
   }finally{await page.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
