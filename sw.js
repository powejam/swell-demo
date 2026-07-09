'use strict';
/* Cache keyed to build stamp — bumping BUILD invalidates the old shell on refresh. */
const BUILD = '20260709141821';
const CACHE = 'swell-' + BUILD;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Live Open-Meteo data is never cached — always network. */
  if (url.hostname.endsWith('open-meteo.com')) return;

  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  /* Navigations: network-first so a refresh pulls the latest build, cache as offline fallback. */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Other shell assets: cache-first. */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }))
  );
});
