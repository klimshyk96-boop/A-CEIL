const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const storage=new Map();
const ctx={console,JSON,Date,Number,Object,Array,Promise,String,Math,
 window:{addEventListener(){},dispatchEvent(){}},document:{addEventListener(){},visibilityState:'visible'},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{onLine:true},
 setInterval(){},clearInterval(){},setTimeout(){},clearTimeout(){},CustomEvent:function(){}};
vm.createContext(ctx);vm.runInContext(read('js/nomenclature/213-aceil-film-catalog-sync.js'),ctx);
const api=ctx.window.ACEILFilmCatalogSync;
const doc=(reset,id)=>({v:1,custom:{v:1,series:[{id,name:id,u:10}],colors:[{seriesId:id,code:'M901',cid:id,texture:'mat',u:10}],reserved:[],deleted:{},descorLabellImported:true,teqtumImported:true,teqtumRev:5,...(reset?{catalogReset:reset}:{})},pricing:{}});
const plain=x=>JSON.parse(JSON.stringify(x));
const stale=doc(null,'OLD'),replacement=doc('generation-1','NEW');
assert.deepEqual(plain(api.merge(stale,replacement)),replacement,'old device must adopt the replacement without resurrecting its manufacturers');
const edited=doc('generation-1','MY-NEW');
const merged=plain(api.merge(edited,replacement));
assert.deepEqual(merged.custom.series.map(s=>s.id).sort(),['MY-NEW','NEW']);
assert.equal(merged.custom.catalogReset,'generation-1','normal edits retain the generation token');
const restored=doc('generation-2','RESTORED');
assert.deepEqual(plain(api.merge(merged,restored)),restored,'restore is also authoritative');

(async()=>{
 let local=plain(stale);const writes=[];
 ctx.window._sbUser={id:'recipient'};
 ctx.window.ACEILFilmCatalogStore={readCustom:()=>plain(local.custom),readPricing:()=>plain(local.pricing),writeCustom:data=>{local.custom=plain(data);return true},writePricing:data=>{local.pricing=plain(data);return true}};
 ctx.window._sb={rpc:async(name,args)=>{if(name==='aceil_get_film_catalog')return{data:{uid:'recipient',rev:8,data:plain(replacement)}};writes.push(args);return{data:9}}};
 const status=await api.sync();assert.equal(status.state,'ok');assert.deepEqual(local,replacement);
 assert.equal(writes.length,0,'clean replacement does not need a blind write-back');
 assert.deepEqual(JSON.parse(storage.get('aceil_film_before_replace_recipient')).doc,stale,'local-only old work remains recoverable');
 const sql=read('supabase/migrations/20261102200000_film_catalog_sharing.sql');
 assert.match(sql,/revoke all on public\.aceil_film_catalog_access,public\.aceil_film_catalog_backup from anon,authenticated/);
 assert.match(sql,/auth\.uid\(\)=p_user_id and exists/,'recipient imports require a grant');
 assert.match(sql,/current_data#>>'\{custom,catalogReset\}' is distinct from p_data#>>'\{custom,catalogReset\}'/,'server rejects writes from pre-replacement clients');
 assert.match(sql,/pg_advisory_xact_lock/,'replacement and writes serialize even for a missing row');
 console.log('PASS film sharing: replacement, subsequent edits, restore, stale device, local backup and permission contracts');
})().catch(e=>{console.error(e);process.exitCode=1});
