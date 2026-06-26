// StayVista Butler Ops — Service Worker
const CACHE = 'sv-butler-v1';
const OFFLINE_URL = '/dashboard';

// Install — cache critical shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/',
      '/dashboard',
      '/manifest.json',
      '/icon-192.png',
      '/icon-512.png',
    ])).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache for navigation
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  
  // API calls — always network, never cache
  if (url.pathname.startsWith('/api/')) return;
  
  // Navigation — network first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  
  // Static assets — cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  }
});
