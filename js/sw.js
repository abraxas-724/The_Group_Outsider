/*
  Basic service worker for PWA offline support (implementation file under js/).
  - Caches core shell files on install
  - Network-first for HTML navigation to avoid stale content
  - Cache-first for static assets (icons, css, js) with fallback
  Note: This file is imported by a root-level sw.js stub to preserve root scope.
*/

const CACHE_NAME = 'tgo-v12';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Build absolute URLs against the SW registration scope, so we work from any folder
const SCOPE = (self.registration && self.registration.scope) || self.location.origin + '/';
const toURL = (p) => new URL(p, SCOPE).toString();

const CORE_FILES = [
    '.',
    'index.html',
    'game.html',
    'css/style0.css',
    'css/game-inline.css',
    'js/main.js',
    'js/index-inline.js'
].map(toURL);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.map((k) => (k.startsWith('tgo-') && k !== CORE_CACHE && k !== STATIC_CACHE ? caches.delete(k) : null))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle same-origin
    if (url.origin !== location.origin) return;

    // Network-first for HTML to ensure fresh navigation
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request)
                .then((resp) => {
                    const clone = resp.clone();
                    caches.open(CORE_CACHE).then((c) => c.put(event.request, clone));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for static assets
    if (["style", "script", "image", "font"].includes(event.request.destination)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((resp) => {
                    const clone = resp.clone();
                    caches.open(STATIC_CACHE).then((c) => c.put(event.request, clone));
                    return resp;
                });
            })
        );
        return;
    }
});
