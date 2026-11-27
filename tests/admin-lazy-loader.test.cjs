'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/admin/admin-lazy-loader.js'),'utf8');
const version=fs.readFileSync(path.join(__dirname,'../VERSION'),'utf8').trim();
function fixture(){
  const scripts=[],messages=[],nodes=[],calls=[];
  const win={__diagSilent(e){messages.push(String(e))},showToast(t){messages.push(t)}};
  const make=(tag)=>{
    const node={tagName:tag.toUpperCase(),parentNode:null,
      children:[],async:false,removed:false,
      setAttribute(k,v){this[k]=v},
      remove(){this.removed=true;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this)},
      appendChild(child){child.parentNode=this;this.children.push(child);return child},
      insertBefore(child,other){child.parentNode=this;const i=this.children.indexOf(other);this.children.splice(i<0?this.children.length:i,0,child);return child},
      querySelector(){return null}};
    nodes.push(node);return node;
  };
  const top=make('div');const status=make('div');status.id='rpcStatus';
  top.appendChild(status);
  top.querySelector=s=>s==='.rpc-head-right'?status:null;
  const doc={
    currentScript:{src:'https://a-ceil.pp.ua/js/admin/admin-lazy-loader.js?v='+version},
    baseURI:'https://a-ceil.pp.ua/',
    head:{appendChild(node){scripts.push(node)}},
    createElement:make,
    getElementById:id=>nodes.find(n=>n.id===id&&!n.removed)||null,
    querySelector:selector=>selector==='#rpCockpit .rpc-top'?top:null
  };
  const ctx={window:win,document:doc,location:{origin:'https://a-ceil.pp.ua'},URL,Promise,encodeURIComponent};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  win._sbUser=null;
  return {win,doc,scripts,messages,calls,nodes,
    setUser(user){win._sbUser=user;win._sb={rpc:async(name)=>{
      calls.push(name);
      return {data:user&&user.admin?[{user_id:user.id,app_role:'owner',is_active:true}]:[],error:null};
    }}}};
}
test('default render neither downloads admin code nor blocks support links',()=>{
  const f=fixture();
  assert.equal(f.scripts.length,0);
  assert.equal(typeof f.win.A_CEIL_Admin.refreshOwner,'function');
  assert.equal(typeof f.win.A_CEIL_Support.open,'function');
  assert.equal(f.win.A_CEIL_Support.link('telegram','@support_user'),'https://t.me/support_user');
  assert.equal(f.win.A_CEIL_Support.link('phone','+380 99 123 45 67'),'tel:+380991234567');
  assert.equal(f.win.A_CEIL_Support.link('website','javascript:alert(1)'),'');
});
test('ordinary signed-in users never download the 50KB admin implementation',async()=>{
  const f=fixture(),u={id:'installer',email:'installer@example.test'};
  f.setUser(u);
  const results=await Promise.all([f.win.A_CEIL_Admin.refreshOwner(u),
    f.win.A_CEIL_Admin.refreshOwner(u)]);
  assert.deepEqual(results,[false,false]);
  assert.equal(f.scripts.length,0,'auth restoration must not load admin for non-owners');
  assert.equal(f.calls.filter(x=>x==='admin_list_users').length,1,
    'concurrent auth events share one protected RPC');
  assert.equal(f.doc.getElementById('A_CEIL_OwnerAdminButton'),null);
});
test('owner gets a lightweight launcher; module loads on first tap only',async()=>{
  const f=fixture(),u={id:'owner',email:'owner@example.test',admin:true};
  f.setUser(u);
  assert.equal(await f.win.A_CEIL_Admin.refreshOwner(u),true);
  assert.equal(f.scripts.length,0,'owner check must not download full admin');
  const button=f.doc.getElementById('A_CEIL_OwnerAdminButton');
  assert(button,'server-authorized owner launcher appears');
  let opened=0;
  const click=button.onclick();
  assert.equal(f.scripts.length,1);
  assert.equal(f.scripts[0].src,'https://a-ceil.pp.ua/js/admin/166-aceil-admin.js?v='+version);
  f.win.A_CEIL_Admin={open(){opened++},refreshOwner(){return true}};
  f.win.A_CEIL_Support={open(){},link(){}};
  f.scripts[0].onload();
  await click;
  assert.equal(opened,1);
  assert.equal(f.scripts.length,1);
});
test('sign-out hides owner launcher without downloading admin',async()=>{
  const f=fixture(),u={id:'owner',admin:true};f.setUser(u);
  assert.equal(await f.win.A_CEIL_Admin.refreshOwner(u),true);
  assert(f.doc.getElementById('A_CEIL_OwnerAdminButton'));
  f.win.A_CEIL_Admin.reset();
  assert.equal(f.doc.getElementById('A_CEIL_OwnerAdminButton'),null);
  assert.equal(f.scripts.length,0);
});
test('support button loads the admin/support module once then opens it',async()=>{
  const f=fixture();
  const pending=f.win.A_CEIL_Support.open();
  assert.equal(f.scripts.length,1);
  f.win.A_CEIL_Admin={open(){}};
  f.win.A_CEIL_Support={open(){return 17},close(){},link(){}};
  f.scripts[0].onload();
  assert.equal(await pending,17);
  assert.equal(await f.win.A_CEIL_Support.open(),17);
  assert.equal(f.scripts.length,1);
});
test('network error never overwrites facade, and next tap retries',async()=>{
  const f=fixture(),pending=f.win.A_CEIL_Support.open();
  f.scripts[0].onerror();
  await assert.rejects(pending,/Admin script unavailable/);
  assert.equal(f.scripts[0].removed,true);
  assert.equal(typeof f.win.A_CEIL_Support.open,'function');
  assert.equal(f.messages.some(m=>m.includes('Повторіть')),true);
  const retry=f.win.A_CEIL_Support.open();
  assert.equal(f.scripts.length,2);
  f.win.A_CEIL_Admin={open(){}};
  f.win.A_CEIL_Support={open(){return 'ok'}};
  f.scripts[1].onload();
  assert.equal(await retry,'ok');
});
