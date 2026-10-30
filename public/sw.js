// =============================================================
//  1LINE SOLUTIONS SOHAG - SERVICE WORKER (PWA & OFFLINE RESILIENCE)
// =============================================================

const CACHE_NAME = 'oneline-sohag-v15';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png'
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

  // Server functions & CRM admin portal: never cache or intercept them
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/crm')) return;

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

// CRM alerts (src/utils/newLeadAlerts.js → showSystemAlert): tapping one brings the CRM forward on
// the record it is about — the open CRM tab if there is one, else a new one at data.url.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/crm', self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const crm = windows.find((w) => new URL(w.url).pathname.startsWith('/crm'));
      if (crm) {
        crm.postMessage({ type: 'oneline_open', url: target.pathname + target.search, leadId: data.leadId || '' });
        return crm.focus();
      }
      return self.clients.openWindow(target.href);
    })
  );
});
