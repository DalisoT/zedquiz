const CACHE_NAME = 'zedquiz-v1';
const STATIC_ASSETS = ['/', '/question', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((c) => c || fetch(event.request))
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attempts') {
    event.waitUntil(syncPendingAttempts());
  }
});

async function syncPendingAttempts() {
  const db = await openDB();
  const attempts = await db.getAll('pending-attempts');
  for (const attempt of attempts) {
    try {
      const res = await fetch('/api/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });
      if (res.ok) await db.delete('pending-attempts', attempt.id);
    } catch (e) { /* offline, will retry */ }
  }
}

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('zedquiz', 1);
    req.onerror = () => rej(req.error);
    req.onsuccess = () => res(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-attempts')) {
        db.createObjectStore('pending-attempts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}