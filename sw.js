// ============================================================
// ANO23 — SERVICE WORKER
// Cache + Web Push Notifications
// ============================================================

const CACHE_NAME   = 'ano23-v2';
const CACHE_STATIC = [
  './',
  './index.html',
  './auth.html',
  './envoyer.html',
  './live-chat.html',
  './css/style.css',
  './css/auth.css',
  './js/app.js',
  './js/auth.js',
  './manifest.json',
  './images/logo.png',
  './images/icon.png',
  './images/badge.png'
];

// ============================================================
// INSTALL
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('googleapis.com')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        return cached || fetchPromise;
      })
    )
  );
});

// ============================================================
// NOTIFICATION
// ============================================================
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'NEW_MESSAGE') {
    const { title, body, url } = event.data;

    self.registration.showNotification(title || 'Ano23', {
      body:    body || ' Tu as reçu un nouveau message anonyme',
      icon:    './images/icon.png',
      badge:   './images/badge.png',
      tag:     'ano23-new-message',
      renotify: true,
      data:    { url: url || './index.html' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'ouvrir !' },
        { action: 'dismiss', title: 'Ignorer' }
      ]
    });
  }
});

// ============================================================
// NOTIFICATION CLICK
// ============================================================
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = notification.data?.url || './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c =>
          c.url.includes('index.html') || c.url.endsWith('/')
        );

        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'OPEN_INBOX' });
        } else {
          self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ============================================================
// PUSH
// ============================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ano23', {
      body:    data.body || ' Nouveau message anonyme',
      icon:    './images/icon.png',
      badge:   './images/badge.png',
      tag:     'ano23-push',
      data:    { url: data.url || './index.html' },
      vibrate: [200, 100, 200]
    })
  );
});
