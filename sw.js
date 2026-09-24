/* Offline support. Care homes have patchy wifi and a note written at 22:00
   must not depend on a signal. Cache-first: once opened, the app works with
   the network off, on any tablet, indefinitely. */
const CACHE = "care-note-builder-v10";
/* every file the page loads - a missing one here is a broken app offline */
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./icon.svg", "./css/app.css",
  "./js/core.js", "./js/data.js", "./js/profiles.js", "./js/rules.js", "./js/contradictions.js",
  "./js/language.js", "./js/quality.js", "./js/patterns.js", "./js/match.js", "./js/smart-assist.js", "./js/storage.js",
  "./js/provenance.js", "./js/narrative.js", "./js/provider-config.js", "./js/validation.js",
  "./js/app.js", "./js/settings.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Serve from cache, then refresh it in the background, so a staff member always
   gets an instant page and picks up an updated one on the next open. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const live = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || live;
    })
  );
});
