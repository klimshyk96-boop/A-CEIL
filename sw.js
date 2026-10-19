/* A·CEIL offline shell — fast activation and versioned runtime cache, 2026-10-16 */
"use strict";

const BUILD_ID="20261019-curve-segments-test4";
const SHELL_CACHE="aceil-shell-20261019-curve-segments-test4";
const STATIC_DESTINATIONS=new Set(["script","style","image","font"]);
const CORE_SHELL=[
  "/index.html",
  "/assets/app.css?v="+BUILD_ID,
  "/assets/theme.css?v="+BUILD_ID,
  "/assets/layout.css?v="+BUILD_ID
];

function isStaticAsset(request){
  if(STATIC_DESTINATIONS.has(request.destination))return true;
  try{return /\.(?:js|css|png|jpe?g|webp|svg|gif|woff2?|ttf)$/i.test(new URL(request.url).pathname)}catch(_){return false}
}

function isVersionedLocalAsset(request){
  try{
    const url=new URL(request.url);
    return url.origin===self.location.origin&&url.searchParams.has("v")&&/\.(?:js|css)$/i.test(url.pathname);
  }catch(_){return false}
}

async function putIfUsable(cache,request,response){
  if(response&&(response.ok||response.type==="opaque")){
    try{await cache.put(request,response.clone())}catch(_){/* Cache quota must not break the app. */}
  }
  return response;
}

async function precacheCoreShell(){
  const cache=await caches.open(SHELL_CACHE);
  await Promise.all(CORE_SHELL.map(async url=>{
    const request=new Request(url,{cache:"reload"});
    const response=await fetch(request);
    await putIfUsable(cache,request,response);
  }));
}

self.addEventListener("install",event=>{
  /* Do not block an update on downloading all 159 scripts. The versioned files
     fill this cache during the first controlled load. */
  event.waitUntil(precacheCoreShell().then(()=>self.skipWaiting()));
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
    return await cache.match("/index.html")||Response.error();
  }
}

async function versionedAssetResponse(request){
  const cache=await caches.open(SHELL_CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  return putIfUsable(cache,request,response);
}

async function ordinaryAssetResponse(request){
  try{
    const response=await Promise.race([
      fetch(request),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error("asset timeout")),2500))
    ]);
    const cache=await caches.open(SHELL_CACHE);
    return await putIfUsable(cache,request,response);
  }catch(_){return await caches.match(request)||Response.error()}
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;

  if(request.mode==="navigate"){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(!isStaticAsset(request))return;
  event.respondWith(isVersionedLocalAsset(request)?versionedAssetResponse(request):ordinaryAssetResponse(request));
});
