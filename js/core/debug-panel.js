
(function(){
'use strict';
window.A·CEIL=window.A·CEIL||{};
var MAX=50, KEY='A·CEIL_debug_errors_v2', logs=[], consoleGuard=false, tapCount=0, tapTimer=0;
function now(){try{return new Date().toISOString()}catch(e){return String(Date.now())}}
function redactText(s){return String(s||'').replace(/(access_token|refresh_token|authorization|api[_-]?key)([\"'=:\s]+)([^,}\s\"]+)/gi,'$1$2[REDACTED]').replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,'Bearer [REDACTED]')}
function safe(v){try{return redactText(typeof v==='string'?v:JSON.stringify(v,null,2))}catch(e){return redactText(String(v))}}
function read(){try{var a=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(a))logs=a.slice(-MAX)}catch(e){logs=[]}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(logs.slice(-MAX)))}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
function appMeta(){
 var m={version:(window.A·CEIL&&window.A·CEIL.VERSION)||'?',url:(location.origin+location.pathname),userAgent:navigator.userAgent};
 try{m.projectId=window._activeObjectId||window._currentProjectId||window.currentProjectId||(window.currentProject&&window.currentProject.id)||null}catch(e){window.__diagSilent&&window.__diagSilent(e)}
 try{m.roomId=window._activeRoomId||window.activeRoomId||(window.currentRoom&&window.currentRoom.id)||null}catch(e){window.__diagSilent&&window.__diagSilent(e)}
 try{var repair=window.A·CEIL&&window.A·CEIL.StorageRepair;m.localStorageKB=repair&&repair.storageBytes?Math.round(repair.storageBytes()/1024):Math.round(JSON.stringify(localStorage).length*2/1024)}catch(e){window.__diagSilent&&window.__diagSilent(e)}
 return m;
}
function sourceContext(source,line){
 if(!source||!line||source!==location.href)return '';
 try{
  var html=document.documentElement.outerHTML.split('\n'),start=Math.max(0,line-3),end=Math.min(html.length,line+2),out=[];
  for(var i=start;i<end;i++)out.push((i+1)+': '+html[i]);
  return out.join('\n');
 }catch(e){return ''}
}
function normalize(input){
 var e=input||{}, err=e.error||e.reason||null;
 var message=e.message||(err&&err.message)||safe(err)||'Unknown error';
 var stack=(err&&err.stack)||e.stack||'';
 return {time:now(),type:e.type||'error',message:String(message),source:e.filename||e.source||'',line:Number(e.lineno||e.line||0),column:Number(e.colno||e.column||0),stack:String(stack||''),context:sourceContext(e.filename||e.source,Number(e.lineno||e.line||0)),meta:appMeta()};
}
function isEmptyBrowserNoise(entry){
 if(!entry)return true;
 var msg=String(entry.message||'').trim().toLowerCase();
 var noDetail=!entry.source&&!entry.stack&&!entry.line&&!entry.column;
 return noDetail&&(msg===''||msg==='null'||msg==='undefined'||msg==='unknown error');
}
function add(entry,notify){
 if(isEmptyBrowserNoise(entry))return null;
 logs.push(entry);if(logs.length>MAX)logs.splice(0,logs.length-MAX);persist();render();if(notify!==false)toast(entry);
 try{var dl=window.A·CEIL&&window.A·CEIL.DebugLog;if(dl&&typeof dl.error==='function')dl.error('runtime.error',entry)}catch(e){window.__diagSilent&&window.__diagSilent(e)}
}
function formatOne(x,n){return '#'+n+' '+x.time+'\n'+x.type.toUpperCase()+': '+x.message+'\n'+(x.source?('Source: '+x.source+'\nLine: '+x.line+':'+x.column+'\n'):'')+(x.context?('\nContext:\n'+x.context+'\n'):'')+(x.stack?('\nStack:\n'+x.stack+'\n'):'')+'\nMeta:\n'+safe(x.meta)}
function systemLogs(){try{var d=window.A·CEIL&&window.A·CEIL.DebugLog;return d&&typeof d._all==='function'?d._all():[]}catch(e){return []}}
function techLogs(){try{return typeof window.__diagSilentGetAll==='function'?window.__diagSilentGetAll():[]}catch(e){return []}}
function formatSystem(x){return '['+String(x&&x.timestamp||'')+'] '+String(x&&x.level||'log').toUpperCase()+' · '+String(x&&x.type||'event')+' · '+String(x&&x.operationId||'')+'\n'+safe(x&&x.data)}
function formatTech(x){var t='';try{t=new Date(x&&x.t||0).toISOString()}catch(e){t=String(x&&x.t||'')}return '['+t+'] '+safe(x&&x.m||'')+(x&&x.s?'\n'+safe(x.s):'')}
function allText(){var out=[];out.push('=== ПОМИЛКИ ('+logs.length+') ===\n'+(logs.length?logs.slice().reverse().map(function(x,i){return formatOne(x,logs.length-i)}).join('\n\n--------------------\n\n'):'Помилок ще немає.'));var sys=systemLogs();out.push('\n\n=== СИСТЕМНІ ПОДІЇ ('+sys.length+') ===\n'+(sys.length?sys.slice().reverse().map(formatSystem).join('\n\n'):'Порожньо.'));var tech=techLogs();out.push('\n\n=== ТЕХНІЧНИЙ ЖУРНАЛ ('+tech.length+') ===\n'+(tech.length?tech.slice().reverse().map(formatTech).join('\n\n'):'Порожньо.'));return out.join('')}
function isAuthVisible(){var a=document.getElementById('authScreen');return !!(a&&!a.classList.contains('hidden'))}
function syncFabVisibility(){var f=document.getElementById('rmDebugFab');if(f)f.style.display=isAuthVisible()?'none':'block';if(isAuthVisible())close()}
function bindAuthVisibility(){var a=document.getElementById('authScreen');if(!a)return;try{new MutationObserver(syncFabVisibility).observe(a,{attributes:true,attributeFilter:['class','style']})}catch(e){window.__diagSilent&&window.__diagSilent(e)}}
function ensureUI(){
 if(!document.body)return;
 if(!document.getElementById('rmDebugFab')){var fab=document.createElement('button');fab.id='rmDebugFab';fab.type='button';fab.textContent='🐞';fab.onclick=open;document.body.appendChild(fab)}
 if(!document.getElementById('rmDebugPanel')){var p=document.createElement('div');p.id='rmDebugPanel';p.innerHTML='<div class="rmdbg-card"><div class="rmdbg-head"><div><div class="rmdbg-title">A·CEIL Debug</div><div style="font-size:12px;color:#64748b;font-weight:700">Останні 50 помилок</div></div><button class="rmdbg-close" type="button">×</button></div><div class="rmdbg-meta" id="rmDebugMeta"></div><div class="rmdbg-actions"><button type="button" id="rmDebugCopy">Скопіювати лог</button><button type="button" class="secondary" id="rmDebugClear">Очистити</button></div><pre class="rmdbg-log" id="rmDebugLog"></pre></div>';document.body.appendChild(p);p.querySelector('.rmdbg-close').onclick=close;p.addEventListener('click',function(ev){if(ev.target===p)close()});p.querySelector('#rmDebugCopy').onclick=copy;p.querySelector('#rmDebugClear').onclick=clear}
 if(!document.getElementById('rmDebugToast')){var t=document.createElement('div');t.id='rmDebugToast';t.innerHTML='<b id="rmDebugToastTitle"></b><small id="rmDebugToastText"></small><button type="button">Деталі</button>';t.querySelector('button').onclick=open;document.body.appendChild(t)}
 render();syncFabVisibility();
}
function render(){var log=document.getElementById('rmDebugLog'),meta=document.getElementById('rmDebugMeta');if(log)log.textContent=allText();if(meta){var m=appMeta(),sys=systemLogs(),tech=techLogs();meta.innerHTML='<div>Версія: '+String(m.version)+'</div><div>Логи: '+logs.length+' / '+sys.length+' / '+tech.length+'</div><div>Проєкт: '+String(m.projectId||'—')+'</div><div>Кімната: '+String(m.roomId||'—')+'</div>'}}
function toast(x){ensureUI();if(isAuthVisible())return;var t=document.getElementById('rmDebugToast');if(!t)return;document.getElementById('rmDebugToastTitle').textContent='JS помилка: '+x.message;document.getElementById('rmDebugToastText').textContent=(x.source?x.source.split('/').pop():'сторінка')+(x.line?' · рядок '+x.line+':'+x.column:'');t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(function(){t.classList.remove('show')},9000)}
function open(){ensureUI();if(isAuthVisible())return;document.getElementById('rmDebugPanel').classList.add('open');render()}
function close(){var p=document.getElementById('rmDebugPanel');if(p)p.classList.remove('open')}
function copy(){var text=allText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){try{showToast('Лог скопійовано')}catch(e){alert('Лог скопійовано')}}).catch(function(){fallbackCopy(text)})}else fallbackCopy(text)}
function fallbackCopy(text){var ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(e){window.__diagSilent&&window.__diagSilent(e)}ta.remove();try{showToast('Лог скопійовано')}catch(e){alert('Лог скопійовано')}}
function clear(){logs=[];persist();try{var d=window.A·CEIL&&window.A·CEIL.DebugLog;if(d&&typeof d.clear==='function')d.clear()}catch(e){}try{if(typeof window.__diagSilentClear==='function')window.__diagSilentClear()}catch(e){}render()}
read();
window.addEventListener('error',function(ev){add(normalize(ev),true)},true);
window.addEventListener('unhandledrejection',function(ev){add(normalize({type:'unhandledrejection',reason:ev.reason}),true)},true);
var oldError=console.error;
console.error=function(){try{if(!consoleGuard){consoleGuard=true;add(normalize({type:'console.error',message:Array.prototype.map.call(arguments,safe).join(' ')}),false)}}catch(e){window.__diagSilent&&window.__diagSilent(e)}finally{consoleGuard=false}return oldError&&oldError.apply(console,arguments)};
function bindTripleTap(){document.addEventListener('click',function(ev){var el=ev.target&&ev.target.closest&&ev.target.closest('.app-title,.logo,.brand,[data-A·CEIL-logo],h1');if(!el)return;tapCount++;clearTimeout(tapTimer);tapTimer=setTimeout(function(){tapCount=0},650);if(tapCount>=3){tapCount=0;if(!isAuthVisible())open()}},true)}
window.A·CEIL.DebugPanel={open:open,close:close,copy:copy,clear:clear,getLogs:function(){return logs.slice()},capture:function(err){add(normalize({type:'manual',error:err}),true)}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ensureUI();bindAuthVisibility();bindTripleTap();syncFabVisibility()},{once:true});else{ensureUI();bindAuthVisibility();bindTripleTap();syncFabVisibility()}
})();
