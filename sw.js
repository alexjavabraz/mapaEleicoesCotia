/**
 * sw.js — Service Worker para o Mapa Eleitoral de Cotia 2024.
 *
 * Estratégia: Cache-first para assets estáticos; Network-first para dados JSON.
 * Permite instalação como PWA e uso básico offline (shell da app).
 */

// IMPORTANTE: bump CACHE_NAME/DATA_CACHE a cada deploy que altera o shell
// (app.js, map.js, css) ou o schema dos dados. O navegador só roda o evento
// "install" de novo quando este arquivo muda byte a byte — sem o bump, quem
// já tem o SW instalado fica preso na versão antiga em cache (cache-first).
const CACHE_NAME   = "cotia-mapa-v5";
const DATA_CACHE   = "cotia-data-v5";

// Assets estáticos que formam o "shell" da aplicação
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./eleicao-geral.html",
  "./css/style.css",
  "./js/tse.js",
  "./js/map.js",
  "./js/app.js",
  "./js/geral-config.js",
  "./js/geral.js",
  "./manifest.json",
  "./icons/cotia-flag.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Bibliotecas externas (CDN) — incluídas para funcionamento offline
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/osmtogeojson@3.0.0-beta.4/osmtogeojson.js",
  "https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js",
];

// Arquivos de dados — atualizados periodicamente
const DATA_ASSETS = [
  "./data/tse_cotia_2024.json",
  "./data/cotia_votos_por_bairro.json",
  "./data/cotia_votos_por_escola.json",
  "./data/cotia_locais_votacao.json",
];

// -----------------------------------------------------------------------
// Install: pré-carrega o shell estático
// -----------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] install: alguns assets falharam →", err))
  );
});

// -----------------------------------------------------------------------
// Activate: remove caches antigos
// -----------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// -----------------------------------------------------------------------
// Fetch: estratégia por tipo de recurso
// -----------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Dados JSON: Network-first (atualiza cache se online)
  const isData = DATA_ASSETS.some((d) => event.request.url.endsWith(d.replace("./", "")));
  if (isData || url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // APIs externas (Overpass, tiles, CDN): não interferir — usa rede diretamente
  if (!url.origin.startsWith(self.location.origin.slice(0, 8)) &&
      url.hostname !== self.location.hostname) {
    // Para tiles de mapa e APIs, deixa o browser decidir
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Assets estáticos: Cache-first
  event.respondWith(cacheFirst(event.request));
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Recurso não disponível offline.", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("Offline — dado não disponível.", { status: 503 });
  }
}
