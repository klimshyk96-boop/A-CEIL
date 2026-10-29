/* Static guards for the 2026-10-21 hardening: they fail if someone reintroduces a CDN script, drops the
   security headers or renders cloud-supplied HTML in the app origin again. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const hdr=JSON.parse(read('vercel.json')).headers.find(h=>h.source==='/(.*)');
assert.ok(hdr,'global security headers rule missing in vercel.json');
const H=Object.fromEntries(hdr.headers.map(h=>[h.key.toLowerCase(),h.value]));
const csp=H['content-security-policy'];assert.ok(csp,'CSP header missing');
for(const d of ["default-src 'self'","object-src 'none'","base-uri 'self'","frame-ancestors 'self'","form-action 'self'"])assert.ok(csp.includes(d),'CSP lacks '+d);
assert.ok(!/script-src[^;]*(https?:|\*|unsafe-eval)/.test(csp),'script-src must not allow remote origins or unsafe-eval');
assert.equal(H['referrer-policy'],'no-referrer');assert.equal(H['x-content-type-options'],'nosniff');
const html=read('index.html');
assert.deepEqual([...html.matchAll(/<script[^>]+src="(https?:)?\/\/[^"]+"/g)].map(m=>m[0]),[],'external <script src> in index.html (vendor it under /vendor)');
const googleOAuth=read('js/auth/178-aceil-google-oauth-canonical.js');
assert.match(googleOAuth,/redirectTo\s*:\s*location\.origin\s*\+\s*location\.pathname/,'Google OAuth must return to the deployment that initiated sign-in');
assert.doesNotMatch(googleOAuth,/redirectTo\s*:\s*["']https:\/\/a-ceil\.pp\.ua/,'preview OAuth must not be pinned to production');
const authRuntime=read('js/auth/033-aceil-supabase-auth-offline-access.js');
assert.match(authRuntime,/\/\\\.vercel\\\.app\$\/i\.test\(String\(location\.hostname/,'local preview mode must be restricted to exact vercel.app hostnames');
assert.match(authRuntime,/id:"preview-local"/,'protected Vercel previews must open in isolated local mode');
const pub=read('js/reports/092-aceil-public-report-page.js');
assert.ok(!/document\.write\s*\(\s*data\./.test(pub),'public report must not document.write cloud HTML');
const sb=pub.match(/setAttribute\("sandbox",\s*"([^"]*)"/);assert.ok(sb,'manager report iframe must have a sandbox attribute');assert.ok(!/allow-same-origin/.test(sb[1]),'manager report sandbox must not allow same origin');
assert.ok(!/cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/.test(fs.readdirSync(path.join(root,'js'),{recursive:true}).filter(f=>f.endsWith('.js')).map(f=>read('js/'+f)).join('\n')),'runtime code loads scripts from a CDN');
console.log('security config: OK');
