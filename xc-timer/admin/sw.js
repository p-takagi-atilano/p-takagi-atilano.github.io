// Keeps the Race Timing page usable with no signal.
// Network first (3 s timeout) so updates arrive when online; saved copy otherwise.
const CACHE = 'xc-timing-v4';
const FILES = ['timing.html', '../icon.svg', '../icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('xc-timing-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isTiming = /\/admin\/timing\.html$/.test(url.pathname);
  const isIcon = /\/xc-timer\/icon(-192\.png|\.svg)$/.test(url.pathname);
  if (!isTiming && !isIcon) return; // everything else (start list creator, sheet data) goes to the network as usual
  const key = isTiming ? new URL('timing.html', self.registration.scope).href : url.href;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request, { cache: 'no-store' }).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    const timeout = new Promise(r => setTimeout(r, 3000, null));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch {}
    const hit = await cache.match(key);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net; // nothing cached yet: wait for the network
  })());
});
