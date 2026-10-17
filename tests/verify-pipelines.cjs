/* Contract of every declared pipeline (core/007): stage order is data, each stage registered once, one owner per global. */
const assert=require('assert/strict');const {chromium}=require('playwright');const {open,reveal}=require('./browser-review.cjs');
const checks=[];function check(n,v,i){assert.ok(v,n+': '+JSON.stringify(i));checks.push(n);}
const EXPECT={
 autoFillNomenclature:["linear","universal","colorFix","cornices","insertChoice","filmFix"],
 rpcUpdate:["projectMeta","lightCount","cockpitTools","headerTotal","syncDot","metricIcons","cornerHeader"]
};
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const {page,errors}=await open(b,390,3);page.on('dialog',d=>d.accept());await reveal(page);await page.waitForTimeout(900);
  const r=await page.evaluate(async()=>{
   const P=window['A\u00b7CEIL'].pipeline,o={names:P.names(),frozen:Object.isFrozen(P),per:{}};
   for(const n of P.names()){const reg=P.get(n);o.per[n]={order:reg.order,registered:reg.registered(),dup:reg.stage(reg.order[0],{}),frozenReg:Object.isFrozen(reg)};try{reg.stage('__nope__',{});o.per[n].unknown='no throw'}catch(e){o.per[n].unknown='throws'}}
   o.rpcRet=String(window.rpcUpdate());
   return o;});
  check('pipeline factory frozen',r.frozen,r);
  check('declared pipelines match the contract',JSON.stringify(r.names.slice().sort())===JSON.stringify(Object.keys(EXPECT).sort()),r.names);
  for(const [n,order] of Object.entries(EXPECT)){const p=r.per[n];
   check(n+': order is fixed',JSON.stringify(p.order)===JSON.stringify(order),p);
   check(n+': every stage registered',JSON.stringify(p.registered)===JSON.stringify(order),p);
   check(n+': duplicates ignored, unknown rejected',p.dup===false&&p.unknown==='throws'&&p.frozenReg,p);}
  check('rpcUpdate returns undefined like before',r.rpcRet==='undefined',r.rpcRet);
  check('no page errors',errors.length===0,errors);
  console.log('PASS '+checks.length);
 }finally{await b.close();}
})().catch(e=>{console.error('FAIL',e.message.slice(0,500));process.exit(1);});
