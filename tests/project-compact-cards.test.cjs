'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const assert=require('node:assert/strict');
const file=path.join(__dirname,'../js/projects/230-aceil-project-archive.js');
const src=fs.readFileSync(file,'utf8');
const start=src.indexOf('  function ensureCompactProjectCards(){');
const end=src.indexOf('  function dismissFinishedSyncHelp(){',start);
assert(start>=0&&end>start,'compact card CSS must exist in archive decorator');

function fixture(){
  let style=null,appends=0;
  const document={
    getElementById(id){return style&&style.id===id?style:null},
    createElement(tag){assert.equal(tag,'style');return {id:'',textContent:''}},
    head:{appendChild(element){style=element;appends++}}
  };
  const context={document};
  vm.createContext(context);
  vm.runInContext(src.slice(start,end)+';ensureCompactProjectCards();ensureCompactProjectCards();',context);
  return {style,appends};
}
test('mobile project card CSS loads once with no extra external assets',()=>{
  const f=fixture();
  assert.equal(f.appends,1,'re-render must not inject duplicate style nodes');
  assert.equal(f.style.id,'aceilProjectCompactCardStyle');
  assert.match(f.style.textContent,/@media\(max-width:700px\)/);
  assert.match(f.style.textContent,/#projectsList \.rp-project-card\s*\{[\s\S]*?display:grid!important/);
  assert.match(f.style.textContent,/grid-template-columns:76px minmax\(0,1fr\)/);
  assert.match(f.style.textContent,/#projectsList \.rp-project-actions\s*\{[\s\S]*?flex-direction:row!important/);
  assert.match(f.style.textContent,/#projectsList \.rp-project-actions>button:first-child/);
  assert.match(f.style.textContent,/#projectsList \.rp-project-actions>button:not\(:first-child\)/);
  assert.match(f.style.textContent,/min-height:40px!important/,'touch targets remain usable');
});
test('short sync helper can be closed by user without dismissing pending operations',()=>{
  assert.match(src,/dismiss\.setAttribute\("aria-label","Закрити повідомлення про синхронізацію"\)/);
  assert.match(src,/dismiss\.onclick=function\(\)\{panel\.remove\(\)\}/);
  assert.match(src,/panel\.dataset\.projectId=String\(project\._dbId\|\|project\.id\)/);
  assert.match(src,/!p\._cloudRevision\|\|p\._dirty\|\|p\._localUpdatedAt\|\|queuedSave\(p\)/);
});
