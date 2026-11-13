/* Non-destructive, explicit iPhone conflict reconciliation.
 * Never guesses the remote revision and never overwrites cloud changes
 * before the owner saves a two-version JSON backup and confirms.
 */
(function(){
"use strict";
if(window.A_CEIL_ConflictResolver)return;
var openInFlight=new Set();
function repo(){return window["A·CEIL"]&&window["A·CEIL"].ProjectRepository}
function entries(){var r=repo();return r?r.list({clone:true}):[]}
function ids(p){return [p&&p.id,p&&p._dbId,p&&p._localId].filter(function(v){return v!=null}).map(String)}
function matches(p,id){return ids(p).indexOf(String(id))>=0}
function project(id){return entries().find(function(p){return matches(p,id)})||null}
function queueFor(p){return (typeof window.getPendingQueue==="function"?window.getPendingQueue():[]).filter(function(op){
  return op&&op.type==="save"&&[op.payload&&op.payload.localId,op.payload&&op.payload.dbId]
    .some(function(x){return x!=null&&ids(p).indexOf(String(x))>=0})
})}
function account(){return {client:window._sb||null,uid:window._sbUser&&String(window._sbUser.id)||""}}
function same(a){var b=account();return a.client===b.client&&a.uid===b.uid&&!!a.uid}
function assertSession(a){if(!same(a))throw new Error("Акаунт змінився. Порівняння скасовано, дані не змінено.")}
function ordered(value){
  if(Array.isArray(value))return value.map(ordered);
  if(value&&typeof value==="object"){
    var out={};Object.keys(value).sort().forEach(function(k){out[k]=ordered(value[k])});return out;
  }
  return value;
}
function parsedState(v){
  try{return typeof v==="string"?JSON.parse(v||"{}"):(v||{})}catch(_){return null}
}
function signature(row){
  if(!row)return "";
  var state=parsedState(row.state);
  if(state===null)return "";
  var result={state:ordered(state)};
  // Canonicalize local inC/outC against the Supabase in_corners/out_corners.
  // Report/CRM metadata is not written by the drawing sync queue.
  ["name","addr","phone","comment","area","per","in_corners","out_corners","thumb"]
    .forEach(function(k){
      var value=k==="in_corners"?(row.in_corners??row.inC):
        k==="out_corners"?(row.out_corners??row.outC):row[k];
      result[k]=String(value??"");
    });
  return JSON.stringify(result);
}
function supportedLocal(p){return p&&p._dbId&&repo()&&typeof window.setPendingQueue==="function"}
async function remoteRecord(a,id){
  assertSession(a);
  if(!a.client||!navigator.onLine)throw new Error("Немає інтернету або входу в хмару");
  var res=await a.client.from("projects").select("*").eq("id",id).eq("user_id",a.uid).single();
  assertSession(a);
  if(res.error||!res.data||res.data.sync_revision==null)
    throw new Error("Хмарний проєкт не знайдено або немає доступу. Локальний не перезаписано.");
  return res.data;
}
function putLocal(p){
  var all=entries(),i=all.findIndex(function(x){return matches(x,p.id)||matches(x,p._dbId)});
  if(i<0)throw new Error("Локальний проєкт уже змінився");
  all[i]=p;repo().replaceAll(all);
}
function cloudBase(remote){
  var sync=window["A·CEIL"]&&window["A·CEIL"].roomSync,st=parsedState(remote.state);
  return st&&Array.isArray(st.rooms)&&sync&&typeof sync.hashes==="function"?sync.hashes(st.rooms):null;
}
function unblocked(p){
  var all=typeof window.getPendingQueue==="function"?window.getPendingQueue():[],
      found=false;
  all.forEach(function(op){
    if(!queueForMatch(op,p))return;
    found=true;delete op._manualConflictRequired;delete op._manualRestoreRequired;
    delete op._lastError;delete op._failures;delete op._lastFailedAt;
  });
  if(!window.setPendingQueue(all))throw new Error("Не вдалося зберегти чергу на пристрої. Локальні правки залишено.");
  if(!found&&typeof window.addToPendingQueue==="function")
    window.addToPendingQueue({type:"save",payload:{localId:p.id,dbId:p._dbId},addedAt:Date.now()});
}
function queueForMatch(op,p){
  return op&&op.type==="save"&&[op.payload&&op.payload.localId,op.payload&&op.payload.dbId]
    .some(function(x){return x!=null&&ids(p).indexOf(String(x))>=0});
}
function removeQueued(p){
  var old=window.getPendingQueue(),next=old.filter(function(op){return !queueForMatch(op,p)});
  if(!window.setPendingQueue(next))throw new Error("Черга не збереглася. Версії залишилися без змін.");
}
function downloadBundle(local,cloud){
  var packageData={
    format:"A-CEIL-sync-conflict-backup-v1",createdAt:new Date().toISOString(),
    warning:"Both drawings preserved. Cloud was not overwritten by this export.",
    localProject:local,cloudProject:cloud,pendingOperations:queueFor(local)
  };
  var blob=new Blob([JSON.stringify(packageData,null,2)],{type:"application/json"}),
    url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="A-CEIL-dvi-versii-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},60000);
  return a.download;
}
function el(tag,text,css){
  var node=document.createElement(tag);if(text!=null)node.textContent=text;
  if(css)node.style.cssText=css;
  return node;
}
function detailOf(local,cloud){
  var a=parsedState(local&&local.state),b=parsedState(cloud&&cloud.state);
  if(!a||!b)return "Не вдалося прочитати одну з версій. Автоматичне узгодження заборонено.";
  var ar=Array.isArray(local&&local.rooms)?local.rooms:Array.isArray(a.rooms)?a.rooms:null,
      br=Array.isArray(b.rooms)?b.rooms:null;
  if(!ar||!br)return "Є відмінності в кресленні або реквізитах. Обидва оригінали залишаються без змін.";
  var dict=new Map(br.filter(Boolean).map(function(room){return[String(room.id),room]}));
  var changed=ar.filter(function(room){
    var other=dict.get(String(room.id));
    return !other||JSON.stringify(ordered(room))!==JSON.stringify(ordered(other));
  }).map(function(room){return String(room.name||"Кімната")});
  br.forEach(function(room){
    if(room&&!ar.some(function(other){return other&&String(other.id)===String(room.id)}))
      changed.push(String(room.name||"Нова кімната")+" (лише в хмарі)");
  });
  return "Кімнат: тут "+ar.length+", у хмарі "+br.length+
    (changed.length?". Відмінності: "+changed.slice(0,3).join(", ")+
      (changed.length>3?" та ще "+(changed.length-3):"")+".":"; креслення кімнат збігаються, перевіряємо реквізити.");
}
function notice(root,message,problem){
  var line=root.querySelector("[data-resolve-status]");
  if(line){line.textContent=message;line.style.color=problem?"#b91c1c":"#166534"}
}
function refreshProjectList(){
  try{if(typeof window.renderProjects==="function")window.renderProjects()}catch(_){}
  try{if(typeof window._updatePendingBadge==="function")window._updatePendingBadge()}catch(_){}
}
async function open(id){
  var local=project(id);
  if(!supportedLocal(local))return false;
  var key=String(local._dbId),host=document.getElementById("aceilSyncRescuePanel");
  if(!host||openInFlight.has(key))return false;
  var accountAtStart=account();if(!accountAtStart.uid||!accountAtStart.client)return false;
  openInFlight.add(key);
  var section=host.querySelector(".aceil-conflict-resolver");
  if(!section){section=el("section");section.className="aceil-conflict-resolver";host.appendChild(section)}
  section.style.cssText="margin-top:10px;padding-top:10px;display:grid;gap:8px;font-size:13px;line-height:1.35;box-sizing:border-box;max-width:100%;min-width:0";
  section.replaceChildren(el("strong","Звіряємо дві версії креслення…"));
  try{
    var cloud=await remoteRecord(accountAtStart,key);
    var localSignature=signature(local),cloudSignature=signature(cloud),equal=!!localSignature&&localSignature===cloudSignature,
      readAt=cloud.sync_revision,downloaded=false;
    section.replaceChildren();
    section.appendChild(el("strong",equal?"✅ Креслення збігаються":"Є відмінності між локальною та хмарною версіями"));
    section.appendChild(el("div","Хмара: ревізія "+readAt+" · Телефон: "+(local._cloudRevision||"без ревізії"),
      "font-size:12px;color:#78350f;overflow-wrap:anywhere"));
    section.appendChild(el("p",equal
      ?"Можна безпечно відновити зв'язок із хмарою: креслення й реквізити вже однакові."
      :"Ревізії відрізняються — це не обов'язково другий пристрій. Перш ніж обирати версію, збережіть резервний JSON.",
      "font-size:13px;line-height:1.45;margin:2px 0"));
    if(!equal)section.appendChild(el("p",detailOf(local,cloud),
      "font-size:12px;color:#78350f;margin:0;overflow-wrap:anywhere"));
    var status=el("div","", "font-size:12px;font-weight:700;line-height:1.4");status.dataset.resolveStatus="1";section.appendChild(status);
    function btn(label){
      var b=el("button",label,"padding:10px 12px;border:1px solid #d97706;border-radius:10px;background:#fff;color:#78350f;font-size:13px;line-height:1.25;font-weight:750;text-align:left;min-height:42px;max-width:100%;white-space:normal");
      b.type="button";section.appendChild(b);return b;
    }
    if(!equal){
      var backup=btn("⬇ Зберегти обидві версії (JSON)");
      backup.onclick=function(){
        try{downloadBundle(local,cloud);downloaded=true;notice(section,"Перевірте збереження JSON у «Файлах» / «Завантаженнях».",false);
          if(mine)mine.hidden=false;if(theirs)theirs.hidden=false;
        catch(e){notice(section,"Помилка завантаження: "+String(e.message||e),true)}
      };
    }
    async function verifyFresh(){
      assertSession(accountAtStart);
      var latest=project(id);
      if(!latest||signature(latest)!==localSignature)
        throw new Error("Локальне креслення змінилося. Звірте версії ще раз.");
      var newest=await remoteRecord(accountAtStart,key);
      if(String(newest.sync_revision)!==String(readAt)||signature(newest)!==cloudSignature)
        throw new Error("Хмарне креслення щойно змінилося. Повторіть перевірку, нічого не перезаписано.");
      return {latest:latest,newest:newest};
    }
    if(equal){
      var equalButton=btn("✅ Підтвердити синхронізацію без перезапису");
      equalButton.onclick=async function(){
        equalButton.disabled=true;
        try{
          var val=await verifyFresh(),p=val.latest;
          p._cloudRevision=String(val.newest.sync_revision);
          var base=cloudBase(val.newest);if(base)p._cloudBase=base;
          removeQueued(p);
          delete p._dirty;delete p._localUpdatedAt;delete p._syncStatus;
          p._cloudSavedAt=Date.now();putLocal(p);
          refreshProjectList();notice(section,"✅ Обидві версії однакові. Конфлікт вирішено без нового запису в хмару.",false);
        }catch(e){notice(section,String(e.message||e),true)}
        finally{equalButton.disabled=false}
      };
    }else{
      var mine=btn("Замінити хмару локальним кресленням");
      var theirs=btn("Замінити локальне креслення хмарним");mine.hidden=true;theirs.hidden=true;
      var resolving=false;
      async function perform(choice,button){
        if(resolving)return;
        if(!downloaded){notice(section,"Спочатку завантажте JSON із двома версіями.",true);return}
        if(typeof window.confirm==="function"&&!window.confirm(choice==="mine"?
          "Ви зберегли JSON із двома версіями? Локальне креслення стане новою хмарною версією, а попередня залишиться лише у файлі резерву.":
          "Ви зберегли JSON із двома версіями? Локальні зміни буде замінено хмарними. Відновити їх можна з JSON-файлу."))return;
        resolving=true;mine.disabled=true;theirs.disabled=true;
        try{
          var val=await verifyFresh(),p=val.latest;
          if(choice==="mine"){
            p._cloudRevision=String(val.newest.sync_revision);
            var base=cloudBase(val.newest);if(base)p._cloudBase=base;else delete p._cloudBase;
            p._dirty=true;p._syncStatus="pending_update";
            p._localUpdatedAt=Date.now();
            putLocal(p);unblocked(p);
            await window.flushPendingQueue();
            var fresh=project(id);
            // Other projects may still be pending; judge this conflict only by
            // this project's confirmed revision and its own queue.
            if(fresh&&fresh._cloudRevision&&!fresh._dirty&&!queueFor(fresh).length){
              refreshProjectList();notice(section,"✅ Ваше креслення підтверджено в хмарі. Конфлікт усунуто.",false);
            }else{
              refreshProjectList();notice(section,"Хмара ще не підтвердила запис. Локальні правки збережені; повторно перевірте конфлікт.",true);
            }
          }else{
            var r=val.newest,st=parsedState(r.state);
            if(st===null)throw new Error("Хмарне креслення не вдалося прочитати");
            ["name","addr","phone","comment","area","per","in_corners","out_corners",
              "thumb","order_source","deal_status","report_token","report_published_at","report_expires_at"]
              .forEach(function(k){p[k]=r[k]});
            p.state=JSON.stringify(st);
            if(Array.isArray(st.rooms)){p.rooms=st.rooms;p.multiRoom=true}else{delete p.rooms;p.multiRoom=false}
            p._comparisonSourceId=st.comparisonSourceId||null;
            p._recoverySourceId=st.recoverySourceId||null;
            p._cloudRevision=String(r.sync_revision);
            var b=cloudBase(r);if(b)p._cloudBase=b;else delete p._cloudBase;
            p._cloudSavedAt=Date.now();
            delete p._dirty;delete p._localUpdatedAt;delete p._syncStatus;
            removeQueued(p);putLocal(p);
            refreshProjectList();
            notice(section,"✅ Хмарну версію відновлено. Закрийте редактор і відкрийте проєкт заново, щоб креслення оновилося.",false);
          }
        }catch(e){notice(section,"Не завершено: "+String(e.message||e),true)}
        finally{resolving=false;mine.disabled=false;theirs.disabled=false}
      }
      mine.onclick=function(){return perform("mine",mine)};
      theirs.onclick=function(){return perform("theirs",theirs)};
    }
    return true;
  }catch(e){
    section.replaceChildren(el("strong","Неможливо звірити: "+String(e.message||e),
      "font-size:13px;color:#b91c1c"));return false;
  }finally{openInFlight.delete(key)}
}
window.A_CEIL_ConflictResolver={open:open,signature:signature};
})();