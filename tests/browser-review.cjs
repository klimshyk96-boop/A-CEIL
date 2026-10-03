const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const stub=`window.supabase={createClient(){const q=new Proxy(function(){},{get(t,k){if(k==='then')return r=>Promise.resolve({data:[],error:null}).then(r);return (...a)=>q},apply(){return q}});return {auth:{getSession:async()=>({data:{session:null},error:null}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null}),startAutoRefresh(){},stopAutoRefresh(){}},from:()=>q,rpc:()=>q,channel:()=>q,removeChannel:async()=>{},removeAllChannels:async()=>{},storage:{from:()=>q}}}};`;
async function open(browser,width=1440,dpr=1,sourceRoot=root){
 const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:dpr});
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:stub});
  if(u.hostname!=='aceil.test')return route.fulfill({status:403,body:'Offline test: external requests disabled'});
  let f=path.join(sourceRoot,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
  if(!fs.existsSync(f)){missing.push(u.pathname);return route.fulfill({status:404,body:'Not found'});}
  const types={'.js':'application/javascript','.html':'text/html','.css':'text/css'};
  return route.fulfill({contentType:types[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)});
 });
 await page.goto('http://aceil.test/',{waitUntil:'load'});await page.waitForTimeout(1200);
 return {page,errors,missing};
}
async function reveal(page){await page.evaluate(()=>{
 for(const e of document.querySelectorAll('[id]'))if(/login|authScreen|auth.*overlay|bootOverlay/i.test(e.id)&&getComputedStyle(e).position==='fixed')e.style.setProperty('display','none','important');
 document.body.classList.remove('auth-locked');
});}
module.exports={open,reveal};
if(require.main===module)(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});const {page,errors,missing}=await open(b);
 console.log(JSON.stringify({errors,missing,state:await page.evaluate(()=>({draw:typeof draw,ctx:typeof ctx,windowCtx:typeof window.ctx,canvas:[cv.width,cv.height],health:window.A_CEIL_CleanHealth?.(),bodyClasses:document.body.className,visible:[...document.querySelectorAll('[id]')].filter(e=>getComputedStyle(e).position==='fixed'&&getComputedStyle(e).display!=='none').map(e=>e.id)}))},null,2));
 await reveal(page);await page.screenshot({path:'/tmp/aceil-initial.png',fullPage:false});await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
