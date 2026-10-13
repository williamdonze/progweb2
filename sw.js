/* Service worker : appli installable et utilisable hors connexion.
   Réseau d'abord (le contenu est toujours le plus récent quand on est en ligne), copie en cache pour le hors-ligne.
   Les moteurs lourds et figés de js/vendor/ (PHP en WebAssembly, 18 Mo) : le cache d'abord, et seulement une fois utilisés. */
const CACHE = "progweb2-v10";
const CACHE_MOTEURS = "moteurs-v1";   // js/vendor/ : gardé d'une version du site à l'autre ; passer à v2 si on reconstruit un moteur
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CACHE_MOTEURS).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.includes("/js/vendor/")) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(rep => { if (rep.ok) { const copie = rep.clone(); caches.open(CACHE_MOTEURS).then(c => c.put(req, copie)); } return rep; })));
    return;
  }
  e.respondWith(
    fetch(req).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
      return rep;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === "navigate" ? caches.match("./") : Response.error())))
  );
});
