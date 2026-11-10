/* A·CEIL: phone contact collection after e-mail or Google sign-in.
 * Contact-only metadata: this is NOT a verified login phone or an SMS credential.
 */
(function(){
  "use strict";
  var client=null, busy=false, requestId=0, currentId=null, installed=false;
  var overlayId="aceil-contact-phone-gate";

  function offline(){
    return !navigator.onLine || window.__A_CEIL_OFFLINE_ACTIVE===true ||
      (typeof A_CEIL_isPreviewHost==="function" && A_CEIL_isPreviewHost());
  }
  function isOwner(user){
    return String(user&&user.email||"").trim().toLowerCase()==="klimshyk96@gmail.com";
  }
  function phoneFrom(user){
    return String(user&&user.user_metadata&&user.user_metadata.contact_phone||"").trim();
  }
  function normalizePhone(input){
    var s=String(input||"").trim().replace(/[\s().-]/g,"");
    if(/^0\d{9}$/.test(s))s="+38"+s;
    else if(/^380\d{9}$/.test(s))s="+"+s;
    else if(/^\d{9}$/.test(s))s="+380"+s;
    else if(/^\d{8,15}$/.test(s))s="+"+s;
    if(!/^\+[1-9]\d{7,14}$/.test(s))return "";
    if(s.startsWith("+380")&&!/^\+380\d{9}$/.test(s))return "";
    return s;
  }
  function close(){
    var node=document.getElementById(overlayId);
    if(node)node.remove();
    currentId=null;
  }
  function show(user){
    if(!user || !user.id || offline() || isOwner(user) || phoneFrom(user)){close();return}
    var existing=document.getElementById(overlayId);
    if(existing && currentId===user.id)return;
    close();currentId=user.id;
    if(!document.body)return;
    var wrap=document.createElement("div");
    wrap.id=overlayId;
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.setAttribute("aria-labelledby","aceil-contact-heading");
    wrap.style.cssText="position:fixed;inset:0;z-index:30001;overflow-y:auto;padding:20px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 0%,#173b77 0%,#081a37 48%,#030b1b 100%);font:inherit;color:#f8fafc";
    wrap.innerHTML='<form id="aceil-contact-phone-form" style="width:min(100%,420px);box-sizing:border-box;background:rgba(14,32,61,.96);border:1px solid rgba(148,163,184,.30);border-radius:24px;padding:26px 22px;box-shadow:0 25px 65px rgba(0,0,0,.42)">'+
      '<div style="font-size:34px;margin-bottom:10px">📞</div>'+
      '<h2 id="aceil-contact-heading" style="font-size:23px;margin:0 0 10px;color:#fff">Ваш контактний номер</h2>'+
      '<p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0 0 16px">Залиште телефон, щоб адміністратор A·CEIL міг зв’язатися з вами щодо реєстрації та активації акаунта.</p>'+
      '<label for="aceil-contact-email" style="display:block;font-size:12px;color:#cbd5e1;margin:0 0 6px">Ваш e-mail</label>'+
      '<input id="aceil-contact-email" type="email" readonly style="width:100%;box-sizing:border-box;border:1px solid #405471;border-radius:12px;padding:12px;background:#14243e;color:#cbd5e1;font-size:15px;margin-bottom:14px">'+
      '<label for="aceil-contact-phone" style="display:block;font-size:12px;color:#cbd5e1;margin-bottom:6px">Номер телефону *</label>'+
      '<input id="aceil-contact-phone" name="contactPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+380 67 123 45 67" required maxlength="30" style="width:100%;box-sizing:border-box;border:1px solid #8aa8dd;border-radius:12px;padding:13px;background:#fff;color:#0f172a;font-size:17px;margin-bottom:8px">'+
      '<p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0 0 15px">Номер використовуватиметься для зв’язку щодо A·CEIL. Підтвердження через SMS наразі немає.</p>'+
      '<p id="aceil-contact-error" role="alert" style="display:none;color:#fda4af;font-size:13px;margin:0 0 12px"></p>'+
      '<button id="aceil-contact-save" type="submit" style="width:100%;border:0;border-radius:13px;background:#2563eb;color:white;padding:14px 16px;font-weight:800;font-size:16px;cursor:pointer">Зберегти номер</button>'+
      '<button id="aceil-contact-logout" type="button" style="width:100%;border:1px solid #475569;border-radius:12px;background:transparent;color:#cbd5e1;margin-top:12px;padding:12px;font-size:14px;cursor:pointer">Вийти з акаунта</button>'+
      '</form>';
    document.body.appendChild(wrap);
    wrap.querySelector("#aceil-contact-email").value=user.email||"";
    wrap.querySelector("#aceil-contact-logout").addEventListener("click",async function(){
      try{await client.auth.signOut()}catch(err){setError("Не вдалося вийти. Спробуйте ще раз.")}
    });
    wrap.querySelector("#aceil-contact-phone-form").addEventListener("submit",save);
    wrap.querySelector("#aceil-contact-phone").focus();
  }
  function setError(message){
    var el=document.getElementById("aceil-contact-error");
    if(el){el.textContent=message;el.style.display="block"}
  }
  async function save(event){
    event.preventDefault();
    if(busy||!client||!currentId)return;
    var box=document.getElementById("aceil-contact-phone");
    var phone=normalizePhone(box&&box.value);
    if(!phone){setError("Введіть коректний номер, наприклад +380 67 123 45 67.");return}
    var button=document.getElementById("aceil-contact-save");
    busy=true;
    if(button){button.disabled=true;button.textContent="Зберігаємо…"}
    try{
      var response=await client.auth.updateUser({data:{contact_phone:phone,contact_phone_updated_at:new Date().toISOString()}});
      if(response.error)throw response.error;
      if(!response.data || !response.data.user || response.data.user.id!==currentId)throw new Error("Не вдалося підтвердити збереження номера");
      if(phoneFrom(response.data.user)!==phone)throw new Error("Номер не збережено");
      close();
    }catch(error){setError("Не вдалося зберегти номер. Перевірте інтернет і повторіть спробу.")}
    finally{busy=false;if(button){button.disabled=false;button.textContent="Зберегти номер"}}
  }
  async function reconcile(){
    if(!client||offline()){close();return}
    var token=++requestId;
    try{
      var res=await client.auth.getUser();
      if(token!==requestId)return;
      if(res.error || !res.data || !res.data.user){close();return}
      var user=res.data.user;
      if(phoneFrom(user)||isOwner(user)){close();return}
      show(user);
    }catch(error){/* Do not interrupt offline or broken authentication flows. */}
  }
  function attach(){
    if(installed)return true;
    if(offline())return false;
    try{client=(typeof _sb!=="undefined"&&_sb)||window._sb||null}catch(error){client=window._sb||null}
    if(!client||!client.auth)return false;
    installed=true;
    client.auth.onAuthStateChange(function(event){
      if(event==="SIGNED_OUT"){requestId++;close();return}
      if(event==="INITIAL_SESSION"||event==="SIGNED_IN"||event==="USER_UPDATED"){
        setTimeout(reconcile,0); // never await Supabase calls inside the auth callback
      }
    });
    setTimeout(reconcile,250);
    window.addEventListener("online",function(){setTimeout(reconcile,700)});
    return true;
  }
  if(!attach()){
    var count=0;
    var timer=setInterval(function(){
      count++;
      if(attach()||count>=60)clearInterval(timer);
    },500);
  }
  window.A_CEIL_ContactPhone={normalizePhone:normalizePhone,reconcile:reconcile};
})();
