const CACHE = '3d-vehicles-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './lib/three.module.min.js',
  './lib/GLTFLoader.js',
  './utils/BufferGeometryUtils.js',
  './models/ambulance.glb',
  './models/boat.glb',
  './models/coupe.glb',
  './models/crane.glb',
  './models/firetruck.glb',
  './models/hatchback.glb',
  './models/helicopter.glb',
  './models/jeep.glb',
  './models/metro.glb',
  './models/sedan.glb',
  './models/suv.glb',
  './models/tractor.glb',
  './models/train.glb',
  './models/truck.glb',
  './models/van.glb',
  './models/vintage.glb'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
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
