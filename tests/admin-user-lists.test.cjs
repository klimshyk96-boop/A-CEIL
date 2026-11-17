'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/admin/166-aceil-admin.js'),'utf8');
const from=source.indexOf('var userListView="current";');
const to=source.indexOf('function toggleCard(',from);
assert(from>=0&&to>from,'separate admin list functions exist');

function fixture(){
  let html='',summary='';
  const params={
    content:value=>{html=value},
    document:{getElementById(id){return id==='aceilAdminSummary'?{set innerHTML(value){summary=value}}:null}},
    esc:v=>String(v??'').replace(/[&<>"']/g,''),
    initials:()=> 'T',
    workspaceBox:()=>'<div class="workspace">settings</div>',
    wallCatalogBox:()=>'',filmCatalogBox:()=>'',toggle:()=>'<div class="access-toggle">Toggle</div>',
    projectScope:()=>'',tempAccess:()=>'',foldSummary:()=>'',mailFeatureReady:false,
    Date,adminRows:[]
  };
  const factory=new Function(...Object.keys(params),
    source.slice(from,to)+';return {render,setUserListView,userBucket,getList:()=>userListView,getRows:()=>adminRows};');
  return {...factory(...Object.values(params)),
    html:()=>html,summary:()=>summary};
}
const member=(id,status,enabled)=>({
  user_id:id,app_role:'user',name:id,email:id+'@example.test',
  approval_status:status,is_active:enabled,workspace_initialized:true,projects_access:false
});

test('main list contains active accounts and new pending registrations only',()=>{
  const f=fixture();
  const rows=[
    member('active','approved',true),
    member('pending','pending',false),
    member('rejected','rejected',false),
    member('blocked','approved',false),
    member('rejected-but-enabled','rejected',true),
    {...member('owner','approved',true),app_role:'owner'}
  ];
  f.render(rows);
  assert.equal(f.getRows().length,5,'owner omitted from member lists');
  assert.equal(f.getList(),'current');
  assert.match(f.html(),/data-user-list="current" aria-pressed="true"/);
  assert.match(f.html(),/Активні та нові <b>\(2\)<\/b>/);
  assert.match(f.html(),/Відхилені \/ заблоковані <b>\(3\)<\/b>/);
  assert.match(f.html(),/data-uid="active"/);
  assert.match(f.html(),/data-uid="pending"/);
  assert.doesNotMatch(f.html(),/data-uid="rejected"/);
  assert.doesNotMatch(f.html(),/data-uid="blocked"/);
  assert.doesNotMatch(f.html(),/data-uid="owner"/);
  assert.match(f.html(),/Нова реєстрація/,'pending registrations retain approval controls');
  assert.match(f.summary(),/Активних/);
  assert.match(f.summary(),/Відхилених \/ заблокованих/);
  f.setUserListView('inactive');
  assert.match(f.html(),/data-user-list="inactive" aria-pressed="true"/);
  assert.match(f.html(),/data-uid="rejected"/);
  assert.match(f.html(),/data-uid="blocked"/);
  assert.match(f.html(),/data-uid="rejected-but-enabled"/);
  assert.doesNotMatch(f.html(),/data-uid="active"/);
  assert.doesNotMatch(f.html(),/data-uid="pending"/);
  assert.match(f.html(),/Відхилено/);
  assert.match(f.html(),/Заблоковано/);
});

test('rejection and blocking move members to inactive; reactivation brings them back',()=>{
  const f=fixture();
  const rows=[member('one','approved',true),member('two','pending',false)];
  f.render(rows);
  assert.equal(f.userBucket(rows[0]),'current');
  assert.equal(f.userBucket(rows[1]),'current');
  rows[1].approval_status='rejected';rows[0].is_active=false;
  f.render(rows);
  assert.match(f.html(),/Активних користувачів та нових заявок немає/);
  f.setUserListView('inactive');
  assert.match(f.html(),/data-uid="one"/);
  assert.match(f.html(),/data-uid="two"/);
  assert.match(f.html(),/Відхилено/);
  rows[0].is_active=true;rows[1].is_active=true;rows[1].approval_status='approved';
  f.render(rows);
  assert.match(f.html(),/Відхилених і заблокованих користувачів немає/);
  f.setUserListView('current');
  assert.match(f.html(),/data-uid="one"/);
  assert.match(f.html(),/data-uid="two"/);
});

test('selected list survives a data refresh, with no access-control writes',()=>{
  const f=fixture();
  f.render([member('blocked','approved',false)]);
  f.setUserListView('inactive');
  const before=f.getList();
  f.render([member('blocked','approved',false),member('new','pending',false)]);
  assert.equal(f.getList(),before);
  assert.match(f.html(),/data-uid="blocked"/);
  assert.doesNotMatch(f.html(),/data-uid="new"/);
  assert.doesNotMatch(source.slice(from,to),/\.rpc\(/,'list grouping is presentation-only');
});

test('empty list still displays both list switches and meaningful message',()=>{
  const f=fixture();
  f.render([]);
  assert.match(f.html(),/Активні та нові/);
  assert.match(f.html(),/Відхилені \/ заблоковані/);
  assert.match(f.html(),/Користувачів не знайдено/);
  f.render([member('active','approved',true)]);
  f.setUserListView('inactive');
  assert.match(f.html(),/Відхилених і заблокованих користувачів немає/);
});
