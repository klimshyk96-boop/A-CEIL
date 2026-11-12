/* Quote-copy workflow: two independent projects and two immutable public links. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../js/projects/230-aceil-project-archive.js'),'utf8');
const sync=fs.readFileSync(path.join(__dirname,'../js/projects/032-aceil-pending-sync-queue.js'),'utf8');
const auth=fs.readFileSync(path.join(__dirname,'../js/auth/033-aceil-supabase-auth-offline-access.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'../js/admin/159-aceil-access-clean.js'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  let projects=[{id:'original-uuid',_dbId:'original-uuid',_cloudRevision:'3',_ownerId:'user-1',name:'Вітальня',report_token:'a'.repeat(20),report_published_at:'2026-11-11T12:00:00Z',
    rooms:[{id:'r1',name:'Кімната 1',state:JSON.stringify({closed:true,pts:[{x:1},{x:2},{x:3}]}),_aceilVariantsShadow:{links:[{token:'old'}]}}],
    state:JSON.stringify({multiRoom:true,projectType:'apartment',rooms:[{id:'r1',state:'{}'}],report_token:'old'})}];
  const initial=copy(projects),queue=[],copies=[],messages=[],nodes={},writeTexts=[];
  function node(tag){return{tagName:tag||'',style:{},children:[],appendChild(el){this.children.push(el)},replaceChildren(){this.children=[]},setAttribute(){},insertBefore(el){nodes[el.id]=el},querySelectorAll(){return[]}}}
  const parent=node('div'),list=node('div');list.parentNode=parent;nodes.projectsList=list;
  const c={console,Date,Math,JSON,Promise,Map,Set,WeakMap,setTimeout(){return 1},clearTimeout(){},
    crypto:{randomUUID(){return 'copy-uuid'}},
    navigator:{onLine:true,clipboard:{async writeText(v){writeTexts.push(v)}}},
    document:{readyState:'loading',addEventListener(){},getElementById(id){return nodes[id]||null},createElement:node},
    getProjects(){return projects},setProjects(next){projects=copy(next)},showToast(m){messages.push(m)},
    _sb:{},_sbUser:{id:'user-1'},getPendingQueue(){return queue},
    addToPendingQueue(op){queue.push(copy(op))},
    async flushPendingQueue(){
      const index=queue.findIndex(op=>!op._manualConflictRequired&&!op._manualRestoreRequired);
      if(index<0)return false;
      const op=queue.splice(index,1)[0];
      const found=projects.find(p=>p.id===op.payload.localId);
      found._localId=found.id;found.id='new-cloud-uuid';found._dbId='new-cloud-uuid';found._cloudRevision='1';
      delete found._dirty;delete found._localUpdatedAt;delete found._syncStatus;
      return true;
    }};
  c.window=c;c['A·CEIL']={ProjectRepository:{
    upsert(p){projects.push(copy(p));copies.push(copy(p));return p},
    list(){return projects}
  }};
  c.A_CEIL_ReportLinks={
    publicUrl(token){return 'https://a-ceil.pp.ua/r/'+token},
    status(reference){
      const project=projects.find(p=>[p.id,p._dbId,p._localId].some(v=>v!=null&&String(v)===String(reference)));
      if(!project||!project.report_token)return {status:'none',project};
      if(project.report_expires_at&&new Date(project.report_expires_at).getTime()<=Date.now())
        return {status:'expired',project};
      return {status:'active',project,url:'https://a-ceil.pp.ua/r/'+project.report_token};
    }
  };
  vm.createContext(c);vm.runInContext(source,c);
  return{c,initial,projects:()=>projects,replaceProjects(next){projects=copy(next)},queue,copies,messages,nodes,writeTexts};
}
test('independent quote copy never overwrites original or inherits its report links',async()=>{
  const f=fixture(),result=await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid');
  assert.equal(result,'new-cloud-uuid');
  assert.deepEqual(f.projects()[0],f.initial[0],'original drawings and cloud link remain unchanged');
  assert.equal(f.projects().length,2);
  const p=f.projects()[1],raw=JSON.parse(p.state);
  assert.equal(p._dbId,'new-cloud-uuid');
  assert.equal(p._cloudRevision,'1');
  assert.equal(p._comparisonSourceId,'original-uuid');
  assert.equal(raw.comparisonSourceId,'original-uuid');
  assert.equal(raw.multiRoom,true);
  assert.equal(p.name,'Вітальня — Копія');
  assert.equal(p.report_token,undefined,'copy requires its own publication');
  assert.equal(p.calcLinks,undefined);
  assert.equal(p.rooms[0]._aceilVariantsShadow,undefined,'no inherited estimate links');
  assert.equal(f.copies[0]._dbId,undefined,'the inserted copy must start with a new local id');
  assert.equal(f.queue.length,0);
});
test('unsaved and offline projects cannot claim cloud comparison copies',async()=>{
  const f=fixture();f.projects()[0]._dirty=true;
  assert.equal(await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid'),false);
  assert.equal(f.projects().length,1);
  f.projects()[0]._dirty=false;f.c.navigator.onLine=false;
  assert.equal(await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid'),false);
  assert.equal(f.projects().length,1);
});
test('one copy means two visible editable projects, each with its own cloud report link',async()=>{
  const f=fixture(),result=await f.c.A_CEIL_ProjectArchive.copyForQuote('original-uuid');
  assert.equal(result,'new-cloud-uuid');
  const cards=f.c.A_CEIL_ProjectArchive.arrangeQuotePairs(f.projects());
  assert.deepEqual(Array.from(cards,p=>p.id),['original-uuid','new-cloud-uuid']);
  assert.equal(f.nodes.aceilQuotePairPanel,undefined,'no large extra quote panel is created');
  assert.equal(f.c.A_CEIL_ProjectArchive.showPair,undefined,'no extra combined-links button');
  assert.equal(f.projects()[1].report_token,undefined,'copy starts unpublished');
  f.projects()[1].report_token='b'.repeat(20);
  assert.notEqual(f.projects()[0].report_token,f.projects()[1].report_token,
    'original and edited copy keep independent immutable report links');
  assert.doesNotMatch(source,/data-project-quote-links|Два незалежні кошториси/);
  assert.match(source,/copyButton\.textContent=alreadyCopied\?"⧉ Копія":"⧉ Копіювати"/);
  assert.match(source,/render\(\);jumpToProject\(localId\)/,
    'copy becomes a visible card before cloud sync has completed');
});

test('cloud persistence restores lineage and does not share original report identity',()=>{
  assert.match(sync,/state\.comparisonSourceId=String\(local\._comparisonSourceId\)/);
  assert.match(auth,/_comparisonSourceId:stateObj\.comparisonSourceId\|\|null/);
  assert.match(admin,/_comparisonSourceId:st\.comparisonSourceId\|\|null/);
  assert.match(auth,/report_token:p\.report_token\|\|null/);
  assert.match(sync,/sync_revision/);
});

test('pending cloud conflict exposes the real reason and does not blind-retry',async()=>{
  const f=fixture(),p=f.projects()[0];
  p._dirty=true;p._syncStatus='pending_update';
  f.queue.push({type:'save',payload:{localId:'original-uuid',dbId:'original-uuid'},_manualConflictRequired:true,_failures:1,_lastError:'Хмарна ревізія змінилася'});
  const issue=f.c.A_CEIL_ProjectArchive.syncIssue(p);
  assert.equal(issue.blocked,true);
  assert.equal(issue.label,'⚠️ Конфлікт');
  assert.match(issue.description,/Хмарна ревізія/);
  assert.equal(await f.c.A_CEIL_ProjectArchive.retryCloudSave('original-uuid'),false);
  assert.equal(f.queue.length,1,'conflicting edit remains in the queue, never overwritten');
});
test('stuck local project can be rescued as a separate cloud record, original unchanged',async()=>{
  const f=fixture(),p=f.projects()[0];
  p._dirty=true;p._localUpdatedAt=Date.now();p._syncStatus='pending_update';
  f.queue.push({type:'save',payload:{localId:p.id,dbId:p._dbId},_manualConflictRequired:true,_lastError:'Застаріла ревізія'});
  const result=await f.c.A_CEIL_ProjectArchive.rescueCloudCopy(p.id);
  assert.equal(result,'new-cloud-uuid');
  assert.deepEqual(f.projects()[0],Object.assign({},f.initial[0],{
    _dirty:true,_localUpdatedAt:p._localUpdatedAt,_syncStatus:'pending_update'
  }),'source stays unchanged with its conflict intact');
  assert.equal(f.projects().length,2);
  const copy=f.projects()[1],state=JSON.parse(copy.state);
  assert.equal(copy._dbId,'new-cloud-uuid');
  assert.equal(copy._recoverySourceId,'original-uuid');
  assert.equal(state.recoverySourceId,'original-uuid');
  assert.equal(copy._comparisonSourceId,undefined);
  assert.equal(state.comparisonSourceId,undefined);
  assert.equal(copy.report_token,undefined);
  assert.equal(f.queue.length,1,'original conflict queue is preserved after rescue');
  assert.equal(await f.c.A_CEIL_ProjectArchive.rescueCloudCopy('original-uuid'),false,
    'repeat tap must not create a second emergency copy');
  assert.equal(f.projects().length,2);
});
test('cloud recovery lineage survives login, and blocked saves are visibly distinguishable',()=>{
  assert.match(sync,/state\.recoverySourceId=String\(local\._recoverySourceId\)/);
  assert.match(auth,/_recoverySourceId:stateObj\.recoverySourceId\|\|null/);
  assert.match(admin,/_recoverySourceId:st\.recoverySourceId\|\|null/);
  assert.match(source,/syncChip\.textContent=issue\.label/);
  assert.match(source,/syncChip\.onclick=function\(\)\{window\.A_CEIL_ProjectArchive\.syncHelp/);
});

test('two existing cloud copies remain visible adjacent to their original in list order',()=>{
  const f=fixture(),api=f.c.A_CEIL_ProjectArchive;
  const original=f.projects()[0],other={id:'other',name:'Other',state:'{}'};
  const a={id:'copy-a',_dbId:'copy-a',_comparisonSourceId:'original-uuid',name:'Соборна — Безвставочний'};
  const b={id:'copy-b',_dbId:'copy-b',_comparisonSourceId:'original-uuid',name:'Соборна — Безвставочний'};
  const order=api.arrangeQuotePairs([original,other,a,b]);
  assert.deepEqual(Array.from(order,x=>x.id),['original-uuid','copy-a','copy-b','other']);
  assert.equal(new Set(order).size,4);
  assert.deepEqual(Array.from(api.arrangeQuotePairs([a,b,other]),x=>x.id),['copy-a','copy-b','other'],
    'copies without a visible source are still listed');
});

test('second tap reopens existing quote instead of creating a duplicate cloud record',async()=>{
  const f=fixture(),api=f.c.A_CEIL_ProjectArchive;
  const first=await api.copyForQuote('original-uuid');
  assert.equal(first,'new-cloud-uuid');
  const second=await api.copyForQuote('original-uuid');
  assert.equal(second,'new-cloud-uuid');
  assert.equal(f.projects().length,2);
  assert.equal(f.copies.length,1,'never writes a second copy after successful first copy');
  assert(f.messages.some(message=>/Копія вже є/.test(message)));
  assert.equal(await api.copyForQuote('new-cloud-uuid'),'new-cloud-uuid',
    'pressing 2 КП on the copy does not create nested copies');
});

test('two report cards reveal two independent published links or explain what is missing',async()=>{
  const f=fixture(),api=f.c.A_CEIL_ProjectArchive;
  assert.deepEqual(Array.from(api.pairReports(f.projects()[0],f.projects())),[],
    'no paired report strip before an alternative project exists');
  const result=await api.copyForQuote('original-uuid');
  assert.equal(result,'new-cloud-uuid');
  let pair=api.pairReports(f.projects()[0],f.projects());
  assert.equal(pair.length,2,'one object now has original and independent option');
  assert.equal(pair[0].number,1);
  assert.equal(pair[1].number,2);
  assert.equal(pair[0].status,'active');
  assert.equal(pair[0].url,'https://a-ceil.pp.ua/r/'+ 'a'.repeat(20));
  assert.equal(pair[1].status,'none','unpublished copy must be visibly unavailable');
  assert.equal(pair[1].url,'','no guessed or inherited link for an unpublished report');
  assert.deepEqual(Array.from(api.pairReports(f.projects()[1],f.projects())),[],
    'only parent project shows the combined compact strip');
  f.projects()[1].report_token='b'.repeat(20);
  pair=api.pairReports(f.projects()[0],f.projects());
  assert.equal(pair[1].status,'active');
  assert.equal(pair[1].url,'https://a-ceil.pp.ua/r/'+ 'b'.repeat(20));
  assert.notEqual(pair[0].url,pair[1].url,'reports are genuinely independent');
});
test('expired and legacy reports stay distinct; never expose unavailable links',()=>{
  const f=fixture(),api=f.c.A_CEIL_ProjectArchive;
  const origin=f.projects()[0];
  const copy1={id:'copy-1',_dbId:'copy-1',_comparisonSourceId:origin.id,
    name:'Вітальня — Безвставочний',report_token:'b'.repeat(20),
    report_expires_at:'2020-01-01T00:00:00Z'};
  const copy2={id:'copy-2',_dbId:'copy-2',_comparisonSourceId:origin.id,
    name:'Вітальня — Копія',report_token:'c'.repeat(20)};
  const pair=api.pairReports(origin,[origin,copy1,copy2]);
  assert.equal(pair.length,3,'old extra copies remain accessible rather than silently removed');
  assert.equal(pair[0].status,'active');
  // Supply legacy rows through the same project repository so status lookup is realistic.
  f.replaceProjects([origin,copy1,copy2]);
  const states=api.pairReports(origin,f.projects());
  assert.equal(states[1].status,'expired');
  assert.equal(states[1].url,'','expired report must not open');
  assert.equal(states[2].status,'active');
  assert.equal(states[2].url,'https://a-ceil.pp.ua/r/'+ 'c'.repeat(20));
});
test('report buttons use independent URLs and do not recreate removed oversized panel',()=>{
  assert.match(source,/className="aceil-quote-reports"/);
  assert.match(source,/aria-label","Незалежні звіти за об'єктом"/);
  assert.match(source,/open\.href=variant\.url;open\.target="_blank"/);
  assert.match(source,/navigator\.clipboard\.writeText\(variant\.url\)/);
  assert.match(source,/Звіт ще не сформовано/);
  assert.doesNotMatch(source,/aceilQuotePairPanel|data-project-quote-links|Два незалежні кошториси/);
});


test('compact report section limits 5 old copies to 2 tiles and expands without deleting projects',()=>{
  const all=[{id:'source',_dbId:'source',name:'Дім',report_token:'a'.repeat(20)}]
    .concat(Array.from({length:5},(_,index)=>({
      id:'copy-'+index,_dbId:'copy-'+index,_comparisonSourceId:'source',
      name:'Дім — Копія '+(index+1),report_token:null
    })));
  const elements={},screen={cards:[]},search={value:''};
  function element(tag){
    return{
      tagName:tag||'div',style:{},children:[],dataset:{},attrs:{},className:'',textContent:'',
      appendChild(child){this.children.push(child);return child},
      replaceChildren(...children){this.children=children},
      insertBefore(child){this.children.push(child);if(child.id)elements[child.id]=child;return child},
      setAttribute(name,value){this.attrs[name]=value},
      getAttribute(name){return this.attrs[name]||''},
      querySelectorAll(){return[]},
      remove(){this.removed=true},
      querySelector(selector){
        if(selector==='[onclick*="editProject"]')return this.editAction||null;
        if(selector==='.rp-project-actions')return this.actions||null;
        if(selector==='.aceil-quote-reports')
          return this.children.find(child=>child.className==='aceil-quote-reports')||null;
        if(selector==='[data-project-archive]')
          return this.children.find(child=>child.dataset&&child.dataset.projectArchive)||null;
        if(selector==='[data-project-quote-copy]')
          return this.children.find(child=>child.dataset&&child.dataset.projectQuoteCopy)||null;
        return null;
      },
      scrollIntoView(){screen.scrolled=true}
    };
  }
  const listElement=element('div'),parent=element('div');
  listElement.parentNode=parent;elements.projectsList=listElement;elements.projSearch=search;
  const c={Date,Math,JSON,Map,Set,WeakMap,Promise,console,
    navigator:{onLine:true,clipboard:{async writeText(){}}},
    document:{readyState:'complete',createElement:element,
      getElementById(id){return elements[id]||null},
      querySelectorAll(sel){return sel==='#projectsList .rp-project-card'?screen.cards:[]},
      addEventListener(){}},
    setTimeout(){return 0},clearTimeout(){},getProjects(){return all},
    showToast(){},A_CEIL_ReportLinks:{status(id){
      const p=all.find(item=>item.id===id);
      return p&&p.report_token?
        {status:'active',url:'https://a-ceil.pp.ua/r/'+p.report_token}:
        {status:'none'};
    }}
  };
  c.window=c;c['A·CEIL']={ProjectRepository:{list(){return all}}};
  c.renderProjects=function(){
    screen.cards=c.getProjects().filter(p=>p.name.includes(search.value)).map(p=>{
      const card=element('div'),actions=element('div'),edit=element('button');
      edit.attrs.onclick="editProject('"+p.id+"')";
      card.actions=actions;card.editAction=edit;return card;
    });
  };
  vm.createContext(c);vm.runInContext(source,c);
  c.renderProjects();
  function reportGroup(){
    return screen.cards[0]&&screen.cards[0].children.find(child=>child.className==='aceil-quote-reports');
  }
  let group=reportGroup();
  assert(group,'original card must show report group');
  let grid=group.children.find(child=>child.children.length===2);
  assert(grid,'there must be a responsive tile grid');
  assert.equal(grid.children.length,2,'only the original and first alternative are initially visible');
  assert.match(group.children[0].textContent,/6 варіантів/);
  assert.match(group.children[0].textContent,/опубліковано 1/);
  let more=group.children.find(child=>child.className==='aceil-quote-reports-toggle');
  assert(more,'old variants remain accessible using a disclosure control');
  assert.equal(more.textContent,'Показати ще 4');
  assert.equal(more.attrs['aria-expanded'],'false');
  more.onclick();
  group=reportGroup();grid=group.children.find(child=>child.children.length===6);
  assert(grid,'expansion restores all six report options');
  assert.equal(group.children.find(child=>child.className==='aceil-quote-reports-toggle').attrs['aria-expanded'],'true');
  group.children.find(child=>child.className==='aceil-quote-reports-toggle').onclick();
  group=reportGroup();grid=group.children.find(child=>child.children.length===2);
  assert(grid,'collapse removes the extra tiles again');
  assert.equal(all.length,6,'show/hide actions must not mutate the cloud/project collection');
  // Search may hide the source. Jump to its card should clear only the search,
  // and must not require the user to guess which search filter was active.
  search.value='Копія 5';c.renderProjects();
  assert.equal(screen.cards.length,1);
  assert.equal(c.A_CEIL_ProjectArchive.jumpToProject('source'),true);
  assert.equal(search.value,'');
  assert.equal(screen.cards.length,6);
  assert.equal(screen.scrolled,true);
});
