const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','js','auth','033-aceil-supabase-auth-offline-access.js'),'utf8');
const start=src.indexOf('var _aceilDemoClock=null');
const end=src.indexOf('async function A_CEIL_checkActive(user){',start);
assert.ok(start>0&&end>start);
const all={},timers=new Map(),gates=[];let id=0,opened=0,rpcCalls=[];
function el(tag){
  const e={tagName:tag,id:'',className:'',style:{},children:[],parentNode:null,isConnected:false,
    attributes:{},_txt:'',href:'',onclick:null,
    setAttribute(k,v){this.attributes[k]=v},
    appendChild(child){this.children.push(child);child.parentNode=this;child.isConnected=this.isConnected},
    get childElementCount(){return this.children.length},
    set textContent(value){this._txt=String(value)},
    get textContent(){return this._txt+this.children.map(x=>x.textContent).join('')},
    remove(){this.isConnected=false;delete all[this.id]}
  };
  return e;
}
const header=el('header');header.className='app-header';
const parent={children:[header],insertBefore(child){
  this.children.push(child);child.isConnected=true;child.parentNode=this;all[child.id]=child;
}};
header.parentNode=parent;
const data={phone:'+380671234567',telegram:'@company',facebook:'javascript:alert(1)'};
const context=vm.createContext({
  Date,JSON,Math,Number,String,Promise,
  window:{A_CEIL_Support:{
    open(){opened++},
    link(key,val){
      if(key==='phone')return 'tel:'+val.replace(/[^+0-9]/g,'');
      if(key==='telegram')return 'https://t.me/'+val.replace(/^@/,'');
      return '';
    }
  }},
  _sb:{rpc:async name=>{rpcCalls.push(name);return {data,error:null}}},
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  setInterval:fn=>{timers.set(++id,fn);return id},clearInterval:k=>timers.delete(k),
  document:{
    readyState:'complete',
    getElementById:key=>all[key]||null,
    createElement:el,
    querySelector:key=>key==='header.app-header'?header:null,
    body:{appendChild(child){all[child.id]=child;child.isConnected=true}}
  },
  A_CEIL_showAccessGate:mode=>gates.push(mode)
});
vm.runInContext(src.slice(start,end),context);
(async()=>{
  vm.runInContext('A_CEIL_applyDemoStatus({id:"demo-user"},{mode:"demo_active",remaining_seconds:3600,expires_at:"2099-01-01T00:00:00Z"})',context);
  await Promise.resolve();
  await Promise.resolve();
  const bar=all.aceilDemoBanner;
  assert.ok(bar,'DEMO banner must exist');
  assert.equal(bar.className,'aceil-demo-strip','uses inline DEMO strip, not overlay');
  assert.equal(parent.children[1],bar,'DEMO contact strip appears directly under the app header');
  assert.equal(bar.children[0].children[0].textContent,'⏳ ДЕМО · залишилось 60:00');
  assert.match(bar.textContent,/Потрібна допомога або повний доступ\?/);
  assert.ok(rpcCalls.includes('aceil_support_public'),'visible demo chips read the published contacts');
  const links=bar.children[2].children;
  assert.equal(links.length,2,'renders only valid configured quick contacts');
  assert.ok(links.some(x=>x.href==='tel:+380671234567'&&/Телефон/.test(x.textContent)));
  assert.ok(links.some(x=>x.href==='https://t.me/company'&&/Telegram/.test(x.textContent)));
  assert.ok(!bar.textContent.includes('javascript:alert'));
  assert.ok(links.every(x=>x.tagName==='a'&&x.attributes['aria-label']),'links are tappable and accessible');
  bar.children[0].children[1].onclick();
  assert.equal(opened,1,'full contact dialog opens from prominent button');
  assert.equal(timers.size,1);
  vm.runInContext('_aceilDemoDeadline=Date.now()-1000',context);
  Array.from(timers.values())[0]();
  assert.deepEqual(gates,['demo_expired']);
  assert.equal(all.aceilDemoBanner,undefined,'old strip removed at expiry');
  console.log('DEMO inline timer + saved phone/Telegram + contact dialog: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
