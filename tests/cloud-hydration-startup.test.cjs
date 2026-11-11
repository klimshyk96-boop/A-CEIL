const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const admin=fs.readFileSync(path.join(__dirname,'..','js','admin','159-aceil-access-clean.js'),'utf8');
const auth=fs.readFileSync(path.join(__dirname,'..','js','auth','033-aceil-supabase-auth-offline-access.js'),'utf8');

// The access module must reuse canonical auth hydration rather than racing a
// second full (~MB-scale) project download on mobile startup.
const helperStart=admin.indexOf('function canonicalCloudState(');
const helperEnd=admin.indexOf('try{if(!localStorage',helperStart);
const bootStart=admin.indexOf('function boot(n){');
const bootEnd=admin.indexOf('if(document.readyState',bootStart);
assert.ok(helperStart>0&&helperEnd>helperStart&&bootStart>0&&bootEnd>bootStart);
assert.ok(auth.includes('window.A_CEIL_CloudLoadState=function()'));
assert.ok(auth.includes('_cloudLoadSuccessAt=Date.now()'));
assert.ok(admin.includes('if(canonical&&canonical.inFlight)'));
assert.ok(admin.includes("verifiedRights(sb(),usr())||await rights()"));
assert.ok(admin.includes("if(projectsRequest&&projectsRequest.uid===u.id&&projectsRequest.client===c)"));

const helperSource=admin.slice(helperStart,helperEnd);
const bootSource=admin.slice(bootStart,bootEnd);
function scenario({canonical,access=true}={}){
  const callbacks=[],client={},user={id:'user-a'};
  let rightsCalls=0,refreshCalls=0,gateCalls=0;
  const state=canonical||{userId:'user-a',inFlight:null,completedAt:0};
  const globals={
    window:{A_CEIL_CloudLoadState:()=>state,__A_CEIL_OFFLINE_ACTIVE:false},
    sb:()=>client,usr:()=>user,
    rights:async()=>{rightsCalls++;return access?{is_active:true}:null},
    applyNomGate:()=>{gateCalls++},accessSig:()=>String(access),
    refresh:async()=>{refreshCalls++;return true},
    setTimeout:callback=>{callbacks.push(callback);return callbacks.length},
    Date
  };
  const make=new Function(...Object.keys(globals),
    "var projectsLoadedAt=0,projectsLoadedUid='',projectsLoadedClient=null,lastAccessSig='';"+
    helperSource+'\n'+bootSource+
    '\nreturn {boot:boot,read:()=>({projectsLoadedAt,projectsLoadedUid,lastAccessSig})};');
  const runtime=make(...Object.values(globals));
  return {state,user,client,callbacks,runtime,counters:()=>({rightsCalls,refreshCalls,gateCalls})};
}
(async()=>{
  let done;
  const pending=new Promise(resolve=>done=resolve);
  const current=scenario({canonical:{userId:'user-a',inFlight:pending,completedAt:0}});
  current.runtime.boot(0);
  assert.equal(current.callbacks.length,1);
  const booting=current.callbacks.shift()();
  await Promise.resolve();
  assert.equal(current.counters().refreshCalls,0,'do not start redundant full cloud fetch while auth is downloading');
  current.state.completedAt=Date.now();
  current.state.inFlight=null;
  done();
  await booting;
  assert.equal(current.counters().rightsCalls,1,'verify access without downloading projects');
  assert.equal(current.counters().refreshCalls,0,'canonical sync must be reused');
  assert.equal(current.runtime.read().projectsLoadedUid,'user-a');

  const missing=scenario();
  missing.runtime.boot(0);
  await missing.callbacks.shift()();
  assert.equal(missing.counters().refreshCalls,1,'without prior sync, original refresh must still run');

  const inactive=scenario({canonical:{userId:'user-a',inFlight:null,completedAt:Date.now()},access:false});
  inactive.runtime.boot(0);
  await inactive.callbacks.shift()();
  assert.equal(inactive.counters().refreshCalls,1,'unverified/inactive access still uses original validation path');

  const other=scenario({canonical:{userId:'other-account',inFlight:null,completedAt:Date.now()}});
  other.runtime.boot(0);
  await other.callbacks.shift()();
  assert.equal(other.counters().refreshCalls,1,'never reuse a different account cloud sync');
  console.log('A·CEIL initial cloud sync de-duplication: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
