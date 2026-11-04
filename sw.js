const APP_VERSION = 'g04';
const CACHE_NAME = 'bpr-' + APP_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/anim.js',
  './js/assets.js',
  './js/audio.js',
  './js/background.js',
  './js/collide.js',
  './js/config.js',
  './js/game.js',
  './js/gesture.js',
  './js/input.js',
  './js/loop.js',
  './js/main.js',
  './js/music.js',
  './js/player.js',
  './js/props.js',
  './js/quips.js',
  './js/render.js',
  './js/rng.js',
  './js/spawner.js',
  './js/track.js',
  './assets/sprites/teo.webp',
  './assets/sprites/teo.json',
  './assets/sprites/police.webp',
  './assets/sprites/police.json',
  './assets/sprites/props.webp',
  './assets/sprites/props.json',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/audio/chase.json',
  './assets/audio/chase.mp3',
  './assets/brand/yabai_logo_white.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chỉ can thiệp yêu cầu cùng origin và phương thức GET
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  const pathname = url.pathname;
  const isAsset = pathname.includes('/assets/');

  if (isAsset) {
    // 1. Cache-trước cho assets/ (ảnh, json sprite, icon)
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
  } else {
    // 2. Mạng-trước cho tài liệu điều hướng, *.html, *.js, *.css, manifest.webmanifest
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Lỗi mạng hoặc offline -> trả bản lưu trong cache
          return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('./', { ignoreSearch: true })
                .then((r) => r || caches.match('./index.html', { ignoreSearch: true }));
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
  }
});
