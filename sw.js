// ============================================================
// WHOIS — SERVICE WORKER
// Cache + Web Push Notifications
// ============================================================

const CACHE_NAME   = 'whois-v1';
const CACHE_STATIC = [
  './',
  './index.html',
  './auth.html',
  './envoyer.html',
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
// MESSAGES DE NOTIFICATION PAR TYPE (10 chacun)
// ============================================================
const NOTIF_MESSAGES = {
  message: [
    "💬 Vous avez reçu un nouveau message anonyme",
    "✉️ Quelqu'un vous a écrit !",
    "📩 Découvrez qui vous a écrit !",
    "💌 Un message anonyme vous attend",
    "📨 Nouvelle activité sur votre profil",
    "💭 Quelqu'un pense à vous",
    "📝 Vous avez un nouveau message",
    "🔔 Ne manquez pas ce message anonyme",
    "💙 Quelqu'un a quelque chose à vous dire",
    "👀 Ouvrez pour lire votre message anonyme"
  ],
  question: [
    "❓ Quelqu'un vous a posé une question anonyme",
    "🤔 Une nouvelle question anonyme vous attend",
    "💭 On aimerait connaître votre avis",
    "📝 Question anonyme : répondez maintenant",
    "💬 Quelqu'un attend votre réponse",
    "🔍 Une question mystère pour vous",
    "🎯 Votre avis est demandé !",
    "📢 Question anonyme reçue",
    "💡 Quelqu'un veut votre opinion",
    "🤫 Question secrète pour vous"
  ],
  discussion: [
    "💬 Quelqu'un veut discuter anonymement",
    "🗣️ Nouvelle demande de discussion anonyme",
    "💭 Une discussion anonyme vous attend",
    "👥 Quelqu'un a lancé une discussion",
    "💬 Souhaitez-vous discuter ?",
    "🎭 Discussion anonyme disponible",
    "💬 Rejoignez la conversation anonyme",
    "🗨️ Quelqu'un vous parle en privé",
    "💬 Une âme anonyme veut discuter",
    "🤝 Discussion anonyme en attente"
  ]
};

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
// NOTIFICATION (avec message aléatoire selon le type)
// ============================================================
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'NEW_MESSAGE') {
    const { title, url, msgType } = event.data;
    const uniqueTag = `whois-msg-${Date.now()}`;
    
    // Sélection du tableau selon le type (défaut: message)
    let messagesArray = NOTIF_MESSAGES.message;
    if (msgType === 'question') messagesArray = NOTIF_MESSAGES.question;
    if (msgType === 'discussion') messagesArray = NOTIF_MESSAGES.discussion;
    
    // Message aléatoire
    const randomIndex = Math.floor(Math.random() * messagesArray.length);
    const randomBody = messagesArray[randomIndex];

    // Affichage de la notification
    self.registration.showNotification(title || 'whois', {
      body:    randomBody,
      icon:    './images/icon.png',
      badge:   './images/badge.png',
      tag:     uniqueTag,
      renotify: true,
      data:    { url: url || './index.html' },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: '📥 Voir' },
        { action: 'dismiss', title: '❌ Ignorer' }
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
  
  const uniqueTag = `whois-push-${Date.now()}`;
  
  // Déterminer le type depuis les données push (défaut: message)
  const msgType = data.msgType || 'message';
  let messagesArray = NOTIF_MESSAGES.message;
  if (msgType === 'question') messagesArray = NOTIF_MESSAGES.question;
  if (msgType === 'discussion') messagesArray = NOTIF_MESSAGES.discussion;
  
  const randomIndex = Math.floor(Math.random() * messagesArray.length);
  const randomBody = messagesArray[randomIndex];

  event.waitUntil(
    self.registration.showNotification(data.title || 'whois', {
      body:    randomBody,
      icon:    './images/icon.png',
      badge:   './images/badge.png',
      tag:     uniqueTag,
      data:    { url: data.url || './index.html' },
      vibrate: [200, 100, 200]
    })
  );
});