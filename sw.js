const CACHE_NAME = "caddie-v11";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./script.js",
  "./course-memory.js",
  "./styles.css",
  "./manifest.json",
  "./aii.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = event.request.url;
  if (
    url.includes("api.open-elevation.com") ||
    url.includes("api.open-meteo.com") ||
    url.includes("overpass")
  ) {
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200 && response.type === "basic") {
        const copy = response.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, copy);
      }
      return response;
    } catch (err) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const dest = event.request.destination;
      if (event.request.mode === "navigate" || dest === "document") {
        return (await caches.match("./index.html")) || Response.error();
      }
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});
