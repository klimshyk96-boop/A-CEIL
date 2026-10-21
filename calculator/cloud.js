(function(root){
 'use strict';
 const endpoint="https://twuvpnxkfmpbzoprcgyd.supabase.co/rest/v1/rpc/aceil_get_client_calculator",anonKey="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dXZwbnhrZm1wYnpvcHJjZ3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTA4ODAsImV4cCI6MjA5NzQ2Njg4MH0.UjdmQ2_bhwDEOpo8sCsf4kxVIwp1avrvt-xpVp6j2uk";
 function token(id){if(!/^[a-f0-9]{32}$/.test(String(id||'')))throw Error('Посилання на калькулятор пошкоджено.');return id;}
 async function read(id){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:anonKey},body:JSON.stringify({p_token:token(id)}),cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Не вдалося отримати актуальний прайс. Спробуйте ще раз або зверніться до менеджера.');
  const data=await response.json();if(!data)throw Error('Цей калькулятор недоступний. Попросіть менеджера перевірити посилання.');
  return root.ACEILClientCalc.config(data);
 }
 async function publish(client,catalog){
  if(!client?.rpc)throw Error('Для публікації увійдіть у A·CEIL з інтернетом.');
  const clean=root.ACEILClientCalc.config(catalog);let response,timer;
  try{response=await Promise.race([client.rpc('aceil_save_client_calculator',{p_config:clean}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Не вдалося підтвердити публікацію. Перевірте інтернет і спробуйте ще раз.')),10000);})]);}finally{clearTimeout(timer);}
  if(response.error)throw Error(response.error.code==='PGRST202'?'Хмарне посилання ще не ввімкнено на сервері. Прайс збережений локально.':'Не вдалося підтвердити публікацію прайсу. Спробуйте ще раз.');
  return token(response.data);
 }
 function link(base,id,state){const url=new URL('/calculator/',base);url.searchParams.set('c',token(id));if(state)url.hash=root.ACEILClientCalc.encode({state});return url.href;}
 root.ACEILClientCloud=Object.freeze({read,publish,link});
})(window);
