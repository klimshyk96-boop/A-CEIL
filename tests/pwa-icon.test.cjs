const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file));
const text=file=>read(file).toString('utf8');

const expected={
  'assets/pwa/aceil-icon-32.png':32,
  'assets/pwa/aceil-icon-180.png':180,
  'assets/pwa/aceil-icon-192.png':192,
  'assets/pwa/aceil-icon-512.png':512,
  'assets/pwa/aceil-icon-maskable-512.png':512
};
for(const [file,size] of Object.entries(expected)){
  const png=read(file);
  assert.equal(png.subarray(1,4).toString(),'PNG',file+' must be a real PNG');
  assert.equal(png.readUInt32BE(16),size,file+' width');
  assert.equal(png.readUInt32BE(20),size,file+' height');
}

const index=text('index.html'),manifest=JSON.parse(text('manifest.webmanifest')),sw=text('sw.js');
const currentBuild=text('VERSION').trim();
assert.ok(index.includes('aceil-icon-180.png?v='+currentBuild),'iOS icon must use current build id');
assert.ok(index.includes('manifest.webmanifest?v='+currentBuild),'manifest URL must use current build id');
assert.doesNotMatch(index,/apple-touch-icon[^>]+data:image\/svg/,'iOS must receive a PNG URL, not an embedded SVG');
assert(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.type==='image/png'));
assert(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable'));
assert.match(sw,/aceil-icon-180\.png/);
assert.match(sw,/aceil-icon-maskable-512\.png/);
console.log('PWA icon assets: OK');


// Slash-named feature/fix branches must not create a Vercel deployment per
// intermediate commit. In minimatch, "*" does not traverse "/" but "**" does.
const vercel=JSON.parse(text('vercel.json'));
assert.equal(vercel.git.deploymentEnabled['**'],false,
  'globstar disables slash-containing preview branch deploys');
assert.equal(vercel.git.deploymentEnabled.main,true,
  'production deploys from main must remain enabled');

// A single failed optional icon must not trap iOS on the previous PWA
// version. Missing the actual HTML shell is different: keep the old worker.
const vm=require('node:vm');
function simulateInstall(shouldFail,shouldFailStore=()=>false){
  const handlers={};
  const worker={addEventListener(type,callback){handlers[type]=callback},
    skipWaiting:async()=>{}};
  const saved=new Map(),cache={
    put:async(req,res)=>{if(shouldFailStore(req.url))throw new Error('Simulated storage quota');saved.set(req.url,res)},
    match:async req=>saved.get(req.url)
  };
  const context={
    self:worker,
    caches:{open:async()=>cache},
    Request:class{constructor(url){this.url=url}},
    fetch:async(req)=>{
      if(shouldFail(req.url))throw new Error('Simulated offline asset: '+req.url);
      return {ok:true,clone(){return this}};
    },
    setTimeout,clearTimeout,URL,console
  };
  vm.runInNewContext(sw,context);
  const install={waitUntil(promise){this.promise=promise}};
  handlers.install(install);
  return install.promise;
}
(async()=>{
  await simulateInstall(url=>url.includes('aceil-icon-180.png'));
  await assert.rejects(simulateInstall(url=>url==='/index.html'),
    /shell index unavailable/);
  await assert.rejects(simulateInstall(()=>false,url=>url==='/index.html'),
    /shell index unavailable/,
    'a successful HTTP response is not enough if iOS failed to persist the shell');
  console.log('PWA precache recovery and preview branch controls: OK');
})().catch(error=>{console.error(error);process.exitCode=1});
