const CACHE_NAME = 'cardholder-v1';
const staticFiles = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  'https://telegram.org/js/telegram-web-app.js'
];

// Установка - кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(staticFiles))
  );
  self.skipWaiting();
});

// Активация - удаляем старый кэш
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов - сначала кэш, потом сеть
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
