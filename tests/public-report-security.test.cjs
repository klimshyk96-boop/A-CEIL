const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.join(__dirname,'..'),token='abcdef0123456789abcdef0123456789';
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});
 try {
  const generator=await browser.newPage();
  await generator.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html><head><meta charset="utf-8"></head><body></body></html>'}));
  await generator.goto('https://aceil.test/');
  await generator.evaluate(()=>{window.pts=[{x:0,y:0},{x:100,y:0},{x:100,y:100}];window._sb={};window._sbUser={id:'review'};window.A_CEIL_ReportLinks={publishPayload:async payload=>{window.testPayload=payload;return 'test'}};});
  await generator.addScriptTag({content:read('js/reports/162-aceil-manager-report.js')});
  await generator.evaluate(()=>A_CEIL_PublishManagerReport());
  const manager=await generator.evaluate(()=>window.testPayload);
  await generator.close();
  async function serve(payload,width=390){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.addInitScript(()=>{
    localStorage.setItem('session-sentinel','private');
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>window.copied=s},configurable:true});
    Object.defineProperty(navigator,'share',{value:async data=>window.shared=data,configurable:true});
   });
   await page.route('**/*',r=>{
    const url=new URL(r.request().url());
    if(url.pathname==='/public.js')return r.fulfill({contentType:'application/javascript',headers,body:read('js/reports/092-aceil-public-report-page.js')});
    if(url.pathname==='/structured.js')return r.fulfill({contentType:'application/javascript',headers,body:read('js/reports/160-aceil-cloud-html-report.js')});
    const fixture=JSON.stringify(payload).replace(/</g,'\\u003c');
    return r.fulfill({contentType:'text/html',headers,body:`<html><head><meta charset="utf-8"></head><body><script>window.SUPABASE_URL='https://fake.supabase.co';window.SUPABASE_ANON='fake';window.supabase={createClient(){return{rpc:async()=>({data:{status:'active',payload:${fixture}}})}}};</script><script src='/structured.js'></script><script src='/public.js'></script></body></html>`});
   });
   await page.goto('https://aceil.test/r/'+token);
   return page;
  }
  for(const width of [390,1440]){
   const page=await serve(manager,width);
   await page.locator('iframe').waitFor();
   const frame=page.frames().find(f=>f!==page.mainFrame());
   await frame.locator('#mdCloud').waitFor({state:'attached'});
   assert.equal(await frame.locator('#mdCloud').isVisible(),false);
   const isolation=await frame.evaluate(()=>{
    let storage=false,parent=false;
    try{localStorage.getItem('session-sentinel');storage=true;}catch(_){}
    try{window.parent.document.body;parent=true;}catch(_){}
    return {storage,parent};
   });
   assert.deepEqual(isolation,{storage:false,parent:false});
   await frame.evaluate(()=>{window.print=()=>window.printed=true;});
   await frame.locator('.md-actions button').first().click();
   assert.equal(await frame.evaluate(()=>window.printed),true);
   await page.getByRole('button',{name:'🔗 Посилання',exact:true}).click();
   assert.equal(await page.getByRole('textbox',{name:'Хмарне посилання'}).inputValue(),'https://aceil.test/r/'+token);
   assert.equal(await page.evaluate(()=>window.copied),'https://aceil.test/r/'+token);
   await page.getByRole('button',{name:'↗ Поділитися',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.shared.url),'https://aceil.test/r/'+token);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.getByRole('button',{name:'← Назад',exact:true}).click();
   await page.waitForURL('https://aceil.test/');
   await page.close();
   console.log('PASS isolated manager report and parent controls '+width+'px');
  }
  for(const structured of [false,true])for(const mapUrl of ["javascript:void(localStorage.setItem('report-xss','executed'))",'data:text/html,test','https://www.google.com/maps/dir/?api=1&destination=50,26']){
   const page=await serve({meta:{name:'Security fixture'},location:{mapUrl},image:'',...(structured?{structured:{rooms:[]}}:{})});
   await page.locator(structured?'.chr-shell':'.rpr-actions').waitFor();
   const route=page.getByRole('link',{name:structured?'🧭 Маршрут':'🧭 Прокласти маршрут',exact:true});
   assert.equal(await route.count(),mapUrl.startsWith('https:')?1:0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('report-xss')),null);
   await page.close();
  }
  console.log('PASS unsafe route schemes blocked; HTTPS route preserved');
  // Exercise the actual vendored SDKs, unlike the editor's offline auth stub.
  const vendor=await browser.newPage();
  await vendor.route('**/*',r=>{
   const url=new URL(r.request().url());
   if(url.pathname.startsWith('/vendor/'))return r.fulfill({contentType:'application/javascript',headers,body:read(url.pathname.slice(1))});
   return r.fulfill({contentType:'text/html',headers,body:'<html><head><meta charset="utf-8"></head><body><script src="/vendor/supabase-js-2.117.3.js"></script><script src="/vendor/jspdf-2.5.2.umd.min.js"></script></body></html>'});
  });
  await vendor.goto('https://aceil.test/');
  assert.deepEqual(await vendor.evaluate(()=>{
   const client=supabase.createClient('https://example.supabase.co','test-key',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const pdf=new jspdf.jsPDF();pdf.text('A-CEIL',10,10);
   return {auth:typeof client.auth.signInWithOAuth,pdf:pdf.output().startsWith('%PDF-')};
  }),{auth:'function',pdf:true});
  await vendor.close();
  console.log('PASS real local Supabase and PDF SDK smoke under CSP');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
