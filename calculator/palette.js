(function(){
 'use strict';
 const M=window.ACEILClientCalc,$=id=>document.getElementById(id);let api,texture='',query='';
 function entries(series){return window.ACEIL_COLOR_CATALOG_BY_SERIES?.[series]||[];}
 function selected(){return{filmSeriesId:api.form.elements.filmSeriesId.value,filmCode:api.form.elements.filmCode.value};}
 function select(series,code){api.form.elements.filmSeriesId.value=series;api.form.elements.filmCode.value=code;api.calculate();render();}
 function init(context){
  api=context;if(!api.catalog.filmCatalog)return;
  for(const key of ['filmCode','filmSeriesId']){const input=document.createElement('input');input.type='hidden';input.name=key;api.form.append(input);}
  const button=document.createElement('button');button.type='button';button.id='openFilmPalette';button.className='palette-selection';
  const dialog=document.createElement('dialog');dialog.id='filmPalette';
  const header=document.createElement('div');header.className='palette-head';const title=document.createElement('h2');title.id='paletteTitle';title.textContent='Колір полотна';dialog.setAttribute('aria-labelledby','paletteTitle');
  const close=document.createElement('button');close.type='button';close.className='text-button';close.textContent='Готово';close.onclick=()=>dialog.close();header.append(title,close);
  const filters=document.createElement('div');filters.className='palette-filters';const search=document.createElement('input');search.type='search';search.id='filmColorSearch';search.placeholder='Код або назва кольору';search.setAttribute('aria-label','Пошук кольору');
  search.oninput=()=>{query=search.value.trim().toLocaleLowerCase('uk');render();};const tabs=document.createElement('div');tabs.className='variant-buttons';
  for(const [key,name] of [['','Усі'],['mat','Мат'],['lak','Глянець'],['satin','Сатин']]){const tab=document.createElement('button');tab.type='button';tab.dataset.filmTexture=key;tab.textContent=name;tab.onclick=()=>{texture=key;render();};tabs.append(tab);}
  filters.append(search,tabs);const count=document.createElement('p');count.id='filmColorCount';count.className='hint';count.setAttribute('aria-live','polite');const grid=document.createElement('div');grid.id='filmColorGrid';
  const source=document.createElement('p');source.id='filmColorSource';source.className='hint';source.append('Зразки кольорів: ');const sourceLink=document.createElement('a');sourceLink.href='https://pullsky.com.ua/stretch-ceilings/main-palette/';sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';sourceLink.textContent='PullSky';source.append(sourceLink);dialog.append(header,filters,count,grid,source);document.body.append(dialog);
  button.onclick=()=>{texture='';query='';search.value='';render();dialog.showModal();};$('filmChoices').after(button);
  document.querySelectorAll('[data-film-series]').forEach(b=>{
   const series=b.dataset.filmSeries;b.disabled=!api.catalog.filmCatalog[series]||!entries(series).length;
   b.onclick=()=>{const current=selected().filmCode,code=entries(series).some(e=>e.code===current)?current:entries(series).some(e=>e.code==='M303')?'M303':entries(series)[0]?.code;select(series,code);};
  });
 }
 function defaultSelection(restored){
  if(!api?.catalog.filmCatalog||restored?.filmCode)return;
  const option=api.catalog.options.film?.find(it=>it.id===restored?.filmOption)||api.catalog.options.film?.[0]||api.catalog.items.film,match=String(option?.name||'').match(/\b[MLS]\d{3}\b/),series=M.filmSeries(option||{});
  if(match&&entries(series).some(e=>e.code===match[0])){api.form.elements.filmSeriesId.value=series;api.form.elements.filmCode.value=match[0];}
 }
 function render(){
  if(!api?.catalog.filmCatalog)return;const s=selected(),series=s.filmSeriesId||'premium';$('paletteTitle').textContent=({premium:'Premium',classic:'Classic',kralton:'Kralton'})[series]+' · усі кольори';
  document.querySelectorAll('[data-film-texture]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filmTexture===texture));
  const all=entries(series),filtered=all.filter(e=>(!texture||e.texture===texture)&&(!query||(e.code+' '+(e.colorName||'')+' '+e.label).toLocaleLowerCase('uk').includes(query)));
  $('filmColorSource').hidden=!filtered.some(e=>e.swatchSource==='PullSky');
  $('filmColorCount').textContent='Показано '+filtered.length+' із '+all.length+' кольорів';$('filmColorGrid').replaceChildren();
  for(const e of filtered){const b=document.createElement('button');b.type='button';b.dataset.filmCode=e.code;b.className='palette-color';b.setAttribute('aria-pressed',e.code===s.filmCode);
   if(e.swatch){const swatch=document.createElement('span');swatch.className='palette-swatch';swatch.style.background=e.swatch;swatch.setAttribute('aria-hidden','true');b.append(swatch);}
   const code=document.createElement('b');code.textContent=e.code;const label=document.createElement('small');label.textContent=e.label+(e.colorName?' · '+e.colorName:'');b.append(code,label);
   b.onclick=()=>{select(series,e.code);$('filmPalette').close();};$('filmColorGrid').append(b);
  }
  if(!filtered.length){const empty=document.createElement('p');empty.textContent='За цим запитом кольорів немає.';$('filmColorGrid').append(empty);}
 }
 function sync(s){
  if(!api?.catalog.filmCatalog)return;const item=M.filmSelection(s,api.catalog);
  $('openFilmPalette').textContent=item?item.code+' · '+({mat:'Мат',lak:'Глянець',satin:'Сатин'})[item.texture]+' · змінити колір':'Обрати колір із загальної бази';
  if(s.filmCode){const legacy=api.form.querySelector('[data-product-slot=film]');if(legacy)legacy.hidden=true;document.querySelectorAll('[data-film-series]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.filmSeries===s.filmSeriesId));}
 }
 window.ACEILClientPalette=Object.freeze({init,defaultSelection,sync});
})();
