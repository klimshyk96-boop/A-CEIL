#!/usr/bin/env python3
"""Deployment gate: asset completeness, script order, inline syntax, one renderer."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
class Index(HTMLParser):
    def __init__(self):
        super().__init__(); self.scripts=[]; self.styles=[]; self.inline=[]; self.current=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='script':
            if 'src' in a:self.scripts.append(a['src'].split('?')[0])
            else:self.current=''
        if tag=='link' and a.get('rel')=='stylesheet':self.styles.append(a['href'].split('?')[0])
    def handle_data(self,data):
        if self.current is not None:self.current+=data
    def handle_endtag(self,tag):
        if tag=='script' and self.current is not None:
            self.inline.append(self.current);self.current=None

page=Index();page.feed((ROOT/'index.html').read_text())
errors=[]
local=[x for x in page.scripts if not re.match(r'(?:https?:)?//',x)]
for name in local+page.styles:
    if not (ROOT/name).is_file():errors.append('Missing asset: '+name)
if len(set(local))!=len(local):errors.append('Duplicate script inclusion')
expected=json.loads((ROOT/'scripts/runtime-order.json').read_text())
if local!=expected:errors.append('Script order changed: review dependencies, then update scripts/runtime-order.json')
for i,body in enumerate(page.inline):
    check=subprocess.run(['node','--check'],input=body,text=True,capture_output=True)
    if check.returncode:errors.append('Inline script %d: %s'%(i,check.stderr))
# Explicit opt-in for dynamically loaded language dictionaries. Still verify
# existence and a literal reference from the language loader; never turn this
# into a generic unused-script bypass.
on_demand={
    'js/i18n/015-aceil-lang-en.js',
    'js/i18n/016-aceil-lang-pl.js',
    'js/i18n/017-aceil-lang-ru.js',
    'js/admin/166-aceil-admin.js'
}
loaders={
    'js/i18n/015-aceil-lang-en.js':'js/i18n/013-aceil-i18n-core.js',
    'js/i18n/016-aceil-lang-pl.js':'js/i18n/013-aceil-i18n-core.js',
    'js/i18n/017-aceil-lang-ru.js':'js/i18n/013-aceil-i18n-core.js',
    'js/admin/166-aceil-admin.js':'js/admin/166-aceil-admin-loader.js'
}
for name in on_demand:
    if not (ROOT/name).is_file():errors.append('Missing lazy script: '+name)
    if name not in (ROOT/loaders[name]).read_text():errors.append('Lazy script not declared in loader: '+name)
    if name in local:errors.append('Lazy script must not block initial HTML: '+name)
for f in (ROOT/'js').rglob('*.js'):
    name=f.relative_to(ROOT).as_posix()
    if name not in local and name not in on_demand:
        errors.append('Unreferenced JS: '+name)
    if re.search(r'\bwindow\.draw\s*=(?!=)',f.read_text()):errors.append('Do not wrap draw(): '+name)
if errors:
    print('\n'.join(errors));sys.exit(1)
print('Runtime OK: %d local scripts, %d stylesheets, %d inline scripts; order verified.'%(len(local),len(page.styles),len(page.inline)))
