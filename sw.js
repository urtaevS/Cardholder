// Версию кэша нужно поднимать при каждом деплое: fetch-хендлер работает
// по схеме cache-first, поэтому без бампа пользователи продолжают получать
// старые index.html/app.js/styles.css из кэша. v3 — иконки перенесены
// с CDN на локальный vendor/lucide-icons.js.
const CACHE_NAME = 'cardholder-v3';
const staticFiles = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/vendor/lucide-icons.js',
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
