/* PWA shell: service worker installs, precaches every script from index.html, cache name matches the
   ?v= build tag, and the app starts again with the network switched off. */
const fs=require('fs'),os=require('os'),path=require('path'),https=require('https'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const {chromium}=require('playwright');
const {stub}=require('./browser-review.cjs');
const root=path.resolve(path.join(__dirname,'..'));
const types={'.js':'application/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
/* index.html registers the service worker only on https, so serve over https with a throw-away certificate */
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'aceil-pwa-'));
try{execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(tmp,'k.pem'),'-out',path.join(tmp,'c.pem'),'-days','2','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});}
catch(e){console.log('SKIP verify-pwa: openssl is not available');process.exit(0);}
const server=https.createServer({key:fs.readFileSync(path.join(tmp,'k.pem')),cert:fs.readFileSync(path.join(tmp,'c.pem'))},(req,res)=>{
 let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p==='/'||p.startsWith('/r/')||p.startsWith('/report/'))p='/index.html';
 const f=path.join(root,p);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
 res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(fs.readFileSync(f));
});
const checks=[];function check(n,v,i){assert.ok(v,n+': '+JSON.stringify(i));checks.push(n);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='https://127.0.0.1:'+server.address().port;
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const tags=[...new Set([...html.matchAll(/\?v=([^"&]+)/g)].map(m=>m[1]))];
 const cacheName=(sw.match(/SHELL_CACHE="([^"]+)"/)||[])[1];
 check('single ?v= build tag',tags.length===1,tags);
 check('cache name matches build tag',cacheName==='aceil-shell-'+tags[0],{cacheName,tags});
 const localScripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(s=>!/^https?:/.test(s));
 const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors'],executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'allow',ignoreHTTPSErrors:true});
  await ctx.addInitScript(stub);
  await ctx.route(/cdn\.jsdelivr\.net|\/vendor\/supabase-js-/,r=>r.fulfill({contentType:'application/javascript',body:stub}));
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/',{waitUntil:'load'});
  /* the app reloads itself once when the worker takes control, so every probe retries across that reload */
  const retry=async fn=>{for(let i=0;i<40;i++){try{return await fn();}catch(e){await page.waitForTimeout(250);}}return fn();};
  await retry(()=>page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true)));
  let count=0;for(let i=0;i<80;i++){count=await retry(()=>page.evaluate(async()=>{const k=(await caches.keys()).find(x=>x.startsWith('aceil-shell-'));return k?(await (await caches.open(k)).keys()).length:0;}));if(count>=localScripts.length)break;await page.waitForTimeout(500);}
  await retry(()=>page.evaluate(()=>navigator.serviceWorker.controller?true:Promise.reject(new Error('no controller yet'))));
  const keys=await retry(()=>page.evaluate(()=>caches.keys()));
  check('service worker installed and cache created',keys.includes(cacheName),keys);
  check('all local scripts precached',count>=localScripts.length,{count,scripts:localScripts.length});
  await ctx.setOffline(true);
  await page.reload({waitUntil:'load'});await page.waitForTimeout(1500);
  const state=await retry(()=>page.evaluate(()=>({draw:typeof draw,cv:!!document.getElementById('cv')||!!document.querySelector('canvas'),title:document.title})));
  check('app starts offline from cache',state.draw==='function'&&state.cv,state);
  check('no script errors offline',errors.length===0,errors);
  await ctx.close();
  console.log('PASS '+checks.length);
 }finally{await b.close();server.close();}
})().catch(e=>{console.error('FAIL',e.message.slice(0,500));server.close();process.exit(1);});
