"use strict";

const assert=require("node:assert");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");

const index=read("index.html");
const sw=read("sw.js");
const links=read("js/reports/201-aceil-report-links.js");
const classicPreview=read("js/reports/091-aceil-pdf-cloud-report.js");
const publicPage=read("js/reports/092-aceil-public-report-page.js");
const mobilePreview=read("js/reports/172-aceil-plan-report-pwa.js");
const vercel=JSON.parse(read("vercel.json"));
const vercelIgnore=read(".vercelignore");
const geometryCore=read("js/core/098-aceil-geometry-core.js");
const honestGeometry=read("js/canvas/190-aceil-honest-geometry.js");
const measureConfidence=read("js/canvas/127-aceil-measure-confidence.js");
const linearElements=read("js/rooms/110-aceil-linear-element.js");
const universalAutocount=read("js/nomenclature/140-aceil-universal-autocount.js");
const autocountMenu=read("js/nomenclature/170-aceil-autocount-menu.js");
const roomFlow=read("js/rooms/087-aceil-multiroom-simple-flow.js");
const wallUi=read("js/rooms/044-aceil-cockpit-tools-wall-modal-normalize.js")+read("js/canvas/045-aceil-wall-full-side-color-presets.js");
const pendingSync=read("js/projects/032-aceil-pending-sync-queue.js");
const accessClean=read("js/admin/159-aceil-access-clean.js");

assert.match(links,/new Uint8Array\(10\)/,"new report URLs must retain 80 random bits");
assert.match(links,/function expandCompactToken\(/,"short report tokens must expand to the existing server format");
assert.match(links,/value \+ value \+ value \+ value\.slice\(0, 4\)/,"20-hex report tokens must expand deterministically to 64 hex characters");
assert.match(links,/compactToken\(value\)/,"stored compatible tokens must return to the short public URL");
assert.match(links,/https:\/\/a-ceil\.pp\.ua\/r\//,"new public reports must use the compact /r/ route");
assert.match(publicPage,/\(\?:r\|report\)/,"both compact and legacy public report routes must remain readable");
assert.match(publicPage,/p_token: lookupToken/,"public report lookup must expand a short URL token before the RPC call");
assert.match(publicPage,/data\.presentation === "generated-report" && data\.image/,"public links must prefer the exact generated report over a mobile reconstruction");

assert.match(mobilePreview,/function useInAppReport\(/,"mobile Safari and PWA must share the in-app report path");
assert.match(mobilePreview,/structured\.drawing=window\.A_CEIL_cloudPlanImage\(canvas\)/,"mobile cloud report must carry its structured plan drawing");
assert.match(mobilePreview,/publishPayload\(payload,\{projectId:activeProjectReference\(\)\}\)/,"mobile report must publish against the active project ID");
assert.match(mobilePreview,/presentation:"generated-report"/,"mobile links must request the approved generated report view");
assert.match(mobilePreview,/payload\.image=dataUrl\|\|canvas\.toDataURL/,"mobile links must carry the exact generated report image");
assert.match(classicPreview,/presentation:"generated-report"/,"classic links must request the approved generated report view");
assert.match(classicPreview,/payload\.image=r\.previewImage\|\|r\.canvas\.toDataURL/,"classic links must carry the exact generated report image");
assert.match(links,/optimized\.presentation === "generated-report" && optimized\.image/,"cloud publishing must preserve generated report presentation");
assert.match(links,/delete optimized\.structured/,"generated report links must not fall back to a mobile reconstruction");

assert.match(sw,/function versionedAssetResponse\(/,"versioned JS/CSS must use the runtime cache");
assert.match(pendingSync,/refreshSession\(\)/,"pending project saves must refresh an expired cloud session");
assert.match(pendingSync,/function sendWithRecovery\(/,"pending project saves must retry recoverable cloud failures");
assert.match(pendingSync,/\[1800, 5000, 10000\]/,"saved Safari queues must resume after a normal reload");
assert.match(accessClean,/await flushPendingQueue\(\)/,"opening projects must flush local saves independently of list refresh");
assert.match(accessClean,/if\(!a\)\{a=offlineAccess\(u\)/,"the owner must retain cached access when the access RPC returns no row");
assert.match(index,/032-aceil-pending-sync-queue\.js\?cloudsync=1&v=/,"cloud-sync queue changes must bypass stale browser caches");
assert.match(index,/159-aceil-access-clean\.js\?cloudsync=1&v=/,"project refresh changes must bypass stale browser caches");
assert.match(sw,/const cached=await cache\.match\(request\);\s*if\(cached\)return cached;/,"versioned assets must be cache-first");
assert.doesNotMatch(sw,/src\|href.+exec\(html\)/,"service-worker install must not parse and prefetch every runtime script");
assert.match(sw,/CORE_SHELL=/,"service-worker install must still keep an offline shell");

const headerSources=(vercel.headers||[]).map(item=>item.source);
assert(headerSources.includes("/js/(.*)"),"Vercel must mark versioned JavaScript as immutable");
assert(headerSources.includes("/assets/(.*)"),"Vercel must mark versioned assets as immutable");
assert.match(vercelIgnore,/^\/verification\*\.json$/m,"local browser-test results must stay outside deployment");
assert.match(vercelIgnore,/^\/review-\*\.png$/m,"local review screenshots must stay outside deployment");

assert.match(links,/backgroundSafe/,"popup publishing must keep Safari's background-safe path");
assert.match(links,/withTimeout\(client\.rpc/,"cloud publishing must have a finite timeout");
assert.doesNotMatch(links,/await\s+new Promise\([^)]*requestAnimationFrame/s,"cloud publishing must not pause on a background-tab animation frame");

assert.match(geometryCore,/Object\.freeze\(\{normalizePoints,distance,sideLengths/,
  "geometry core must publish the canonical distance calculation");
assert.match(honestGeometry,/window\["A·CEILGeometry"\]/,
  "room solver must delegate common calculations to the geometry core");
assert.match(honestGeometry,/typeof geometry\.area==="function"/,
  "room solver must use the canonical polygon area");
assert.match(measureConfidence,/window\["A·CEILGeometry"\]/,
  "measurement checks must use the canonical geometry distance");

assert.match(linearElements,/window\.A_CEIL_LinearTypes=Object\.freeze/,
  "linear elements must publish one stable type registry");
assert.match(linearElements,/ids:Object\.freeze\(TYPES\.map/,
  "linear type IDs must be immutable");
assert.match(universalAutocount,/window\.A_CEIL_LinearTypes/,
  "autocount labels must come from the stable linear type registry");
assert.match(autocountMenu,/window\.A_CEIL_LinearTypes/,
  "autocount settings must use the stable linear type registry");

assert.doesNotMatch(roomFlow,/oldOpenReport/,
  "multiroom flow must not add a no-op report wrapper");
assert.doesNotMatch(wallUi,/_prevOpenWallModalForInit/,
  "wall UI initialization must not add a second modal wrapper");

const versions=[...index.matchAll(/(?:src|href)="[^"]+\.(?:js|css)\?v=([^"]+)"/g)].map(match=>match[1]);
assert(versions.length>150,"runtime asset list unexpectedly shrank");
assert.strictEqual(new Set(versions).size,1,"all runtime assets must share one build ID");
assert.strictEqual(versions[0],"20261027-report-direct1","unexpected stability build ID");

console.log("Stability regression tests: OK");
