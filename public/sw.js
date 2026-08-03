// ============================================================
// Ukraine Defender — Service Worker
// FULL FILE
//
// Задачи:
// - оффлайн-оболочка;
// - кэш статики;
// - network-first для навигаций;
// - cache-first для same-origin статики;
// - НЕ кэшировать API;
// - НЕ кэшировать тайлы карты;
// - удаление старых кэшей.
// ============================================================

const CACHE_NAME = "ud-shell-v3";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/logo.svg",
  "/icon.svg"
];

// ============================================================
// INSTALL
// ============================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch(() => {
          // Если часть ассетов временно недоступна — не роняем install.
          return Promise.resolve();
        });
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// ============================================================
// MESSAGE
// ============================================================

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================================
// HELPERS
// ============================================================

function isApiRequest(url) {
  return (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  );
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

async function offlineResponse() {
  const cachedRoot = await caches.match("/");

  if (cachedRoot) {
    return cachedRoot;
  }

  return new Response("Offline", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

// ============================================================
// NAVIGATION STRATEGY
// network-first, fallback to cached shell
// ============================================================

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const copy = response.clone();

      caches
        .open(CACHE_NAME)
        .then((cache) => {
          return cache.put("/", copy);
        })
        .catch(() => {});
    }

    return response;
  } catch (error) {
    const cachedRequest = await caches.match(request);

    if (cachedRequest) {
      return cachedRequest;
    }

    return offlineResponse();
  }
}

// ============================================================
// SAME-ORIGIN STATIC STRATEGY
// cache-first, then network + cache write
// ============================================================

async function handleSameOriginStatic(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type === "basic"
    ) {
      const copy = response.clone();

      caches
        .open(CACHE_NAME)
        .then((cache) => {
          return cache.put(request, copy);
        })
        .catch(() => {});
    }

    return response;
  } catch (error) {
    return offlineResponse();
  }
}

// ============================================================
// FETCH
// ============================================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // API всегда должен идти сетью.
  if (isApiRequest(url)) {
    return;
  }

  // Навигации: сеть важнее, оффлайн fallback.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Статика нашего сайта: можно кэшировать.
  if (isSameOrigin(url)) {
    event.respondWith(handleSameOriginStatic(request));
    return;
  }

  // Cross-origin: тайлы карты, шрифты, внешние API.
  // Не кэшируем, чтобы данные всегда были свежими.
  return;
});
