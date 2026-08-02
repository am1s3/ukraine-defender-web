// Ukraine Defender — service worker (оффлайн-оболочка).
// ВАЖЛИВО: НЕ кешуємо API/тайли — дані тривог мають бути свіжими завжди.
// Кешуємо лише оболонку (навігації + статику same-origin), щоб застосунок
// відкривався навіть коли мережа мігнула; дані підтягнуться щойно мережа є.
const CACHE = "ud-shell-v1";
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/logo.svg", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Навігація: network-first, fallback на кешовану оболонку (оффлайн)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Same-origin статика (бандл з хешем, svg): cache-first, потім мережа+кеш
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Cross-origin (API, тайли карти): тільки мережа, без кешу — дані завжди свіжі
});
