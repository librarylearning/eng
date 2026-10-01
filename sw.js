/* =============================================================
   FILE: /sw.js   (must stay in the main folder, next to index.html)
   WHAT IT DOES: Keeps a copy of the website on the computer so
   it still opens when the internet is off.

   HOW IT WORKS: When the internet is on, it always gets the
   newest files from GitHub (so your edits show up) and saves a
   copy. When the internet is off, it uses the saved copy.

   NOTE: MP3 recordings are not saved for offline use. When she
   is offline, the computer voice speaks instead. Chrome's
   "Google US English" voice also needs the internet, so offline
   the site uses a built-in voice such as Microsoft Zira.

   IF YOU ADD A NEW .js FILE: add it to the CORE_FILES list below
   and change the version number (v1 -> v2).
   ============================================================= */
const CACHE_NAME = 'coffee-letters-v4';

const CORE_FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/storage.js',
  'js/voice.js',
  'js/progress.js',
  'js/art.js',
  'js/app.js',
  'js/dictionary.js',
  'js/sounds.js',
  'js/words.js',
  'js/grammar.js',
  'js/questions.js',
  'js/stories.js',
  'js/typing.js',
  'js/computer.js',
  'js/teacher.js',
  'data/words.json',
  'data/stories.json',
  'data/sounds.json',
  'data/grammar.json'
];

// Save the main files the first time the site opens.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(CORE_FILES.map(function (file) {
        return cache.add(file).catch(function () { /* skip a missing file */ });
      }));
    })
  );
  self.skipWaiting();
});

// Remove copies from older versions.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names
        .filter(function (n) { return n !== CACHE_NAME; })
        .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.endsWith('.mp3')) return;   // recordings: always from the internet

  // Google Fonts: use the saved copy first (fonts never change).
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isFont) {
    event.respondWith(
      caches.match(request).then(function (saved) {
        return saved || fetch(request).then(function (response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          return response;
        });
      })
    );
    return;
  }

  // Only handle files from this website.
  if (url.origin !== self.location.origin) return;

  // Internet first, saved copy if offline.
  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (saved) {
        return saved || caches.match('index.html');
      });
    })
  );
});
