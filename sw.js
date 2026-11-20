/* Service worker de TatanTatan: permite instalar la app y usarla sin señal.
   Subí VERSION cada vez que agregues o cambies imágenes. */
const VERSION = 'tatan-v1';

const PRECACHE = [
  './',
  './index.html',
  './index.css',
  './manifest.webmanifest',
  './comun/base.css',
  './comun/app.js',
  './Divisor/Divisor.html',
  './Divisor/Divisor.css',
  './Divisor/Divisor.js',
  './Plantilla/Plantilla.html',
  './Plantilla/Plantilla.css',
  './Plantilla/Plantilla.js',
  './img/fondo2.jpg',
  './img/favicon-32.png',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/s/02d35cbbbbf96b.webp',
  './img/s/03b067e501f0f7.webp',
  './img/s/069b4b17c0ca8a.webp',
  './img/s/0775a6a49da720.webp',
  './img/s/0a9cf1004156c6.webp',
  './img/s/0b2281d1d1ac70.webp',
  './img/s/0c1b786ce8069c.webp',
  './img/s/0c78384baf2a9f.webp',
  './img/s/0ede129a552a35.webp',
  './img/s/13d72455287a7f.webp',
  './img/s/1479025b136923.webp',
  './img/s/18a2d7d80cd701.webp',
  './img/s/1b0432a7547144.webp',
  './img/s/1d440844e73f14.webp',
];

const ESPERA_RED_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

// Páginas, CSS y JS: primero la red (así se ven los cambios publicados) y, si no hay
// señal o tarda más de 3 s, la copia guardada. Imágenes: primero la copia guardada.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.destination === 'image') {
    event.respondWith(primeroCache(req));
  } else {
    event.respondWith(primeroRed(req));
  }
});

async function primeroCache(req) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function primeroRed(req) {
  const cache = await caches.open(VERSION);
  const red = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const espera = new Promise((resolve) => setTimeout(resolve, ESPERA_RED_MS, null));
  const res = await Promise.race([red.catch(() => null), espera]);
  if (res) return res;
  const guardada = await cache.match(req, { ignoreSearch: true });
  return guardada ? sinRedireccion(guardada) : red;
}

// Si el hosting redirige (p. ej. URLs "limpias"), el navegador rechaza una respuesta
// redirigida para una navegación: se devuelve una copia limpia.
function sinRedireccion(res) {
  if (!res.redirected) return res;
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
