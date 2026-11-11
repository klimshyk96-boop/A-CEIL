const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const admin=fs.readFileSync(path.join(__dirname,'..','js','admin','166-aceil-admin.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const auth=fs.readFileSync(path.join(__dirname,'..','js','auth','033-aceil-supabase-auth-offline-access.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20261111194500_owner_support_contacts.sql'),'utf8');

assert.match(html,/id="aceilSupportPane"/,'admin contacts pane must exist');
assert.match(html,/data-tab="support"/,'owner contacts tab must exist');
assert.match(html,/class="[^"]*\baceil-support-header\b[^"]*"/,'contact entry point in header');
assert.match(html,/class="aceil-auth-help"/,'users can request help before login');
assert.match(auth,/onclick="A_CEIL_Support.open\(\)"/,'expired demos may reach owner');
assert.match(admin,/if\(name==='support'&&cp\)loadSupportEditor\(\)/,'contacts loaded on tab selection');
assert.match(sql,/alter table public.aceil_support_contacts enable row level security/);
assert.match(sql,/revoke all on table public.aceil_support_contacts from public,anon,authenticated/);
assert.match(sql,/grant execute on function public.aceil_support_save\(jsonb\) to authenticated/);

const start=admin.indexOf('/* Editable public support contacts.');
const end=admin.indexOf('function showTab(name,btn){',start);
assert.ok(start>0&&end>start,'support logic must be findable');

let publicData={},savedData=null;
const calls=[];
const fieldsNode={
  innerHTML:'',
  querySelectorAll:()=>[
    {getAttribute:()=> 'phone',value:'+380 123 456 789'},
    {getAttribute:()=> 'telegram',value:'@my_company'},
    {getAttribute:()=> 'note',value:''}
  ]
};
const linksNode={innerHTML:'',textContent:'',isConnected:true};
const nodes={aceilSupportFields:fieldsNode,aceilSupportLinks:linksNode};
const fakeClient={rpc:async(name,args)=>{
  calls.push(name);
  if(name==='aceil_support_public')return {data:publicData,error:null};
  if(name==='aceil_support_save'){savedData=args.p_contacts;return {data:true,error:null}}
  throw Error('Unexpected RPC '+name);
}};
const ctx={
  window:{},
  document:{
    getElementById:id=>nodes[id]||null,
    createElement:()=>({
      id:'',style:{},isConnected:true,innerHTML:'',
      remove(){delete nodes[this.id];this.isConnected=false}
    }),
    body:{appendChild:el=>{nodes[el.id]=el}}
  },
  sb:()=>fakeClient,
  esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  toast:()=>{}, console
};
vm.runInNewContext(admin.slice(start,end),ctx);
const support=ctx.window.A_CEIL_Support;
assert.equal(typeof support.open,'function');
assert.equal(support.link('phone','+380 (67) 123-45-67'),'tel:+380671234567');
assert.equal(support.link('email','help@example.com'),'mailto:help%40example.com');
assert.equal(support.link('telegram','@company'),'https://t.me/company');
assert.equal(support.link('whatsapp','+380671234567'),'https://wa.me/380671234567');
assert.match(support.link('viber','+380671234567'),/^viber:\/\/chat\?number=/);
assert.equal(support.link('facebook','javascript:alert(1)'),'');
assert.equal(support.link('extra_url','data:text/html,evil'),'');
assert.equal(support.link('instagram','https://instagram.com/company'),'https://instagram.com/company');

(async()=>{
  // Owner fields are empty unless owner has explicitly published data.
  ctx.renderSupportFields({});
  assert.match(fieldsNode.innerHTML,/data-support-key="phone"/);
  assert.match(fieldsNode.innerHTML,/data-support-key="instagram"/);
  ctx.renderSupportFields({note:'<img src=x onerror=alert(1)>'});
  assert.doesNotMatch(fieldsNode.innerHTML,/<img src=x onerror/,'owner field HTML must be escaped');
  assert.match(fieldsNode.innerHTML,/&lt;img/);

  await ctx.saveSupportEditor(null);
  assert.deepEqual(JSON.parse(JSON.stringify(savedData)),{
    phone:'+380 123 456 789',telegram:'@my_company',note:''
  });
  assert.ok(calls.includes('aceil_support_save'),'editor persists to Supabase');

  publicData={phone:'+380671234567',telegram:'@company',facebook:'javascript:alert(1)',note:'<script>hacked()</script>'};
  await support.open();
  assert.match(linksNode.innerHTML,/href="tel:\+380671234567"/);
  assert.match(linksNode.innerHTML,/href="https:\/\/t.me\/company"/);
  assert.doesNotMatch(linksNode.innerHTML,/href="javascript:/);
  assert.doesNotMatch(linksNode.innerHTML,/<script>hacked/);
  assert.match(linksNode.innerHTML,/&lt;script&gt;hacked/);

  publicData={};
  await support.open();
  assert.match(linksNode.innerHTML,/ще не додані/);
  console.log('Owner support editor, public links, iPhone actions, XSS safety: OK');
})().catch(e=>{console.error(e);process.exitCode=1});
