'use strict';
/* Real Chromium smoke test, local synthetic assets only (no credentials/cloud). */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {open}=require('./browser-review.cjs');

(async()=>{
  const browser=await chromium.launch({
    headless:true,executablePath:process.env.ACEIL_CHROMIUM_PATH||undefined
  });
  try{
    const requests=[];
    // Register before initial navigation to measure exactly what is fetched.
    const {page,errors,missing}=await open(browser,390,1,undefined,async p=>{
      p.on('request',req=>requests.push(new URL(req.url()).pathname));
    });
    const packs=/\/js\/i18n\/0(?:15|16|17)-aceil-lang-(?:en|pl|ru)\.js$/;
    assert.equal(requests.filter(url=>packs.test(url)).length,0,
      'Default Ukrainian must load zero foreign dictionaries');
    const ua=await page.evaluate(()=>{
      return {
        current:window['A·CEIL'].i18n.getLanguage(),
        title:window['A·CEIL'].i18n.t('Площа'),
        scripts:document.querySelectorAll('script[src]').length,
        canvas:!!document.querySelector('canvas')
      };
    });
    assert.equal(ua.current,'uk');
    assert.equal(ua.title,'Площа');
    assert.equal(ua.scripts,173);
    assert(ua.canvas,'editor remains available before language switch');

    const english=await page.evaluate(async()=>{
      const api=window['A·CEIL'].i18n;
      await Promise.all([api.ensureLanguage('en'),api.ensureLanguage('en')]);
      api.setLanguage('en');
      return {lang:api.getLanguage(),area:api.t('Площа')};
    });
    assert.equal(english.lang,'en');
    assert.equal(english.area,'Area');
    assert.equal(requests.filter(url=>url.includes('015-aceil-lang-en.js')).length,1,
      'Concurrent language choices must fetch one dictionary');

    await page.evaluate(()=>localStorage.setItem('A·CEIL_language','pl'));
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>window['A·CEIL']?.i18n?.t('Зберегти')==='Zapisz',
      {timeout:8000});
    const polish=await page.evaluate(()=>({
      lang:window['A·CEIL'].i18n.getLanguage(),
      translated:window['A·CEIL'].i18n.t('Зберегти'),
      editor:typeof window.draw,
      sync:typeof window.renderProjects
    }));
    assert.equal(polish.lang,'pl');
    assert.equal(polish.translated,'Zapisz');
    assert.equal(polish.editor,'function');
    assert.equal(polish.sync,'function');
    assert.equal(requests.filter(url=>url.includes('017-aceil-lang-ru.js')).length,0);
    assert.equal(missing.length,0,'missing assets: '+missing.join(','));
    assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
    console.log('PASS lazy i18n',JSON.stringify({
      initialScripts:ua.scripts,defaultForeignRequests:0,
      englishRequests:1,savedPolish:polish.lang,
      errors:errors.length,missing:missing.length
    }));
    await page.close();
  }finally{await browser.close();}
})().catch(error=>{console.error('FAIL lazy i18n:',error);process.exitCode=1});
