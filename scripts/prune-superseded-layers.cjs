#!/usr/bin/env node
/* Removes `window.X = function(){...}` statements that can never be reached:
   a later layer overwrites window.X, and X is not read anywhere (window.X, bare X, or the string "X")
   in the files from the earlier layer up to and including the overwriting layer.
   Default: report only. --apply rewrites the files. Needs `acorn` (resolved from NODE_PATH or ts-node). */
const fs=require('fs'),path=require('path');
function load(name){
 try{return require(name)}catch(_){
  throw new Error('Missing optional dependency "'+name+'". Install locally with: npm install --no-save acorn acorn-walk');
 }
}
const acorn=load('acorn'),walk=load('acorn-walk');
const root=path.resolve(__dirname,'..'),apply=process.argv.includes('--apply');
const order=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-order.json'),'utf8'));
const files=order.map(f=>({f,src:fs.readFileSync(path.join(root,f),'utf8')}));
const isWin=n=>n&&n.type==='MemberExpression'&&n.object.type==='Identifier'&&(n.object.name==='window'||n.object.name==='globalThis');
const keyOf=n=>!n.computed?n.property.name:(n.property.type==='Literal'?String(n.property.value):null);
const assigns={},reads={};  // assigns[X]=[{fi,start,end,stmt,fn}] ; reads[X]=Set(fileIndex)
const addRead=(X,fi)=>{(reads[X]=reads[X]||new Map()).set(fi,(reads[X].get(fi)||0)+1)};
files.forEach((o,fi)=>{let ast;try{ast=acorn.parse(o.src,{ecmaVersion:'latest',ranges:false})}catch(e){console.error('parse fail',o.f);return}
 const targets=new Set();
 walk.full(ast,n=>{if(n.type==='AssignmentExpression'&&isWin(n.left)){const k=keyOf(n.left);if(k)targets.add(n.left)}});
 walk.fullAncestor(ast,(n,_,anc)=>{
  const p=anc[anc.length-2];
  if(n.type==='AssignmentExpression'&&n.operator==='='&&isWin(n.left)){const k=keyOf(n.left);if(k){
     const standalone=p&&p.type==='ExpressionStatement'&&p.expression===n;
     (assigns[k]=assigns[k]||[]).push({fi,start:standalone?p.start:null,end:standalone?p.end:null,fn:/Function/.test(n.right.type)});}}
  if(n.type==='MemberExpression'&&isWin(n)&&!targets.has(n)){const k=keyOf(n);if(k)addRead(k,fi)}
  if(n.type==='Identifier'){ if(p&&((p.type==='MemberExpression'&&p.property===n&&!p.computed)||(p.type==='Property'&&p.key===n&&!p.computed&&!p.shorthand)))return; addRead(n.name,fi)}
  if(n.type==='Literal'&&typeof n.value==='string'&&/^[\w$\u00b7]+$/.test(n.value)&&!(p&&p.type==='MemberExpression'&&p.property===n&&isWin(p)&&targets.has(p)))addRead(n.value,fi);
  if(n.type==='TemplateElement'&&n.value.cooked)(n.value.cooked.match(/[\w$\u00b7]+/g)||[]).forEach(w=>addRead(w,fi));
 });
});
const removals=[];const report=[];
for(const [X,list] of Object.entries(assigns)){
 const L=list.slice().sort((a,b)=>a.fi-b.fi||(a.start||0)-(b.start||0));
 for(let i=0;i<L.length-1;i++){const A=L[i],B=L[i+1];
  if(!A.fn||A.start===null)continue;
  const r=reads[X];let n=0;if(r)for(const [fi,c] of r)if(fi>=A.fi&&fi<=B.fi)n+=c;
  if(n===0){removals.push({X,A,B});report.push(X+': '+files[A.fi].f.split('/').pop()+' -> overwritten by '+files[B.fi].f.split('/').pop()+' ('+(A.end-A.start)+' bytes)');}}
}
console.log('superseded layers:',removals.length,'bytes:',removals.reduce((s,r)=>s+r.A.end-r.A.start,0));
report.sort().forEach(l=>console.log('  '+l));
if(apply){
 const byFile={};removals.forEach(r=>(byFile[r.A.fi]=byFile[r.A.fi]||[]).push(r));
 for(const [fi,rs] of Object.entries(byFile)){let s=files[fi].src;rs.sort((a,b)=>b.A.start-a.A.start);
  for(const r of rs){s=s.slice(0,r.A.start)+'/* window.'+r.X+': earlier layer removed, superseded in '+files[r.B.fi].f.split('/').pop()+' */'+s.slice(r.A.end)}
  fs.writeFileSync(path.join(root,files[fi].f),s);}
 console.log('applied to',Object.keys(byFile).length,'files');}
