// UrStudio Offline Service Worker
const CACHE_NAME = 'urstudio-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/svgs/logo and the favicon.svg',
  '/svgs/passport-photo.svg',
  '/svgs/us-passport.svg',
  '/svgs/id.svg',
  '/svgs/pvc-card.svg',
  '/svgs/template.svg',
  '/pdf.worker.min.mjs',
  '/workers/image-processor.worker.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('UrStudio SW: Some assets could not be precached', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension or other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // Stale-while-revalidate for static assets and scripts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, return fallback if available
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
