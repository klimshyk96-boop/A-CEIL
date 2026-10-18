/* Differential test of the nomenclature list (renderElemList pipeline): both builds must render identical DOM.
   Usage: node scripts/diff-render-builds.cjs <oldRoot> <newRoot> [scenarios=24] [batch=6] [width=390|1440] */
const {chromium}=require('playwright');
const [,, rootA, rootB, nArg, bArg, wArg]=process.argv;const N=Number(nArg)||24,BATCH=Number(bArg)||6,W=Number(wArg)||390;
async function run(root,seedBase,count){
 const {open,reveal}=require(root+'/tests/browser-review.cjs');
 const b=await chromium.launch({headless:true});const {page,errors}=await open(b,W,W>800?1:3,root);page.on('dialog',d=>d.accept());await reveal(page);await page.waitForTimeout(700);
 const out=await page.evaluate(async([N,SEED])=>{
  let seed=SEED;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const pick=a=>a[Math.floor(rnd()*a.length)];
  const API=window['A\u00b7CEIL'].API;const res=[];const toasts=[];window.showToast=function(m){toasts.push(String(m))};
  const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h};
  const norm=h=>h.replace(/\d{9,}/g,'N').replace(/\s+/g,' ');
  for(let n=0;n<N;n++){
   API.state.reset();toasts.length=0;
   const w=250+Math.floor(rnd()*40)*10,h=220+Math.floor(rnd()*30)*10;
   const poly=[[0,0],[w,0],[w,h],[0,h]];realPts=poly.map(([x,y])=>({x,y}));pts=poly.map(([x,y])=>({x:100+x,y:100+y}));lengths=[w,h,w,h];closed=true;
   try{window.A_CEIL_AutoCount.setEnabled(rnd()<.8)}catch(e){}
   await autoFillNomenclature({silent:true});
   const extra=Math.floor(rnd()*4);
   for(let g=0;g<extra;g++){const gid='g_t'+g;elemGroups.push({id:gid,name:pick(['Профілі','Світло','Додатково','Вставки']),collapsed:rnd()<.4});
    const k=1+Math.floor(rnd()*3);for(let i=0;i<k;i++)elemItems.push({id:'t'+g+'_'+i,groupId:gid,icon:'',name:pick(['Профіль А','Вставка','Кут','Люстра'])+' '+i,qty:Math.floor(rnd()*20),unit:pick(['м','шт']),price:10+Math.floor(rnd()*300),inputMode:'manual',source:''});}
   if(rnd()<.2){elemItems.length=0;elemGroups.length=0;}
   const calls=1+Math.floor(rnd()*2);for(let i=0;i<calls;i++)window.renderElemList();
   await new Promise(r=>setTimeout(r,200));
   const el=document.getElementById('elemList');
   res.push({n,groups:elemGroups.length,items:elemItems.length,list:el?hash(norm(el.innerHTML)):null,listLen:el?el.innerHTML.length:null,side:Array.from(document.querySelectorAll('[id*="idebar"],[class*="desktop-side"]')).map(e=>hash(norm(e.innerHTML))).join(','),toasts:toasts.slice()});
  }
  return res;},[count,seedBase]);
 await b.close();return {out,errors};
}
(async()=>{
 let total=0,diffs=0,errs=0,empties=0,nonEmpty=0;
 for(let batch=0;batch*BATCH<N;batch++){
  const cnt=Math.min(BATCH,N-batch*BATCH),seed=20261018+batch*130363;
  const A=await run(rootA,seed,cnt),B=await run(rootB,seed,cnt);
  for(let i=0;i<A.out.length;i++){total++;if(A.out[i].items===0)empties++;else nonEmpty++;
   if(JSON.stringify(A.out[i])!==JSON.stringify(B.out[i])){diffs++;if(diffs<=2)console.log('DIFF',JSON.stringify(A.out[i]),'\n    ',JSON.stringify(B.out[i]));}}
  errs+=A.errors.length+B.errors.length;console.log('batch',batch,'total',total,'diffs',diffs);
 }
 console.log('TOTAL width',W,'scenarios',total,'differences',diffs,'| page errors',errs,'| empty-list scenarios',empties,'| non-empty',nonEmpty);
 process.exit(diffs||errs?1:0);
})();
