const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'js/core/229-aceil-theme-selector.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/theme-mode.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

assert.match(index,/aceil-theme-bootstrap/,'theme must be applied before the interface paints');
assert.match(index,/assets\/theme-mode\.css/,'theme styles must be loaded');
assert.match(index,/229-aceil-theme-selector\.js/,'theme selector must be loaded');
assert.match(script,/aceil_ui_theme_v1/,'theme choice must persist locally');
for(const choice of ['light','dark','system'])assert.match(script,new RegExp('data-aceil-theme-choice="'+choice+'"'));
assert.match(script,/prefers-color-scheme: dark/,'system mode must follow the operating system');
assert.match(script,/MutationObserver/,'theme button must survive dynamic header rendering');
assert.match(script,/if\(inserted\)apply\(stored\(\),false\)/,'observer must not trigger an endless DOM update loop');
assert.match(script,/\.rpc-tools \.rpc-logout/,'legacy duplicate logout must be removed from the cockpit tools');
assert.match(css,/\.rpc-tools \.rpc-logout\{display:none!important\}/,'legacy duplicate logout must never leak below Save');
assert.match(css,/#elementsModal input\.em-qty-input\{background:#fff7ed!important/,'nomenclature quantity inputs must stay readable in dark mode');
assert.match(css,/#elementsModal input\.em-price-input\{background:#eff6ff!important/,'nomenclature price inputs must stay readable in dark mode');
assert.match(css,/Neutral dark shell/,'dark theme must use the neutral palette');
assert.match(css,/html\[data-aceil-theme="dark"\] body/,'dark palette must cover the application');
assert.match(css,/canvas#cv/,'drawing canvas must remain readable in dark mode');
assert.match(sw,/theme-mode\.css/,'offline shell must include theme styles');
assert.match(sw,/229-aceil-theme-selector\.js/,'offline shell must include theme logic');

console.log('PASS selectable light/dark/system theme');
