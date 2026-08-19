/* eslint-disable no-undef */
// Service Worker for ЛАЙФ Marketplace (PWA)
const CACHE_VERSION = "life-mp-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
];

// Install event - precache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - cleanup stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (!key.startsWith(CACHE_VERSION)) {
              return caches.delete(key);
            }
            return null;
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests, chrome-extensions, and API/Admin routes
  if (
    request.method !== "GET" ||
    !url.protocol.startsWith("http") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname.includes("webpack-hmr")
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network-first with Cache Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches
              .open(PAGES_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const homeCached = await caches.match("/");
          if (homeCached) {
            return homeCached;
          }
          return new Response(
            `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>Офлайн — ЛАЙФ</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:3rem 1rem;background:#faf7f2;color:#1a3026;"><h1>Ви знаходитесь офлайн</h1><p>Будь ласка, перевірте з'єднання з інтернетом для перегляду оновлених товарів майстрів.</p></body></html>`,
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            },
          );
        }),
    );
    return;
  }

  // 2. Static Assets (Images, Icons, Fonts, CSS, JS) -> Stale-While-Revalidate
  const isStatic =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
