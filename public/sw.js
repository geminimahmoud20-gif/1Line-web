// =============================================================
//  1LINE SOLUTIONS SOHAG - SERVICE WORKER (PWA & OFFLINE RESILIENCE)
// =============================================================

const CACHE_NAME = 'oneline-sohag-v13';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip Firebase/external APIs
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Same-origin only. Cross-origin responses (Firebase, images, fonts, analytics, reCAPTCHA) are
  // never cached below anyway (type !== 'basic'), and proxying them through the worker would put
  // them under the worker's own fetch policy instead of the page's.
  if (url.origin !== self.location.origin) return;

  // Server functions answer live, per-user data (team list, exchange rates…): never cache them
  if (url.pathname.startsWith('/api/')) return;

  // Network-first strategy for navigation (HTML pages) to ensure instant updates
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to keep cache up-to-date
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
