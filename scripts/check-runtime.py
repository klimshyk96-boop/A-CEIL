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
for f in (ROOT/'js').rglob('*.js'):
    name=f.relative_to(ROOT).as_posix()
    if name not in local:errors.append('Unreferenced JS: '+name)
    if re.search(r'\bwindow\.draw\s*=(?!=)',f.read_text()):errors.append('Do not wrap draw(): '+name)
if errors:
    print('\n'.join(errors));sys.exit(1)
print('Runtime OK: %d local scripts, %d stylesheets, %d inline scripts; order verified.'%(len(local),len(page.styles),len(page.inline)))
