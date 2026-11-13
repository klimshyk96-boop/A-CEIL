/* Independent quote publication and account-switch safety.
 * Uses the real report module with RPC mocks; NEVER touches live Supabase. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../js/reports/201-aceil-report-links.js'),'utf8');
const original='11111111-1111-4111-8111-111111111111';
const alternative='22222222-2222-4222-8222-222222222222';
function setup(){
  let projects=[
    {id:original,_dbId:original,name:'Соборна',state:'{}'},
    {id:alternative,_dbId:alternative,_comparisonSourceId:original,name:'Соборна — Копія',state:JSON.stringify({comparisonSourceId:original})}
  ],counter=0,queued=[],calls=[],client={
    rpc(name,args){calls.push({name,args:JSON.parse(JSON.stringify(args))});return Promise.resolve({data:{ok:true},error:null})}
  };
  const c={console,Promise,Date,Math,JSON,Uint8Array,setTimeout,clearTimeout,
    document:{readyState:'loading',addEventListener(){},getElementById(){return null}},
    _sb:client,_sbUser:{id:'user-1'},
    crypto:{getRandomValues(buf){counter++;buf.fill(counter)}},
    getPendingQueue(){return queued},
    addEventListener(){},dispatchEvent(){},
    navigator:{onLine:true}
  };
  c.window=c;
  c['A·CEIL']={ProjectRepository:{list(){return projects},replaceAll(next){projects=next}}};
  vm.createContext(c);
  vm.runInContext(source,c,{filename:'201-aceil-report-links.js'});
  return {c,calls,projects:()=>projects,client,queue:queued,
    switchAccount(){c._sbUser={id:'user-2'};c._sb={rpc(){throw Error('must not use switched session')}}}};
}
test('two copies publish to two distinct project IDs and immutable snapshots without inherited links',async()=>{
  const f=setup(),api=f.c.A_CEIL_ReportLinks;
  const report={presentation:'generated-report',image:'data:image/png;base64,abcd',structured:{meta:'approved'}};
  const first=await api.publishPayload(report,{projectId:original});
  assert.equal(f.projects()[1].report_token,undefined,'copy remains unpublished after publishing original');
  const second=await api.publishPayload({...report,structured:{meta:'different'}},{projectId:alternative});
  assert.notEqual(first,second);
  assert.match(first,/^https:\/\/a-ceil\.pp\.ua\/r\/[a-f0-9]{20}$/);
  assert.match(second,/^https:\/\/a-ceil\.pp\.ua\/r\/[a-f0-9]{20}$/);
  assert.equal(f.calls.length,4,'one immutable snapshot and one latest-badge RPC per link');
  assert.deepEqual(f.calls.map(x=>[x.name,x.args.p_project_id]),[
    ['aceil_publish_report_snapshot',original],['aceil_publish_report_link',original],
    ['aceil_publish_report_snapshot',alternative],['aceil_publish_report_link',alternative]
  ]);
  assert.notEqual(f.projects()[0].report_token,f.projects()[1].report_token);
  assert.equal(api.status(original).url,first);
  assert.equal(api.status(alternative).url,second);
  assert.equal(f.projects()[1]._comparisonSourceId,original,'separate report must not break copy lineage');
});
test('an unconfirmed alternative copy or queued edit cannot publish an out-of-date quote',async()=>{
  const f=setup(),copy=f.projects()[1],api=f.c.A_CEIL_ReportLinks;
  copy._dirty=true;
  await assert.rejects(api.publishPayload({test:true},{projectId:alternative}),/незбережені зміни/);
  delete copy._dirty;
  f.queue.push({type:'save',payload:{localId:alternative}});
  await assert.rejects(api.publishPayload({test:true},{projectId:alternative}),/незбережені зміни/);
  assert.equal(f.calls.length,0,'no snapshot can be published while copy changes are pending');
  f.queue.length=0;
  assert.match(await api.publishPayload({test:true},{projectId:alternative}),/https:\/\/a-ceil\.pp\.ua\/r\//);
});
test('account switch during cloud publication cannot write a report URL into another session',async()=>{
  const f=setup(),api=f.c.A_CEIL_ReportLinks;
  let release;
  const received=new Promise(resolve=>{release=resolve});
  let signal;
  const requested=new Promise(resolve=>{signal=resolve});
  f.client.rpc=(name,args)=>{
    f.calls.push({name,args});
    if(name==='aceil_publish_report_snapshot'){signal();return received}
    return Promise.resolve({data:{ok:true},error:null});
  };
  const pending=api.publishPayload({test:true},{projectId:original});
  await requested;
  f.switchAccount();
  release({data:{ok:true},error:null});
  await assert.rejects(pending,/Обліковий запис змінився/);
  assert.equal(f.calls.length,1,'old session must not send the second RPC after switching');
  assert.equal(f.projects()[0].report_token,undefined,'old report URL must not pollute the new local session');
});
