const CACHE_NAME = 'trivia-quiz-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/animations.css',
  './js/app.js',
  './js/game.js',
  './js/questions.js',
  './js/storage.js',
  './js/ui.js',
  './js/daily.js',
  './js/share.js',
  './js/review.js',
  './js/firebase-config.js',
  './js/ranking.js',
  './js/ads.js',
  './js/premium.js',
  './data/science.js',
  './data/history.js',
  './data/geography.js',
  './data/food.js',
  './data/animals.js',
  './data/language.js',
  './data/entertainment.js',
  './data/body.js',
  './data/space.js',
  './data/sports.js',
  './data/art.js',
  './data/tech.js',
  './manifest.json'
];

// Install: 全アセットをキャッシュし、skipWaiting で即座にアクティブ化
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: 古いキャッシュを削除し、clients.claim で即座に制御を取得
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: キャッシュファースト戦略、Google Fonts は初回アクセス時にキャッシュ
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Google Fonts: 初回アクセス時にキャッシュ (Cache First + Runtime Caching)
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 通常のアセット: キャッシュファースト
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        return networkResponse;
      });
    })
  );
});
