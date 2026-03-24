const CACHE = 'numfun-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove any old caches from previous versions
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests within this app's scope.
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    try {
      const response = await fetch(e.request);

      if (response.ok && response.type === 'basic') {
        cache.put(e.request, response.clone());
      }

      return response;
    } catch (error) {
      const cached = await cache.match(e.request);
      if (cached) return cached;

      if (e.request.mode === 'navigate') {
        return cache.match('./index.html');
      }

      throw error;
    }
  })());
});
