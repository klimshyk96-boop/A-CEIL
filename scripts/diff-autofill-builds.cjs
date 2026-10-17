/* Differential test of two builds: seeded random rooms/marks/lights/insert choices/auto-count switch run against BOTH
   project copies; every auto-fill result (items, quantities, toasts, return values) must be identical.
   Usage: node scripts/diff-autofill-builds.cjs <oldRoot> <newRoot> [scenarios=60] [batch=6]
   Use it before and after every merge of a wrapper chain. Needs playwright and tests/browser-review.cjs in both roots. */
const {chromium}=require('playwright');const fs=require('fs');
const [,, rootA, rootB, nArg, bArg]=process.argv;const N=Number(nArg)||60;const BATCH=Number(bArg)||6;
async function run(root,seedBase,count){
 const {open,reveal}=require(root+'/tests/browser-review.cjs');
 const b=await chromium.launch({headless:true});const {page,errors}=await open(b,390,3,root);page.on('dialog',d=>d.accept());await reveal(page);
 const wd=setInterval(()=>{},60000);
 const out=await page.evaluate(async([N,SEED])=>{
  let seed=SEED;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const pick=a=>a[Math.floor(rnd()*a.length)];const API=window['A\u00b7CEIL'].API;
  const toasts=[];const oldToast=window.showToast;window.showToast=function(m){toasts.push(String(m));};try{showToast=window.showToast}catch(e){}
  const res=[];
  for(let n=0;n<N;n++){
   window.__n=n;window.__st='reset';API.state.reset();toasts.length=0;
   const w=200+Math.floor(rnd()*60)*10,h=200+Math.floor(rnd()*50)*10,L=rnd()<.35;
   const poly=L?[[0,0],[w,0],[w,Math.floor(h/2/10)*10],[Math.floor(w/2/10)*10,Math.floor(h/2/10)*10],[Math.floor(w/2/10)*10,h],[0,h]]:[[0,0],[w,0],[w,h],[0,h]];
   realPts=poly.map(([x,y])=>({x,y}));pts=poly.map(([x,y])=>({x:100+x,y:100+y}));
   lengths=poly.map((p,i)=>{const q=poly[(i+1)%poly.length];return Math.round(Math.hypot(q[0]-p[0],q[1]-p[1]));});closed=true;
   const enabled=rnd()<.8;try{window.A_CEIL_AutoCount.setEnabled(enabled);}catch(e){}
   window.__st='first';const first=await autoFillNomenclature({silent:true});
   elemGroups.push({id:'g_x',name:'Елементи'});
   const mk=(nm,u,price,s,extra)=>Object.assign({id:'x_'+nm+n,groupId:'g_x',icon:'',name:nm,qty:0,unit:u,price,inputMode:'auto',source:s,autoFilled:false},extra||{});
   elemItems.push(mk('Профіль базовий','м',100,'main_profile'),mk('Профіль тіньовий','м',300,'shadow_profile'),mk('Профіль парящий','м',350,'floating_profile'),
     mk('Вставка біла','м',80,'white_insert'),mk('Вставка чорна','м',90,'',{sourceVariant:'black'}),mk('Кути','шт',50,'corners'),mk('Периметр','м',20,'full_perimeter'),
     mk('Світильник','шт',200,'spot_light'),mk('Люстра','шт',500,'chandelier'),mk('Вентиляція','шт',150,'ventilation'),mk('Карниз кути','шт',90,'cornice_corners'),mk('Розрив карниза','шт',70,'cornice_break'));
   const sel=pick([0,1,2]);if(sel===1)elemItems.find(i=>i.sourceVariant==='black').insertSelected=true;if(sel===2)elemItems.find(i=>i.source==='white_insert').insertSelected=true;
   const types=['Тіньовий профіль','Парящий профіль','Профіль'];const marks=[];const k=Math.floor(rnd()*4);
   for(let i=0;i<k;i++)marks.push({id:'m'+i,sideIndex:Math.floor(rnd()*poly.length),type:pick(types),lenCm:50+Math.floor(rnd()*20)*10,offsetCm:100,anchor:'center',color:'#000'});
   window.wallMarks=marks;try{wallMarks=window.wallMarks}catch(e){}
   const lm=[];const lc=Math.floor(rnd()*6);for(let i=0;i<lc;i++)lm.push({id:'l'+i,type:pick(['spot','spot','chandelier','vent']),x:150+i*30,y:150+i*10});
   window.lightMarks=lm;try{lightMarks=window.lightMarks}catch(e){}
   window.__st='second';const second=await autoFillNomenclature(pick([{silent:true},{silent:false},undefined]));
   window.__st='wait';await new Promise(r=>setTimeout(r,330));window.__st='after';
   const items=elemItems.map(x=>[x.name,x.qty,x.unit,x.price,x.insertSelected===true,x.autoFilled===true,x.autoZero===true,x.source||'']);
   let total=null;try{API.estimate.recalc();total=document.getElementById('elemTotal')?document.getElementById('elemTotal').textContent:null}catch(e){}
   res.push({n,enabled,first:JSON.stringify(first===undefined?'u':first),second:JSON.stringify(second===undefined?'u':second),items,toasts:toasts.slice(),total});
  }
  window.showToast=oldToast;return res;},[count,seedBase]);
 clearInterval(wd);await b.close();return {out,errors};
}
(async()=>{
 let total=0,diffs=0,errs=0,dis=0,insSel=0,blackSel=0,withMarks=0;
 for(let batch=0;batch*BATCH<N;batch++){
  const cnt=Math.min(BATCH,N-batch*BATCH),seed=20261016+batch*7919;
  const A=await run(rootA,seed,cnt),B=await run(rootB,seed,cnt);
  for(let i=0;i<A.out.length;i++){total++;if(!A.out[i].enabled)dis++;if(A.out[i].items.some(x=>/Вставка/.test(x[0])&&x[4]))insSel++;if(A.out[i].items.some(x=>x[0]==='Вставка чорна'&&x[4]))blackSel++;if(A.out[i].items.some(x=>/тіньовий|парящий/i.test(x[0])&&x[1]>0))withMarks++;if(JSON.stringify(A.out[i])!==JSON.stringify(B.out[i])){diffs++;if(diffs<=3)console.log('DIFF batch',batch,'#'+i+'\nA:',JSON.stringify(A.out[i]).slice(0,700),'\nB:',JSON.stringify(B.out[i]).slice(0,700));}}
  errs+=A.errors.length+B.errors.length;
  console.log('batch',batch,'done',total,'diffs',diffs);
 }
 console.log('TOTAL scenarios',total,'differences',diffs,'| page errors',errs,'| autocount-disabled',dis,'| insert selected',insSel,'(black',blackSel+')','| profile marks counted',withMarks);
 process.exit(diffs||errs?1:0);
})();
