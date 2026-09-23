const CACHE_NAME = 'arz-mart-cache-v5';

// Install Event - skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event - clean up all previous caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
// Completely bypass Service Worker for HTML navigation so subpages and tabs NEVER fail with ERR_FAILED
self.addEventListener('fetch', (event) => {
  // Let the browser natively handle all HTML/page navigations, non-GET requests, and API calls
  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html') ||
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return; // Returning without calling event.respondWith lets the browser handle the request natively
  }

  // For static assets, fetch from network, fallback to cache, never fail with undefined
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
  );
});
