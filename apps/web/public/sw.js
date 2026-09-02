/**
 * Service worker (M5 — PWA offline shell, Doc 10/ROADMAP M5).
 * Strategi: app shell (index.html, manifest, icon) cache-first;
 * aset build (dist/) cache-first via runtime cache; Google Fonts stale-while-revalidate.
 * Navigasi fallback → index.html agar installable & bisa dibuka offline.
 */
const VERSION = "hagumi-v1";
const SHELL = ["/", "/index.html", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navigasi → cache-first, fallback index.html (offline shell)
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then((cached) => cached ?? fetch(req)),
    );
    return;
  }

  // Google Fonts — stale-while-revalidate
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const fresh = fetch(req)
          .then((res) => {
            void cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? fresh;
      }),
    );
    return;
  }

  // Aset same-origin (JS/CSS build) — cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              void caches.open(VERSION).then((cache) => cache.put(req, clone));
            }
            return res;
          }),
      ),
    );
  }
});
