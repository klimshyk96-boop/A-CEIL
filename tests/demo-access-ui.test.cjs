const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const auth=fs.readFileSync(path.join(__dirname,'..','js','auth','033-aceil-supabase-auth-offline-access.js'),'utf8');
const admin=fs.readFileSync(path.join(__dirname,'..','js','admin','166-aceil-admin.js'),'utf8');
const mail=fs.readFileSync(path.join(__dirname,'..','supabase','functions','aceil-registration-mail','index.ts'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20261111185000_one_hour_demo_access.sql'),'utf8');

assert.ok(sql.includes("create policy aceil_active_demo_guard"),'server RLS enforces demo expiry');
assert.ok(sql.includes("as restrictive for all to authenticated"),'policies prevent owner-policy bypass');
assert.ok(sql.includes("demo_expires_at=now()+interval '1 hour'"),'exactly one hour');
assert.ok(sql.includes('where id=v_id and demo_enabled=true and demo_started_at is null'),'first login starts only once');
assert.ok(sql.includes('revoke all on function public.aceil_admin_approve_with_demo'),'admin API is not public');
assert.ok(admin.includes('ДЕМО-доступ на 1 годину'));
assert.ok(admin.includes('A_CEIL_Admin.upgradeDemo('));
assert.ok(admin.includes('aceil_admin_approve_with_demo'));
assert.ok(mail.includes('DEMO-доступ на 1 годину'));
assert.ok(mail.includes('demoResponse?.data?.demo_enabled === true'));
assert.ok(auth.includes('_sb.rpc("aceil_demo_session")'));
assert.ok(auth.includes('A_CEIL_showAccessGate("demo_expired")'));

const start=auth.indexOf('var _aceilDemoClock=null');
const end=auth.indexOf('async function A_CEIL_checkActive(user){');
assert.ok(start>0&&end>start);
const elements={};
const cache=new Map();
const intervals=new Map();let tickId=0;
const gates=[];
function fakeElement(){
  let txt='';
  return {
    id:'',className:'',style:{},children:[],isConnected:false,
    setAttribute(){},appendChild(child){this.children.push(child);child.isConnected=this.isConnected;},
    get textContent(){return txt+this.children.map(c=>c.textContent||'').join('')},
    set textContent(v){txt=String(v)},
    remove(){this.isConnected=false;delete elements[this.id]}
  };
}
const ctx=vm.createContext({
  Date,JSON,Math,Number,String,clearInterval:id=>intervals.delete(id),
  setInterval:(fn)=>{const id=++tickId;intervals.set(id,fn);return id},
  localStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)},
  document:{
    getElementById:id=>elements[id]||null,
    createElement:fakeElement,
    querySelector:()=>null,
    body:{appendChild(el){elements[el.id]=el;el.isConnected=true}}
  },
  A_CEIL_showAccessGate:mode=>gates.push(mode)
});
vm.runInContext(auth.slice(start,end),ctx);
const user={id:'demo-user'};
vm.runInContext('A_CEIL_applyDemoStatus({id:"demo-user"},{mode:"demo_active",remaining_seconds:3600,expires_at:"2099-01-01T00:00:00Z"})',ctx);
assert.ok(elements.aceilDemoBanner,'demo countdown is visible');
assert.match(elements.aceilDemoBanner.textContent,/ДЕМО · залишилось 60:00/);
assert.equal(cache.has('aceil_demo_demo-user'),true);
assert.equal(intervals.size,1,'only one countdown timer');
vm.runInContext('_aceilDemoDeadline=Date.now()-1000',ctx);
Array.from(intervals.values())[0]();
assert.deepEqual(gates,['demo_expired'],'expiration brings up purchase gate');
assert.equal(elements.aceilDemoBanner,undefined);
vm.runInContext('A_CEIL_applyDemoStatus({id:"demo-user"},{mode:"full"})',ctx);
assert.equal(cache.has('aceil_demo_demo-user'),false,'owner conversion removes trial lock');
assert.equal(intervals.size,0);
console.log('DEMO client countdown, expiry, admin approval and mail integration: OK');
