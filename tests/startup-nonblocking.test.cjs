'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();

function attributes(tag){
  return Object.fromEntries([...tag.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)]
    .slice(1).map(m=>[m[1].toLowerCase(),m[2]??m[3]??true]));
}
const scriptTags=[...html.matchAll(/<script\b[^>]*>/gi)].map(m=>attributes(m[0]));
const external=scriptTags.filter(s=>s.src);

test('ordered scripts never block HTML parsing or race each other',()=>{
  assert(external.length>=170,'unexpectedly lost startup modules');
  for(const item of external){
    assert.equal(item.defer,true,'missing defer: '+item.src);
    assert.equal(item.async,undefined,'async breaks ordered global extensions: '+item.src);
    assert.equal(item.type,undefined,'modules change classic-script scoping: '+item.src);
  }
  const expected=JSON.parse(fs.readFileSync(path.join(root,'scripts/runtime-order.json'),'utf8'));
  const locals=external.map(x=>x.src.split('?')[0]).filter(x=>!x.startsWith('https:'));
  assert.deepEqual(locals,expected,'script ordering must not be modified');
});

test('bootstrap and the SW remain safe before deferred modules execute',()=>{
  const early=html.indexOf('id="aceil-theme-bootstrap"');
  const overlay=html.indexOf('id="aceilBootOverlay"');
  assert(early>=0&&early<html.indexOf('</head>'),'theme choice must be synchronous');
  assert(overlay>=0&&overlay<html.indexOf('js/canvas/renderer.js'),'boot overlay precedes renderer');
  assert.match(html,/window\.addEventListener\("load",function\(\)\{\s*var updateKey=/,
    'service worker should register only after deferred startup finishes');
  assert.equal(scriptTags.filter(s=>!s.src).length,5,'new inline parser-time scripts require explicit review');
});

test('iPhone PWA cache IDs are identical and scripts remain versioned',()=>{
  const cache=(sw.match(/const BUILD_ID="([^"]+)"/)||[])[1];
  assert.equal(cache,version);
  assert(external.filter(s=>s.src.startsWith('js/')).every(s=>s.src.includes('v='+version)),
    'all app scripts must update together with the service worker');
});

test('iOS zoom and discoverability are not artificially restricted',()=>{
  const viewport=(html.match(/<meta name="viewport" content="([^"]+)"/)||[])[1]||'';
  assert.match(viewport,/width=device-width/);
  assert.doesNotMatch(viewport,/user-scalable=no|maximum-scale=1/);
  assert.match(html,/<meta name="description" content="[^"]+"/);
  assert.match(html,/<html lang="uk"/);
});
