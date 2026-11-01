const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const picker=fs.readFileSync(path.join(root,'js/nomenclature/167-aceil-color-picker.js'),'utf8');
const report=fs.readFileSync(path.join(root,'js/reports/037-aceil-report-settings-generator.js'),'utf8');

assert.match(picker,/seriesName:seriesName,textureLabel:textureLabel,label:\[display,textureLabel,seriesName\]/,
  'film material must expose the selected brand/series name');
assert.match(report,/function reportFilmLabel\(material\)/,
  'report must have one canonical film label formatter');
assert.match(report,/\[material\.displayCode\|\|material\.code,material\.textureLabel,material\.seriesName\]/,
  'report color label must contain code, texture and brand');
assert.equal((report.match(/\["Колір стелі",reportFilmLabel\(material\),material\.swatch\]/g)||[]).length,2,
  'single-room and multi-room reports must both print the branded color label');
assert.match(report,/contractorMaterialCard\([^\n]+material&&reportFilmLabel\(material\)/,
  'contractor sheet must use the same branded color label');

console.log('PASS report ceiling color includes Premium/Teqtum/Lumfer brand');
