const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stored=new Map([['A·CEIL_language','ru']]);
let mutation,boot,canvasText;
const attributes={lang:'uk'};
const doc={body:null,readyState:'loading',documentElement:{setAttribute:(k,v)=>attributes[k]=v},addEventListener:(event,fn)=>{if(event==='DOMContentLoaded')boot=fn;},dispatchEvent(){},createTreeWalker:()=>({nextNode:()=>null})};
function Canvas(){}
Canvas.prototype.fillText=Canvas.prototype.strokeText=function(t){canvasText=t;};
Canvas.prototype.measureText=t=>({text:t,width:t.length});
const ctx={document:doc,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},CanvasRenderingContext2D:Canvas,NodeFilter:{SHOW_ELEMENT:1,SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1},MutationObserver:function(fn){mutation=fn;this.observe=()=>{};this.takeRecords=()=>[];},CustomEvent:function(){},setTimeout:fn=>fn(),alert:t=>t,confirm:t=>t,prompt:(t,d)=>[t,d]};
ctx.window=ctx;vm.createContext(ctx);
for(const name of ['013-aceil-i18n-core','014-aceil-lang-uk','015-aceil-lang-en','016-aceil-lang-pl','017-aceil-lang-ru'])vm.runInContext(fs.readFileSync('js/i18n/'+name+'.js','utf8'),ctx);
const api=ctx['A·CEIL'].i18n;
assert.equal(api.getLanguage(),'ru','saved language survives boot');
for(const [input,expected] of [
 ['Погодити кривизну','Подтвердить кривизну'],
 ['Розбіжність на сторонах AB, CD. Різниця до 5 см.','Расхождение на сторонах AB, CD. Разница до 5 см.'],
 ['1 кімната','1 комната'],['2 кімнати','2 комнаты'],['11 кімнат','11 комнат'],['21 кімната','21 комната'],
 ['1 проєкт','1 проект'],['22 проєкти','22 проекта'],['12 проєктів','12 проектов'],
 ['1 груп · 1 позицій','1 группа · 1 позиция'],['2 груп · 5 позицій','2 группы · 5 позиций'],
 ['ЗОВ 16','НАР 16'],['Внутрішні: 4 · Зовнішні: 2','Внутренние: 4 · Наружные: 2'],
 ['Автопрорахунок: перехресть 3 · обривів 4','Автоматический расчёт: пересечений 3 · обрывов 4'],
 ['Плівка / полотно','Плёнка / полотно'],['Середній сірий','Средний серый'],['Архів','Архив'],
 ['Доступ до мого списку плівок','Доступ к моему каталогу плёнок'],
 ['Відновлення пароля','Восстановление пароля'],['Менеджерський звіт','Отчёт менеджера'],
 ['Об’єкт','Объект'],['  Кімната 4  ','  Комната 4  '],
 ['Обрати колір полотна: M303 · Глянець','Выбрать цвет полотна: M303 · Глянец'],
 ['L303 · Глянець · TEQTUM Euro','L303 · Глянец · TEQTUM Euro'],
 ['MSD · 137 кольорів / фактур','MSD · 137 цветов / фактур'],
 ['Ширини полотна','Ширины полотна'],['Обрати','Выбрать'],
 ['Загальна площа','Общая площадь'],['Відкрити план Кімната 1','Открыть план комнаты 1'],
 ['Тест клієнта 123','Тест клієнта 123'],['123,45 ₴','123,45 ₴']
])assert.equal(api.t(input),expected,input);
const canvas=new Canvas();canvas.fillText('Світлова лінія 4');assert.equal(canvasText,'Световая линия 4');
assert.equal(canvas.measureText('Зберегти').text,'Сохранить');
assert.equal(ctx.confirm('Видалити "Тест клієнта"?'),'Удалить "Тест клієнта"?','user names in patterns are preserved');
// Dynamic labels and tooltips are retranslated from their latest source value.
doc.body={nodeType:1,tagName:'BODY',hasAttribute:()=>false};boot();
const text={nodeType:3,nodeValue:'Плівка / полотно'};
mutation([{type:'childList',addedNodes:[text]}]);assert.equal(text.nodeValue,'Плёнка / полотно');
text.nodeValue='Скасувати погодження';mutation([{type:'characterData',target:text}]);assert.equal(text.nodeValue,'Отменить подтверждение');
const attrs={title:'Кривизна підтверджена'};
const el={nodeType:1,tagName:'BUTTON',hasAttribute:k=>k in attrs,getAttribute:k=>attrs[k],setAttribute:(k,v)=>attrs[k]=v};
mutation([{type:'attributes',target:el}]);assert.equal(attrs.title,'Кривизна подтверждена');
api.setLanguage('uk');api.translatePage(text);assert.equal(text.nodeValue,'Скасувати погодження');
api.setLanguage('en');assert.equal(api.t('Зберегти'),'Save');
api.setLanguage('pl');assert.equal(api.t('Зберегти'),'Zapisz');
api.setLanguage('ru');assert.equal(stored.get('A·CEIL_language'),'ru');assert.equal(attributes.lang,'ru');
console.log('PASS language persistence, live text/attributes, canvas, Russian counts, mixed labels and language round trips');
