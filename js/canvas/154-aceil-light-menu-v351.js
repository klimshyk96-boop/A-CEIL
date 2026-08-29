
(function(){
'use strict';
if(window.__A·CEILLightMenuV351)return;window.__A·CEILLightMenuV351=true;
var V={mode:'one',qty:5};
function g(id){return document.getElementById(id)}
function visible(el){return el&&!el.classList.contains('rm-lf-hidden')}
function modeNow(){if(visible(g('rmLfGrid')))return'grid';if(visible(g('rmLfRow')))return'row';return'one'}
function qtyForMode(){return V.mode==='one'?1:Math.max(V.mode==='grid'?4:2,Math.min(24,parseInt(V.qty,10)||5))}
function setActionText(){var b=document.querySelector('#lightFlowModal .rm-lf-primary');if(!b)return;b.textContent=V.mode==='one'?'Поставити світильник':(V.mode==='row'?'Створити ряд':'Створити сітку')}
function update(){V.mode=modeNow();var val=g('rmV351Qty');if(val)val.textContent=qtyForMode();var top=g('rmV351Top');if(top)top.style.display=V.mode==='one'?'none':'block';var gp=g('rmV351GridPresets');if(gp)gp.style.display=V.mode==='grid'?'grid':'none';var hint=g('rmV351Hint');if(hint){hint.textContent=V.mode==='row'?'Кількість змінюється кнопками − / +. Напрямок ряду оберіть нижче.':'Оберіть готову структуру або змініть загальну кількість кнопками − / +.';hint.style.display=V.mode==='one'?'none':'block'}setActionText();syncGridActive()}
function syncGridActive(){var gp=g('rmV351GridPresets');if(!gp)return;[].slice.call(gp.querySelectorAll('button')).forEach(function(b){b.classList.toggle('active',Number(b.dataset.q)===Number(V.qty))})}
function ensure(){var m=g('lightFlowModal'),box=m&&m.querySelector('.modal');if(!box)return;var preview=g('rmLfPreview');if(preview&&preview.parentElement)preview.parentElement.classList.add('rm-v351-oldpreview');
 var tabs=g('rmLfTabs');if(!tabs)return;
 if(!g('rmV351Top')){var top=document.createElement('div');top.id='rmV351Top';top.className='rm-v351-top';top.innerHTML='<div class="rm-v351-qtyrow"><div><div class="rm-v351-qtylabel">Кількість світильників</div></div><div class="rm-v351-stepper"><button type="button" onclick="rmV351Step(-1)">−</button><div id="rmV351Qty" class="rm-v351-qval">5</div><button type="button" onclick="rmV351Step(1)">+</button></div></div><div id="rmV351GridPresets" class="rm-v351-gridpresets"><button type="button" data-q="4" onclick="rmV351Grid(4)">2 × 2</button><button type="button" data-q="6" onclick="rmV351Grid(6)">3 × 2</button><button type="button" data-q="8" onclick="rmV351Grid(8)">4 × 2</button><button type="button" data-q="10" onclick="rmV351Grid(10)">5 × 2</button><button type="button" data-q="12" onclick="rmV351Grid(12)">4 × 3</button><button type="button" data-q="15" onclick="rmV351Grid(15)">5 × 3</button></div><div id="rmV351Hint" class="rm-v351-hint"></div>';
   var smart=box.querySelector('.rm-sa-entry');if(smart&&smart.nextSibling)box.insertBefore(top,smart.nextSibling);else tabs.parentNode.insertBefore(top,tabs.nextSibling);
 }
 // Keep Smart Align directly under tabs: it is a placement method, not a preview.
 var smart=box.querySelector('.rm-sa-entry');if(smart&&tabs.nextSibling!==smart)tabs.parentNode.insertBefore(smart,tabs.nextSibling);
 update();}
window.rmV351Step=function(d){V.mode=modeNow();var min=V.mode==='grid'?4:2;V.qty=Math.max(min,Math.min(24,(parseInt(V.qty,10)||min)+d));try{if(typeof rmLfSetQty==='function')rmLfSetQty(V.qty)}catch(_){}update()};
window.rmV351Grid=function(q){V.mode='grid';V.qty=Number(q)||8;try{if(typeof rmLfSetQty==='function')rmLfSetQty(V.qty)}catch(_){}update()};
function wrap(name,after){var old=window[name];if(typeof old!=='function'||old.__v351)return;var fn=function(){var r=old.apply(this,arguments);try{after.apply(this,arguments)}catch(_){}return r};fn.__v351=true;window[name]=fn;}
wrap('rmLfSetMode',function(mode){V.mode=mode||modeNow();if(V.mode==='one')V.qty=1;else if(V.qty<2)V.qty=V.mode==='grid'?8:5;setTimeout(update,0)});
wrap('rmLfSetQty',function(q){V.qty=Math.max(1,parseInt(q,10)||V.qty);setTimeout(update,0)});
var oldOpen=window.openLightFlowModal;if(typeof oldOpen==='function'&&!oldOpen.__v351){var op=function(){var r=oldOpen.apply(this,arguments);setTimeout(ensure,0);return r};op.__v351=true;window.openLightFlowModal=op;try{openLightFlowModal=op}catch(_){}}
var oldSpot=window.rmStartSpotFlow;if(typeof oldSpot==='function'&&!oldSpot.__v351){var sp=function(){var r=oldSpot.apply(this,arguments);setTimeout(ensure,10);return r};sp.__v351=true;window.rmStartSpotFlow=sp;try{rmStartSpotFlow=sp}catch(_){}}
/* v3.52 freeze fix: observe ONLY the modal's own open/close class.
   v3.51 watched the entire document subtree for class mutations; ensure() itself
   changes classes inside the modal, creating a feedback storm on Android. */
var mo=null;
function bindModalObserver(){
  var m=g('lightFlowModal');
  if(!m||m.__rmV352Observed)return;
  m.__rmV352Observed=true;
  try{
    mo=new MutationObserver(function(){if(m.classList.contains('open'))setTimeout(ensure,0)});
    mo.observe(m,{attributes:true,attributeFilter:['class']});
  }catch(_){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bindModalObserver();ensure()},{once:true});
else{bindModalObserver();ensure()}
setTimeout(bindModalObserver,700);
window.A·CEIL_BUILD_LABEL='v3.52 LIGHT-MENU-V2-FREEZE-FIX';
})();
