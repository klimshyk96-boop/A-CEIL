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
assert.match(index,/apple-touch-icon[^>]+aceil-icon-180\.png\?v=20261101-report-film-brand1/);
assert.match(index,/manifest\.webmanifest\?v=20261101-report-film-brand1/);
assert.doesNotMatch(index,/apple-touch-icon[^>]+data:image\/svg/,'iOS must receive a PNG URL, not an embedded SVG');
assert(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.type==='image/png'));
assert(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='maskable'));
assert.match(sw,/aceil-icon-180\.png/);
assert.match(sw,/aceil-icon-maskable-512\.png/);
console.log('PWA icon assets: OK');
