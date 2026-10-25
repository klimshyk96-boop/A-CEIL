const assert=require('node:assert/strict'),fs=require('fs');
const src=fs.readFileSync(__dirname+'/../js/nomenclature/191-aceil-nomenclature-manage-ui.js','utf8');
const need={'selected-cornice-hidden':'Карниз прихований білий','selected-cornice-hidden-wide':'Карниз прихований білий широкий','selected-cornice-single':'Карниз прихований однорядний чорний','selected-cornice-surface':'Карниз накладний ПВХ','selected-cornice-uno':'Карниз UNO білий','selected-cornice-end':'Обрив карнизу UNO'};
for(const key of Object.keys(need)){assert.ok(src.includes('"key": "'+key+'"'),'icon '+key);}
// The real suggestion function, extracted from the module and run on the item names.
const m=src.match(/function suggestedIcon\(item\)\{[\s\S]*?\n  \}\n  function chooseSvgIcon/);assert.ok(m);
const suggestedIcon=new Function(m[0].replace(/\n  function chooseSvgIcon$/,'')+';return suggestedIcon;')();
for(const [key,name] of Object.entries(need))assert.equal(suggestedIcon({name}),key,name);
assert.equal(suggestedIcon({name:'Профіль',source:'hidden_curtain'}),'cornice');
console.log('PASS cornice icons and automatic icon choice by name');
