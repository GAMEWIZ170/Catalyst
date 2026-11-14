// Catalyst service worker. It does three things and nothing else:
//   1. Keeps the app itself (the page shell and its script and style files) so the app opens with no network.
//   2. Keeps the lesson screens and course outlines a student has opened, so they can be read offline.
//   3. Leaves everything else alone. Answers, tests, grading, login, notifications, review, admin and every
//      write (POST, PUT, DELETE) go straight to the network and are NEVER stored here.
// Bump VERSION when this file's rules change, so old caches are removed.
const VERSION = "v1";
const SHELL = `catalyst-shell-${VERSION}`;
const ASSETS = `catalyst-assets-${VERSION}`;
const LESSONS = "catalyst-lessons-v1"; // the page also deletes this one by name when a student logs out
const MAX_ASSETS = 120;
const SLOW_MS = 4000; // after this long with no answer, a saved copy is shown instead of waiting

// The only API reads that are kept: a lesson screen and a course outline, as /api/<version>/...
// (admin routes never match: they have /admin/ in the path).
const OFFLINE_API = /^\/api\/[^/]+\/(lessons\/[0-9a-f]{24}\/hub|courses\/[0-9a-f]{24})$/;

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL, ASSETS, LESSONS];
    for (const name of await caches.keys()) {
      if (name.startsWith("catalyst-") && !keep.includes(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (OFFLINE_API.test(url.pathname)) {
    event.respondWith(networkFirst(request, LESSONS));
    return;
  }
  if (url.origin !== self.location.origin) return; // YouTube, Cloudinary and other sites are not touched
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(openShell(request));
  }
});

// Saves the page shell and every file it names, so the very first visit already works offline.
// (Files the browser fetched before this worker took over would otherwise be missing from the cache.)
async function precacheShell() {
  const shell = await caches.open(SHELL);
  const assets = await caches.open(ASSETS);
  const response = await fetch("/", { cache: "reload" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await shell.put("/", response);
  const queue = [...new Set(html.match(/\/assets\/[^"')\s]+/g) || [])];
  const seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    try {
      const asset = await fetch(queue[i]);
      if (!asset.ok) continue;
      await assets.put(queue[i], asset.clone());
      // fonts and images named inside a stylesheet are added to the end of the list
      if (queue[i].endsWith(".css")) {
        for (const inner of (await asset.text()).match(/\/assets\/[^"')\s]+/g) || []) {
          if (!seen.has(inner)) { seen.add(inner); queue.push(inner); }
        }
      }
    } catch {
      // one missing file must not stop the rest
    }
  }
}

// Files in /assets have a hash in their name, so a saved copy never goes out of date.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(cache, MAX_ASSETS);
  }
  return response;
}

// Oldest files go first, so old versions of the app do not pile up on the phone.
async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

// Ask the network first. If it is offline, fails, or is slower than SLOW_MS, show the saved copy.
// A real answer from the server (even an error such as 401 or 404) is shown as it is and is not saved.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (!saved) return network;
  const wait = new Promise((resolve) => setTimeout(() => resolve(saved), SLOW_MS));
  return Promise.race([network.catch(() => saved), wait]);
}

// Any page address opens the same app shell (the app does its own routing). The fresh shell is kept for next time.
async function openShell(request) {
  const cache = await caches.open(SHELL);
  const network = fetch(request).then((response) => {
    if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) cache.put("/", response.clone());
    return response;
  });
  const saved = await cache.match("/");
  if (!saved) return network;
  const wait = new Promise((resolve) => setTimeout(() => resolve(saved), SLOW_MS));
  return Promise.race([network.catch(() => saved), wait]);
}
