// =============================================================
//  1LINE SOLUTIONS SOHAG - SERVICE WORKER (PWA & OFFLINE RESILIENCE)
// =============================================================

// Bumping the name drops every older cache on activate, including an app shell saved by an old
// worker: that stale '/' pointed at a bundle from before the deploy and crashed with
// «Cannot read properties of undefined (reading 'default')» once its chunks were gone.
const CACHE_NAME = 'oneline-sohag-v17';
const SHELL_URL = '/';
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

  // Pages: always the network. Each good response refreshes the offline copy of the app shell,
  // so the copy shown on a dropped connection is the latest deploy, never the one from install day.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match(SHELL_URL))
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

// Phone reminder from the hourly job (scripts/send-followup-reminders.mjs): a short digest of late
// replies and follow-ups due; also a team @mention (scripts/send-mention-pushes.mjs, its own tag). Tapping it opens the clients list (notificationclick below).
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* plain text or empty */ }
  event.waitUntil(self.registration.showNotification(String(data.title || '1Line'), {
    body: String(data.body || ''),
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: typeof data.tag === 'string' && data.tag ? data.tag : 'oneline-followups',
    renotify: true,
    data: { url: typeof data.url === 'string' ? data.url : '/crm?tab=leads', leadId: typeof data.leadId === 'string' ? data.leadId : '' }
  }));
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
