const CACHE_NAME = 'wordle-de-v16';
const ASSETS = [
  './',
  './index.html',
  './icon.png',
  './css/styles.css',
  './js/main.js',
  './wordle_german_final.txt',
  './wordle_german_shortlist.txt',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force waiting service worker to become active
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Force fetch fresh files from the network instead of browser HTTP cache
      const requests = ASSETS.map(url => {
        if (url.startsWith('http')) {
          return new Request(url);
        }
        return new Request(url, { cache: 'reload' });
      });
      return cache.addAll(requests);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim(); // Immediately control all clients
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
