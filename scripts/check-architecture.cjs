#!/usr/bin/env node
/* Architecture ratchet. The legacy code is built from layers of wrappers (window.X = function(){ ...previous... }).
   This check lets that structure only get SMALLER: it fails when a new wrapper chain appears, an existing chain
   gets another file, or a big file keeps growing. Improvements are reported; lock them in with --update. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),BASE=path.join(__dirname,'architecture-baseline.json'),update=process.argv.includes('--update');
const order=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-order.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const errors=[],notes=[];
const BIG=60*1024,GROWTH=1.05;
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(path.join(root,'js')).filter(f=>f.endsWith('.js')).map(f=>path.relative(root,f).split(path.sep).join('/'));

/* R1 meaningful names */
files.filter(f=>/-inline\.js$/.test(f)).forEach(f=>errors.push('anonymous file name (rename by feature): '+f));
/* R1b naming scheme: NNN-aceil-<purpose>.js, no version tags, in a known domain folder */
const DOMAINS=['core','i18n','auth','admin','projects','rooms','canvas','nomenclature','reports'];
files.forEach(f=>{const parts=f.split('/'),b=parts[parts.length-1];
 if(parts.length!==3||!DOMAINS.includes(parts[1]))errors.push('file outside a domain folder ('+DOMAINS.join('/')+'): '+f);
 if(/^\d{3}-/.test(b)){
  if(!/^\d{3}-aceil-[a-z0-9]+(-[a-z0-9]+)*\.js$/.test(b))errors.push('name must be NNN-aceil-<purpose>.js: '+f);
  if(/(^|-)v\d+(-|\.js$)/.test(b))errors.push('no version tags in file names (use VERSION/build id): '+f);}});
/* R2 unique numeric prefixes */
const nums={};files.forEach(f=>{const m=path.basename(f).match(/^(\d{3})-/);if(m)(nums[m[1]]=nums[m[1]]||[]).push(f);});
Object.entries(nums).filter(([,v])=>v.length>1).forEach(([k,v])=>errors.push('duplicate number '+k+': '+v.join(', ')));
/* R3 no dynamic code */
files.forEach(f=>{if(/(?<![\w.$])eval\s*\(|new\s+Function\s*\(/.test(read(f)))errors.push('eval/new Function in '+f);});
/* R4 every file on disk is loaded, every loaded file exists */
const loaded=new Set(order);files.filter(f=>!loaded.has(f)).forEach(f=>errors.push('file is not loaded by index.html: '+f));
order.filter(f=>!fs.existsSync(path.join(root,f))).forEach(f=>errors.push('missing file: '+f));
/* R5 public API seam present */
if(!order.includes('js/core/225-aceil-public-api.js'))errors.push('public API facade is not loaded');

/* wrapper chains: globals assigned a function (or a variable holding one, e.g. window.X=wrapped) in two or more files */
const re=/window\s*(?:\.\s*([A-Za-z_$\u00b7][\w$\u00b7]*)|\[\s*["']([^"']+)["']\s*\])\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>|(?!(?:true|false|null|undefined|void|new|typeof|window)\b)[A-Za-z_$][\w$]*\s*(?:[;,)}]|\r?\n|$))/g;
const chains={};
for(const f of order){const s=read(f);const seen=new Set();let m;re.lastIndex=0;while((m=re.exec(s))){const n=m[1]||m[2];if(seen.has(n))continue;seen.add(n);(chains[n]=chains[n]||[]).push(f);}}
const multi=Object.fromEntries(Object.entries(chains).filter(([,v])=>v.length>=2));
const big=Object.fromEntries(order.filter(f=>!f.startsWith('vendor/')&&fs.statSync(path.join(root,f)).size>BIG).map(f=>[f,fs.statSync(path.join(root,f)).size]));
/* dynamic wrappers: window[name] = ... (e.g. a forEach over several function names) are invisible to the chain scan above */
const dynRe=/window\s*\[\s*[A-Za-z_$][\w$]*\s*\]\s*=(?!=)/;
const dynamic=order.filter(f=>dynRe.test(read(f)));
const now={chains:multi,bigFiles:big,dynamicAssigners:dynamic};

if(update||!fs.existsSync(BASE)){fs.writeFileSync(BASE,JSON.stringify(now,null,1)+'\n');console.log('architecture baseline written:',Object.keys(multi).length,'chains,',Object.keys(big).length,'big files');}
else{
 const base=JSON.parse(fs.readFileSync(BASE,'utf8'));
 for(const [n,v] of Object.entries(multi)){const b=base.chains[n];
  if(!b)errors.push('new wrapper chain for window.'+n+': '+v.join(' > ')+' (extend the owner file instead of adding a layer)');
  else{const extra=v.filter(f=>!b.includes(f));if(extra.length)errors.push('window.'+n+' got new layer(s): '+extra.join(', '));}}
 for(const f of dynamic)if(!(base.dynamicAssigners||[]).includes(f))errors.push('new dynamic window[name]= assignment in '+f+' (declare a pipeline stage via A\u00b7CEIL.pipeline instead)');
 for(const [n,b] of Object.entries(base.chains)){const v=multi[n]||[];if(v.length<b.length)notes.push('window.'+n+' chain shrank '+b.length+' -> '+v.length);}
 for(const [f,sz] of Object.entries(big)){const b=base.bigFiles[f];if(b===undefined)errors.push('new big file (>'+BIG/1024+' KB): '+f+' '+Math.round(sz/1024)+' KB');else if(sz>b*GROWTH)errors.push('big file grew >5%: '+f+' '+Math.round(b/1024)+' -> '+Math.round(sz/1024)+' KB');}
 if(notes.length)console.log('improvements (run with --update to lock in):\n  '+notes.join('\n  '));
}
const longest=Object.entries(multi).sort((a,b)=>b[1].length-a[1].length).slice(0,3).map(([n,v])=>n+'×'+v.length).join(', ');
if(errors.length){console.error('ARCHITECTURE FAIL ('+errors.length+'):\n - '+errors.join('\n - '));process.exit(1);}
console.log('Architecture OK: '+files.length+' files, '+Object.keys(multi).length+' wrapper chains (longest: '+longest+'), '+Object.keys(big).length+' big files, '+dynamic.length+' dynamic assigners');
