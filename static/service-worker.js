const CACHE_NAME = 'qr-code-reader-cache-v1';
const STATIC_ASSETS = [
    '/static/index.html',
    '/static/manifest.json',
    '/static/service-worker.js',
    '/static/script.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png'
];

// Instala o Service Worker e adiciona arquivos ao cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cache => cache !== CACHE_NAME)
                .map(cache => caches.delete(cache))
            );
        })
    );
    self.clients.claim();
});

// Intercepta requisições e retorna do cache se disponível
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});