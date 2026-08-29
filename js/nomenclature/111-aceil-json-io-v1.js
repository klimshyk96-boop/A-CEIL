
/* JSON Export / Import проєктів. Формат самоописовий; імпорт лише додає копії, нічого не перетирає. */
(function(){
  "use strict";
  var FMT='A·CEIL.projects', VER=1;

  function projects(){
    try{
      if(window.A·CEIL.ProjectRepository&&typeof window.A·CEIL.ProjectRepository.list==='function')
        return window.A·CEIL.ProjectRepository.list();
      if(typeof getProjects==='function') return getProjects()||[];
    }catch(_){window.__diagSilent&&window.__diagSilent(_)}
    return [];
  }
  function writeProjects(arr){
    if(window.A·CEIL.ProjectRepository&&typeof window.A·CEIL.ProjectRepository.replaceAll==='function')
      return window.A·CEIL.ProjectRepository.replaceAll(arr);
    if(typeof setProjects==='function') return setProjects(arr);
    throw new Error('Немає сховища проєктів');
  }
  function stamp(){ var d=new Date(),p=function(n){return(n<10?'0':'')+n;};
    return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes()); }

  window.exportProjectsJSON=function(){
    try{
      var list=projects();
      if(!list.length){ if(typeof showToast==='function') showToast('⚠️ Немає проєктів для експорту'); return; }
      var payload={format:FMT,version:VER,exportedAt:new Date().toISOString(),
        appVersion:(window.A·CEIL&&window.A·CEIL.VERSION)||'',count:list.length,projects:list};
      var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='A·CEIL_backup_'+stamp()+'.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ try{URL.revokeObjectURL(url);}catch(_){window.__diagSilent&&window.__diagSilent(_)} },1000);
      if(typeof showToast==='function') showToast('⬇️ Експортовано: '+list.length+' проєктів');
    }catch(e){
      try{ window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.error('json_export_failed',{message:String(e&&e.message||e)}); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(typeof showToast==='function') showToast('⚠️ Не вдалося експортувати');
    }
  };

  /* Валідація + нормалізація. Повертає {ok,projects,error} */
  window.parseProjectsJSON=function(text){
    var data; try{ data=JSON.parse(text); }catch(e){ return {ok:false,error:'Файл не є коректним JSON'}; }
    var list=null;
    if(data&&data.format===FMT&&Array.isArray(data.projects)) list=data.projects;
    else if(Array.isArray(data)) list=data;                        // сирий масив проєктів
    else if(data&&Array.isArray(data.rooms)) list=[data];          // один обʼєкт
    if(!list) return {ok:false,error:'Не схоже на бекап A·CEIL'};
    var out=[];
    for(var i=0;i<list.length;i++){
      var p=list[i];
      if(!p||typeof p!=='object') continue;
      if(typeof p.name!=='string'||!p.name) continue;
      out.push(p);
    }
    if(!out.length) return {ok:false,error:'У файлі немає жодного проєкту'};
    return {ok:true,projects:out,version:data&&data.version||null};
  };

  /* Імпорт — ТІЛЬКИ додавання копій. Наявні проєкти не змінюються і не видаляються. */
  window.importProjectsJSON=function(text){
    var res=window.parseProjectsJSON(text);
    if(!res.ok){ if(typeof showToast==='function') showToast('⚠️ '+res.error); return res; }
    try{
      var cur=projects(), now=Date.now(), added=0;
      var incoming=res.projects.map(function(p,i){
        var c=JSON.parse(JSON.stringify(p));
        delete c._dbId; delete c._localId;                 // не претендуємо на чужі хмарні id
        c.id='imp_'+now+'_'+i;
        c.name=String(c.name)+' (імпорт)';
        c.timestamp=new Date().toISOString();
        c._dirty=true; c._syncStatus='pending_create';
        c._localUpdatedAt=now; c._roomRevision=now;
        added++; return c;
      });
      writeProjects(cur.concat(incoming)); try{window.rmRaiseNomenclature&&window.rmRaiseNomenclature({toast:false});}catch(_){window.__diagSilent&&window.__diagSilent(_)}
      try{ if(typeof renderProjects==='function') renderProjects(); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(typeof showToast==='function') showToast('✅ Імпортовано: '+added+' проєктів');
      return {ok:true,added:added};
    }catch(e){
      try{ window.A·CEIL&&window.A·CEIL.DebugLog&&window.A·CEIL.DebugLog.error('json_import_failed',{message:String(e&&e.message||e)}); }catch(_){window.__diagSilent&&window.__diagSilent(_)}
      if(typeof showToast==='function') showToast('⚠️ Не вдалося імпортувати');
      return {ok:false,error:String(e&&e.message||e)};
    }
  };

  window.pickProjectsJSON=function(){
    var inp=document.getElementById('rmJsonFile');
    if(!inp){
      inp=document.createElement('input');
      inp.type='file'; inp.accept='application/json,.json'; inp.id='rmJsonFile'; inp.style.display='none';
      inp.addEventListener('change',function(){
        var f=inp.files&&inp.files[0]; if(!f) return;
        var fr=new FileReader();
        fr.onload=function(){ window.importProjectsJSON(String(fr.result||'')); inp.value=''; };
        fr.onerror=function(){ if(typeof showToast==='function') showToast('⚠️ Не вдалося прочитати файл'); inp.value=''; };
        fr.readAsText(f);
      });
      document.body.appendChild(inp);
    }
    inp.click();
  };
})();
