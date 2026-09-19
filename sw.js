// Cache l'application pour un usage hors ligne. Bumper VERSION à chaque mise à jour.
const VERSION = "bpm-v1";
const FICHIERS = ["./", "./index.html", "./style.css?v=2", "./app.js?v=2", "./evaluation.js?v=1", "./data/aliments.js?v=1", "./manifest.webmanifest", "./icones/icone.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !new URL(e.request.url).origin.startsWith(self.location.origin)) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(rep => { const copie = rep.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); return rep; })));
});
