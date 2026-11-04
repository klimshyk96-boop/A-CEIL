const languageMenuRegression=async function(win){
  const wait=ms=>new Promise(resolve=>win.setTimeout(resolve,ms));
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  const doc=win.document,api=win['A·CEIL'].i18n;
  api.setLanguage('ru');win.openRmLightStart();await wait(400);
  const host=doc.getElementById('rmLightStartModal'),grid=host.querySelector('.rm-ce-grid');
  const title=()=>host.querySelector('.rm-ce-title')?.textContent;
  assert(title()==='Элементы потолка','Russian menu title missing');
  const labels=[...grid.querySelectorAll('.rm-ce-card b')].map(el=>el.textContent);
  let rebuilt=false,untranslated=false;
  const observer=new win.MutationObserver(()=>{
    rebuilt||=host.querySelector('.rm-ce-grid')!==grid;
    untranslated||=title()!=='Элементы потолка';
  });
  observer.observe(host,{childList:true,subtree:true,characterData:true});
  await wait(3200);observer.disconnect();
  assert(!rebuilt&&!untranslated,'Translated menu was rebuilt or reverted to Ukrainian');
  assert(JSON.stringify(labels)===JSON.stringify([...grid.querySelectorAll('.rm-ce-card b')].map(el=>el.textContent)),'Catalogue labels oscillate');
  assert(labels.includes('Световые линии')&&labels.includes('Точечный светильник'),'System labels missing');
  // Reopening and explicit re-rendering must retain the active language.
  win.closeRmLightStart();win.openRmLightStart();await wait(250);
  assert(title()==='Элементы потолка','Reopened menu lost translation');win.closeRmLightStart();
  win.openReportSettings();await wait(180);
  const checkbox=doc.getElementById('rs_diagonals');checkbox.checked=true;checkbox.dispatchEvent(new win.Event('change',{bubbles:true}));
  await wait(80);
  const menu=doc.getElementById('rsDiagInlineMenu'),options=[...menu.querySelectorAll('[data-value]')];
  assert(!menu.hidden,'Diagonal options hidden');
  const bounds=menu.getBoundingClientRect();
  for(const el of [menu.querySelector('.rsdiag-options'),...options]){
    const box=el.getBoundingClientRect();
    assert(box.left>=bounds.left-1&&box.right<=bounds.right+1,'Diagonal buttons overflow their menu');
    assert(el.scrollWidth<=el.clientWidth+1,'Diagonal text overflows');
  }
  assert(doc.querySelector('.rspro-sheet').scrollWidth<=doc.querySelector('.rspro-sheet').clientWidth+1,'Report sheet has horizontal overflow');
  options.find(el=>el.dataset.value==='all').click();
  assert(doc.getElementById('rsDiagMode').value==='all','All diagonals selection failed');
  options.find(el=>el.dataset.value==='manual').click();
  assert(doc.getElementById('rsDiagMode').value==='manual','Measured diagonals selection failed');
  win.closeReportSettings();
  assert(api.t('Розміри стін')==='Размеры стен','Canvas wall title missing');
  return {language:api.getLanguage(),stableForMs:3200,width:win.innerWidth,labels,diagonalOptions:options.map(el=>el.textContent),wallTitle:api.t('Розміри стін')};
};
if(typeof module!=='undefined'&&module.exports){
  module.exports=languageMenuRegression;
  if(require.main===module){
    const {chromium}=require('playwright'),{open,reveal}=require('./browser-review.cjs');
    (async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined});try{
      for(const width of [320,375,390]){const {page,errors}=await open(browser,width);await reveal(page);const result=await page.evaluate('('+languageMenuRegression.toString()+')(window)');if(errors.length)throw Error(errors.join('\n'));console.log('PASS menu stability, diagonal layout and translation: '+JSON.stringify(result));await page.close();}
    }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
  }
}else window.languageMenuRegression=languageMenuRegression;
