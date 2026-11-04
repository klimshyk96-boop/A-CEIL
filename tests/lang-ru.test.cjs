const assert=require('assert'),fs=require('fs'),vm=require('vm');
function load(f){let D;const w={ACEIL:{i18n:{register:(l,d)=>{D=d}}}};vm.runInNewContext(fs.readFileSync(f,'utf8').replace(/A·CEIL/g,'ACEIL'),{window:w,ACEIL:w.ACEIL});return D}
const pl=load('js/i18n/016-aceil-lang-pl.js'),ru=load('js/i18n/017-aceil-lang-ru.js');
const missing=Object.keys(pl.strings).filter(k=>!(k in ru.strings));
assert.strictEqual(missing.length,0,'ru dictionary lacks keys present in pl: '+missing.slice(0,5).join(' | '));
const ukr=Object.entries(ru.strings).filter(([,v])=>/[іїєґІЇЄҐ]/.test(v));
assert.strictEqual(ukr.length,0,'Ukrainian-only letters left in ru values: '+ukr.slice(0,3).map(x=>x[0]).join(' | '));
assert.ok(ru.patterns.length>=pl.patterns.length,'dynamic Russian strings must be covered');
const core=fs.readFileSync('js/i18n/013-aceil-i18n-core.js','utf8');
assert.match(core,/SUPPORTED=\["uk","en","pl","ru"\]/);
assert.match(fs.readFileSync('js/i18n/117-aceil-lang-switchers.js','utf8'),/\["ru","/);
assert.match(fs.readFileSync('index.html','utf8'),/data-lang="ru"/,'login screen must offer Russian');
console.log('PASS Russian language dictionary, switchers and login menu');
