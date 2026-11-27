'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/admin/admin-lazy-loader.js'),'utf8');
const version=fs.readFileSync(path.join(__dirname,'../VERSION'),'utf8').trim();
function fixture(){
  const scripts=[],messages=[];
  const win={__diagSilent(e){messages.push(String(e))},showToast(t){messages.push(t)}};
  const doc={
    currentScript:{src:'https://a-ceil.pp.ua/js/admin/admin-lazy-loader.js?v='+version},
    baseURI:'https://a-ceil.pp.ua/',
    head:{appendChild(node){scripts.push(node)}},
    createElement(tag){
      assert.equal(tag,'script');
      return {async:false,removed:false,remove(){this.removed=true}};
    }
  };
  const ctx={window:win,document:doc,location:{origin:'https://a-ceil.pp.ua'},URL,Promise,encodeURIComponent};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {win,doc,scripts,messages};
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
test('sign-in refresh loads one versioned local script and forwards owner identity',async()=>{
  const f=fixture();let calls=0;
  const u={id:'owner',email:'owner@example.test'};
  const a=f.win.A_CEIL_Admin.refreshOwner(u);
  const b=f.win.A_CEIL_Admin.refreshOwner(u);
  assert.equal(f.scripts.length,1,'concurrent auth callbacks share download');
  assert.equal(f.scripts[0].src,'https://a-ceil.pp.ua/js/admin/166-aceil-admin.js?v='+version);
  assert.equal(f.scripts[0].async,true);
  f.win.A_CEIL_Admin={open(){},refreshOwner(user){calls++;assert.equal(user,u);return true}};
  f.win.A_CEIL_Support={link(){return''},open(){return 'support-page'}};
  f.scripts[0].onload();
  assert.equal(await a,true);
  assert.equal(await b,true);
  assert.equal(calls,2,'each caller gets the authenticated refresh result');
  assert.equal(f.scripts.length,1);
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
