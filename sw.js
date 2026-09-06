/* A·CEIL offline shell v5 — 2026-09-05 */
"use strict";

const SHELL_CACHE="aceil-shell-20260906-v6";
const STATIC_DESTINATIONS=new Set(["script","style","image","font"]);

function isStaticAsset(request){
  if(STATIC_DESTINATIONS.has(request.destination))return true;
  try{return /\.(?:js|css|png|jpe?g|webp|svg|gif|woff2?|ttf)(?:$|\?)/i.test(new URL(request.url).pathname)}catch(_){return false}
}

async function putIfUsable(cache,request,response){
  if(response&&(response.ok||response.type==="opaque")){
    try{await cache.put(request,response.clone())}catch(_){/* Cache quota must not break the app. */}
  }
  return response;
}

async function precacheAppShell(){
  const cache=await caches.open(SHELL_CACHE);
  const indexRequest=new Request("/index.html",{cache:"reload"});
  const indexResponse=await fetch(indexRequest);
  await putIfUsable(cache,indexRequest,indexResponse);
  await putIfUsable(cache,new Request("/"),indexResponse);

  const html=await indexResponse.clone().text();
  const found=new Set();
  const re=/(?:src|href)="([^"]+)"/g;
  let match;
  while((match=re.exec(html))){
    const raw=match[1];
    if(!raw||raw.startsWith("data:")||raw.startsWith("#"))continue;
    let url;
    try{url=new URL(raw,self.location.origin)}catch(_){continue}
    if(url.origin!==self.location.origin&&!/cdn\.jsdelivr\.net$/i.test(url.hostname))continue;
    if(!/\.(?:js|css)(?:$|\?)/i.test(url.pathname+url.search))continue;
    found.add(url.href);
  }

  await Promise.allSettled(Array.from(found).map(async url=>{
    const request=new Request(url,{cache:"reload",mode:new URL(url).origin===self.location.origin?"same-origin":"no-cors"});
    const response=await fetch(request);
    await putIfUsable(cache,request,response);
  }));
}

self.addEventListener("install",event=>{
  event.waitUntil(precacheAppShell().then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("aceil-shell-")&&key!==SHELL_CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    clients.forEach(client=>client.postMessage({type:"A_CEIL_UPDATE_READY",cache:SHELL_CACHE}));
  })());
});

async function navigationResponse(request){
  const cache=await caches.open(SHELL_CACHE);
  const path=new URL(request.url).pathname;
  const isAppEntry=path==="/"||path==="/index.html";
  try{
    const networkRequest=new Request(request,{cache:"reload"});
    const network=await Promise.race([
      fetch(networkRequest),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("offline timeout")),2500))
    ]);
    if(isAppEntry)await putIfUsable(cache,new Request("/index.html"),network);
    return network;
  }catch(_){
    if(!isAppEntry)return Response.error();
    return await cache.match("/index.html")||await cache.match("/")||Response.error();
  }
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  if(request.mode==="navigate"){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(!isStaticAsset(request))return;
  event.respondWith((async()=>{
    try{
      const networkRequest=new Request(request,{cache:"reload"});
      const response=await Promise.race([
        fetch(networkRequest),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("asset timeout")),2500))
      ]);
      const cache=await caches.open(SHELL_CACHE);
      return await putIfUsable(cache,request,response);
    }catch(_){return await caches.match(request)||Response.error()}
  })());
});
