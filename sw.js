/* MomentHub service worker: keeps the app and its photos available without internet. */
const V='momenthub-v1';
const CORE=['./','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
/* The page sends the photo list after it loads; fetch whatever is not cached yet, one at a time. */
self.addEventListener('message',e=>{
  const l=e.data&&e.data.precache;if(!Array.isArray(l))return;
  e.waitUntil(caches.open(V).then(async c=>{for(const u of l){try{if(!(await c.match(u)))await c.add(u)}catch(_){}}}));
});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url),same=u.origin===location.origin,font=/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(!same&&!font)return;
  if(r.mode==='navigate'){
    /* The page: newest version when online (3.5 s limit), saved copy otherwise. */
    const net=fetch(r).then(x=>{if(x.ok){const cp=x.clone();caches.open(V).then(c=>c.put('./',cp))}return x});
    const slow=new Promise((_,rej)=>setTimeout(rej,3500));
    e.respondWith(Promise.race([net,slow]).catch(()=>caches.match('./').then(m=>m||net)));
    return;
  }
  /* Photos, icons, fonts: saved copy first, refreshed in the background. */
  e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{
    const f=fetch(r).then(x=>{if(x&&(x.ok||x.type==='opaque'))c.put(r,x.clone());return x});
    if(m){f.catch(()=>{});return m}
    return f;
  })));
});
