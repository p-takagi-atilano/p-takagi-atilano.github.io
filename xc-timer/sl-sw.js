// Offline copy of the public Start list page. Registered quietly when someone taps Download PDF.
// Network first (3 s timeout), saved copy when there's no signal.
const CACHE = 'xc-startlist-v1';
const FILES = [
  'start-list.html', 'icon.svg', 'icon-192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const page = url.origin === location.origin && /\/xc-timer\/start-list\.html$/.test(url.pathname);
  const icon = url.origin === location.origin && /\/xc-timer\/icon(-192\.png|\.svg)$/.test(url.pathname);
  const lib = url.origin === 'https://cdnjs.cloudflare.com' && /\/(jspdf|jspdf-autotable)\//.test(url.pathname);
  if (!page && !icon && !lib) return; // sheet data etc. go straight to the network
  const key = page ? new URL('start-list.html', self.registration.scope.replace(/start-list$/, '')).href : url.href;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    try { const res = await Promise.race([net, new Promise(r => setTimeout(r, 3000, null))]); if (res) return res; } catch {}
    const hit = await cache.match(key);
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});
