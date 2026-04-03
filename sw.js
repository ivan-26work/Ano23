const CACHE_NAME = 'ano23-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/auth.html',
    '/envoyer.html',
    '/css/style.css',
    '/css/auth.css',
    '/js/app.js',
    '/js/auth.js',
    '/manifest.json',
    '/images/logo.png',
    '/images/image.png',
    '/images/image1.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});