'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/reports/224-aceil-report-diagonals-menu-fix.js'),'utf8');

function fixture(){
  const nodes=new Map(),listeners={},written=[];
  const item=value=>{
    const events={};
    return {dataset:{value},textContent:'',active:false,classList:{
      toggle(name,on){if(name==='active')this.active=!!on}},
      addEventListener(name,fn){events[name]=fn},
      click(){events.click&&events.click()}
    };
  };
  const items=['none','manual','visible','all'].map(item);
  const choice=Object.fromEntries(items.map(x=>[x.dataset.value,x]));
  const title={textContent:''},checkboxListeners=[];
  const checkbox={checked:true,closest(){return {
    insertAdjacentElement(_,menu){nodes.set(menu.id,menu)}
  }},addEventListener(name,fn){if(name==='change')checkboxListeners.push(fn)},
    dispatchEvent(){checkboxListeners.forEach(fn=>fn());return true;}};
  const select={value:'all',hidden:false,options:[],closest(){return null},querySelector(q){return q==='option[value="visible"]'?this.options.find(o=>o.value==='visible')||null:null},appendChild(o){this.options.push(o)},dispatchEvent(){return true}};
  const sheet={querySelector(){return null}};
  const modal={querySelector(){return sheet}};
  nodes.set('reportSettingsModal',modal);nodes.set('rs_diagonals',checkbox);nodes.set('rsDiagMode',select);
  let stage=null;
  const window={__diagSilent(e){throw e},'A·CEIL':{i18n:{getLanguage(){return 'uk'}},pipeline:{
    get(){return {stage(name,value){assert.equal(name,'diagonalSettings');stage=value.around}}}
  }},saveReportSettings(){written.push({diagonals:checkbox.checked,diagMode:select.value})}};
  const document={head:{appendChild(n){nodes.set(n.id,n)}},
    getElementById(id){return nodes.get(id)||null},
    addEventListener(name,fn){listeners[name]=fn},
    createElement(tag){
      if(tag==='style')return {id:'',textContent:''};
      if(tag==='option')return {value:'',textContent:''};
      if(tag==='div')return {id:'',className:'',hidden:false,innerHTML:'',children:[],
        querySelector(s){if(s==='.rsdiag-title')return title;const m=s.match(/data-value="([^"]+)"/);return m?choice[m[1]]:null},
        querySelectorAll(s){return s==='[data-value]'?items:[]},
        appendChild(child){this.children.push(child)}
      };
      throw Error('unexpected node '+tag);
    }
  };
  const ctx={window,document,console,Event,setTimeout(fn){fn()}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  assert.equal(typeof stage,'function');
  stage(()=>{});
  return {checkbox,select,written,menu:nodes.get('rsDiagInlineMenu'),items,choice};
}

test('explicit no-diagonals button disables both lines and text in report settings',()=>{
  const f=fixture();
  assert.equal(f.items.length,4);
  assert.equal(f.menu.hidden,false,'option must remain accessible while disabled');
  assert.equal(f.choice.all.classList.active,true);
  f.choice.none.click();
  assert.equal(f.checkbox.checked,false);
  assert.equal(f.written.at(-1).diagonals,false);
  assert.equal(f.menu.hidden,false,'one-tap restore remains visible');
  assert.equal(f.choice.none.classList.active,true);
  f.choice.manual.click();
  assert.equal(f.checkbox.checked,true);
  assert.equal(f.select.value,'manual');
  assert.deepEqual(f.written.at(-1),{diagonals:true,diagMode:'manual'});
  f.choice.visible.click();
  assert.equal(f.select.value,'visible');
  assert.deepEqual(f.written.at(-1),{diagonals:true,diagMode:'visible'});
  assert.equal(f.choice.visible.classList.active,true);
  f.choice.all.click();
  assert.deepEqual(f.written.at(-1),{diagonals:true,diagMode:'all'});
});
