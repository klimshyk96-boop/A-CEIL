'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/i18n/013-aceil-i18n-core.js'),'utf8');
const switcher=fs.readFileSync(path.join(__dirname,'../js/i18n/117-aceil-lang-switchers.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const version=fs.readFileSync(path.join(__dirname,'../VERSION'),'utf8').trim();

function fixture(saved='uk'){
  const requests=[],listeners={},storage={},loaded=[],updates=[];
  storage['A·CEIL_language']=saved;
  const document={
    baseURI:'https://a-ceil.pp.ua/',readyState:'loading',
    currentScript:{src:'https://a-ceil.pp.ua/js/i18n/013-aceil-i18n-core.js?v='+version},
    body:{nodeType:0},
    head:{appendChild(script){requests.push(script);return script}},
    documentElement:{
      lang:'uk',setAttribute(k,v){this[k]=v}
    },
    createElement(tag){assert.equal(tag,'script');return {async:false}},
    addEventListener(k,fn){listeners[k]=fn},
    dispatchEvent(event){loaded.push(event.type)}
  };
  const window={
    MutationObserver:class {observe(){updates.push('observe')} disconnect(){updates.push('disconnect')} takeRecords(){}}
  };
  const context={window,document,localStorage:{
      getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v}
    },URL,Promise,Math,Number,String,Object,Array,RegExp,MutationObserver:window.MutationObserver,
    setTimeout(fn){fn()},CustomEvent:class{constructor(type){this.type=type}}
  };
  vm.createContext(context);vm.runInContext(source,context);
  const api=context.window['A·CEIL'].i18n;
  return {api,context,document,storage,requests,events:loaded,updates,
    boot(){listeners.DOMContentLoaded()},
    deliver(lang,strings){
      const request=requests.at(-1);
      assert(request,'expected a pending dictionary request');
      api.register(lang,{strings});request.onload();
      return request;
    }};
}
test('Ukrainian boot downloads no foreign language packs and installs no MutationObserver',()=>{
  const f=fixture('uk');f.boot();
  assert.equal(f.requests.length,0);
  assert.equal(f.updates.length,0);
  assert.equal(f.api.getLanguage(),'uk');
  assert(!/0(?:15|16|17)-aceil-lang-(?:en|pl|ru)\.js\?v=/.test(html),
    'foreign dictionaries must not block the initial HTML');
});
test('foreign dictionary is downloaded only on choice, with the application version',async()=>{
  const f=fixture();
  f.boot();
  const a=f.api.ensureLanguage('en'),b=f.api.ensureLanguage('en');
  assert.strictEqual(a,b,'two requests for one language share exactly one promise');
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].async,true);
  assert.equal(f.requests[0].src,
    'https://a-ceil.pp.ua/js/i18n/015-aceil-lang-en.js?v='+version);
  f.deliver('en',{'Площа':'Area'});
  await a;
  f.api.setLanguage('en');
  assert.equal(f.api.translate('Площа'),'Area');
  assert.equal(f.storage['A·CEIL_language'],'en');
  assert.equal(f.updates.filter(x=>x==='observe').length,1);
  f.api.setLanguage('uk');
  assert.equal(f.api.translate('Площа'),'Площа');
  assert.equal(f.updates.at(-1),'disconnect','observer must stop after returning to Ukrainian');
});
test('saved Polish choice loads once on startup and translates after registration',async()=>{
  const f=fixture('pl');f.boot();
  assert.equal(f.api.getLanguage(),'pl');
  assert.equal(f.requests.length,1);
  assert.match(f.requests[0].src,/016-aceil-lang-pl\.js\?v=/);
  f.deliver('pl',{'Зберегти':'Zapisz'});
  await f.api.ensureLanguage('pl');
  assert.equal(f.api.translate('Зберегти'),'Zapisz');
  assert.equal(f.updates.filter(x=>x==='observe').length,1);
});
test('on-demand loading can retry after offline error without persisting a new selection',async()=>{
  const f=fixture();f.boot();
  const p=f.api.ensureLanguage('ru');
  f.requests.at(-1).onerror();
  await assert.rejects(p,/offline/);
  assert.equal(f.api.getLanguage(),'uk');
  assert.equal(f.storage['A·CEIL_language'],'uk');
  const retry=f.api.ensureLanguage('ru');
  assert.equal(f.requests.length,2);
  f.deliver('ru',{'Зберегти':'Сохранить'});
  await retry;
  assert.equal(f.api.getLanguage(),'uk','loading is not a language selection');
});
test('unknown language is never fetched and switcher waits before reloading',async()=>{
  const f=fixture();await assert.rejects(f.api.ensureLanguage('xx'),/Unsupported/);
  assert.equal(f.requests.length,0);
  const first=switcher.indexOf('await api.ensureLanguage(code)');
  const second=switcher.indexOf('api.setLanguage(code)',first);
  const reload=switcher.indexOf('location.reload()',second);
  assert(first>0&&second>first&&reload>second,'do not persist or reload before requested dictionary loads');
});
