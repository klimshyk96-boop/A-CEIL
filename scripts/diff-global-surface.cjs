#!/usr/bin/env node
// Compare loaded global function source and other global types. This does not
// prove closure, event-listener, data-value or user-flow equivalence.
const path=require('node:path');
function compare(base,candidate,allowed=[]){
 const differences=[];
 for(const kind of ['fns','other'])for(const key of new Set([...Object.keys(base[kind]),...Object.keys(candidate[kind])])){
  if(base[kind][key]!==candidate[kind][key]&&!(kind==='fns'&&allowed.includes(key)&&key in base.fns&&key in candidate.fns))differences.push(`${kind}: ${key}`);
 }
 for(const [name,value] of [['baseline',base],['candidate',candidate]]){
  for(const error of value.errors||[])differences.push(`${name} error: ${error}`);
  for(const missing of value.missing||[])if(/\.(js|css|html)(?:\?|$)/.test(missing))differences.push(`${name} missing: ${missing}`);
 }
 return differences;
}
async function run(){
 const args=process.argv.slice(2),allowed=args.filter(x=>x.startsWith('--allow=')).flatMap(x=>x.slice(8).split(',')).filter(Boolean),dirs=args.filter(x=>!x.startsWith('--'));
 if(dirs.length<1||dirs.length>2||args.some(x=>x.startsWith('--')&&!x.startsWith('--allow=')))throw Error('usage: node scripts/diff-global-surface.cjs <baseline-dir> [candidate-dir] [--allow=function1,function2]');
 const {chromium}=require('playwright'),{open}=require('../tests/browser-review.cjs');
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 const snapshots=[];
 try{
  for(const root of [path.resolve(dirs[0]),path.resolve(dirs[1]||path.join(__dirname,'..'))]){
   const {page,errors,missing}=await open(browser,1440,1,root);
   const snapshot=await page.evaluate(()=>{
    const fns={},other={};
    for(const key of Object.getOwnPropertyNames(window)){
     let value;try{value=window[key]}catch{continue}
     if(typeof value==='function')fns[key]=Function.prototype.toString.call(value);
     else if(!/^(webkit|on[a-z]|chrome|__)/.test(key))other[key]=typeof value+(Array.isArray(value)?'[]'+value.length:'');
    }
    return {fns,other};
   });
   snapshots.push({...snapshot,errors:[...errors],missing:[...missing]});await page.close();
  }
 }finally{await browser.close()}
 const differences=compare(...snapshots,allowed);
 const changed=Object.keys(snapshots[0].fns).filter(key=>snapshots[0].fns[key]!==snapshots[1].fns[key]);
 console.log(`Global surface: ${Object.keys(snapshots[0].fns).length} baseline functions; changed: ${changed.join(', ')||'none'}; unexpected differences: ${differences.length}`);
 differences.forEach(value=>console.error(value));
 if(differences.length)process.exitCode=1;
}
module.exports={compare};
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1});
