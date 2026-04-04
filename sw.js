// ============================================================
// ANO23 — SERVICE WORKER
// Cache + Web Push Notifications
// ============================================================

const CACHE_NAME = 'ano23-v3';
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
  './images/badge.png',
  './images/image.png',
  './images/image1.png',
  './images/image3.png',
  './images/image4.png',
  './images/image5.png',
  './images/image1-1.png'
];

// ============================================================
// INSTALL — Mise en cache des ressources statiques
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(CACHE_STATIC);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE — Nettoyage des vieux caches
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — Stale-While-Revalidate
// ============================================================
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les API Supabase
  if (event.request.url.includes('supabase.co')) return;
  
  // Ignorer Google Fonts
  if (event.request.url.includes('googleapis.com')) return;
  if (event.request.url.includes('gstatic.com')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request)
          .then(response => {
            // Mettre en cache si réponse valide
            if (response && response.status === 200 && response.type === 'basic') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(err => {
            console.warn('[SW] Erreur fetch:', err);
            return cached || null;
          });

        return cached || fetchPromise;
      });
    })
  );
});

// ============================================================
// NOTIFICATION — Réception depuis app.js
// ============================================================
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'NEW_MESSAGE') {
    const { title, body, url } = event.data;
    
    const options = {
      body: body || ' Tu as reçu un nouveau message anonyme',
      icon: './images/icon.png',
      badge: './images/badge.png',
      tag: 'ano23-new-message',
      renotify: true,
      data: { url: url || './index.html', timestamp: Date.now() },
      vibrate: [200, 100, 200],
      silent: false,
      actions: [
        { action: 'open', title: 'Voir le message' },
        { action: 'dismiss', title: 'Ignorer' }
      ]
    };

    // Ajouter le son si disponible
    // options.sound = './sounds/notification.mp3';

    self.registration.showNotification(title || 'Ano23', options);
  }
});

// ============================================================
// NOTIFICATION CLICK — Gestion du clic
// ============================================================
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  
  notification.close();

  if (action === 'dismiss') return;

  const targetUrl = notification.data?.url || './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Chercher un onglet Ano23 déjà ouvert
        const existingClient = clients.find(client => 
          client.url.includes('index.html') || 
          client.url.endsWith('/')
        );

        if (existingClient) {
          // Focus sur l'onglet existant
          existingClient.focus();
          // Envoyer un message pour ouvrir l'inbox
          existingClient.postMessage({ type: 'OPEN_INBOX' });
        } else {
          // Ouvrir un nouvel onglet
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ============================================================
// NOTIFICATION CLOSE — L'utilisateur a ignoré
// ============================================================
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification ignorée');
});

// ============================================================
// PUSH — Réception d'une notification push (optionnel)
// ============================================================
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() };
  }

  const options = {
    body: data.body || 'Nouveau message anonyme !',
    icon: './images/icon.png',
    badge: './images/badge.png',
    tag: 'ano23-push',
    data: { url: data.url || './index.html' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'découvrir '},
      { action: 'dismiss', title: 'Ignorer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ano23', options)
  );
});
