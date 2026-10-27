/**
 * sw.js — Service Worker para o Mapa Eleitoral de Cotia 2024.
 *
 * Estratégia: Network-first para os arquivos do próprio site (HTML, JS, CSS,
 * ícones) e para dados JSON; o cache só responde quando a rede falha.
 * Permite instalação como PWA e uso básico offline (shell da app).
 */

// Não é mais preciso subir a versão a cada deploy: os arquivos do site são
// buscados na rede a cada visita (revalidando o cache HTTP do GitHub Pages),
// então uma mudança em js/css chega na hora, e o cache só serve offline.
// Suba CACHE_NAME/DATA_CACHE apenas para descartar caches antigos de vez
// (ex.: um arquivo removido do site ou um schema de dados incompatível).
const CACHE_NAME   = "cotia-mapa-v44";
const DATA_CACHE   = "cotia-data-v44";

// Assets estáticos que formam o "shell" da aplicação
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./metodologia.html",
  "./cotia/eleicoes2024.html",
  "./cotia/eleicoes2026.html",
  "./cotia/contas.html",
  "./vgp/eleicoes2024.html",
  "./vgp/eleicoes2026.html",
  "./vgp/contas.html",
  "./css/style.css",
  "./css/contas.css",
  "./css/abas.css",
  "./css/sobre.css",
  "./css/metodologia.css",
  "./js/i18n.js",
  "./js/abas.js",
  "./js/carregando.js",
  "./js/tema.js",
  "./js/tse.js",
  "./js/map.js",
  "./js/renda.js",
  "./js/app.js",
  "./js/virada.js",
  "./js/geral-config.js",
  "./js/geral.js",
  "./js/contas.js",
  "./js/contas-tipo.js",
  "./js/viagens.js",
  "./js/fontes.js",
  "./js/sobre.js",
  "./js/metodologia.js",
  "./manifest.json",
  "./icons/cotia-flag.svg",
  "./icons/vgp-icon.svg",
  "./icons/portal.svg",
  "./icons/alex-braz.jpg",
  "./icons/imprensa-2023-a-seguir.png",
  "./icons/imprensa-2014-guia-granja-viana.jpg",
  "./icons/pix-qrcode.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Bibliotecas externas (CDN) — incluídas para funcionamento offline
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/osmtogeojson@3.0.0-beta.4/osmtogeojson.js",
  "https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
];

// Dados do mapa de 2024 + contorno e bairros de Cotia: não mudam entre deploys,
// então são pré-carregados no install e servidos do cache na hora
// (stale-while-revalidate: a cópia em cache responde e a rede atualiza o cache
// em segundo plano para a próxima visita).
const MAPA_2024_ASSETS = [
  "./data/tse_cotia_2024.json",
  "./data/cotia_votos_por_bairro.json",
  "./data/cotia_votos_por_escola.json",
  "./data/cotia_votos_por_escola_detalhe.json",
  "./data/cotia_locais_votacao.json",
  "./data/gastos_campanha_2024.json",
  "./data/patrimonio_candidatos_2024.json",
  "./data/cotia_municipio.geojson",
  "./data/osm_bairros_cotia.json",
  "./data/censo_renda_setores.json",
  "./data/censo_renda_setores.geojson",
];

// Arquivos de dados — atualizados periodicamente (network-first)
const DATA_ASSETS = [
  "./data/contas_cotia.json",
  "./data/viagens_camara.json",
];

// -----------------------------------------------------------------------
// Install: pré-carrega o shell estático
// -----------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
      // Um arquivo de dados que falhe não deve impedir o cache do shell.
      caches.open(DATA_CACHE).then((cache) =>
        Promise.allSettled(MAPA_2024_ASSETS.map((a) => cache.add(a)))),
    ])
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

  // Dados do mapa 2024 (inclui .geojson): cache na hora, revalida em segundo plano
  const isMapa2024 = url.origin === self.location.origin &&
    MAPA_2024_ASSETS.some((d) => url.pathname.endsWith(d.replace("./", "/")));
  if (isMapa2024) {
    event.respondWith(staleWhileRevalidate(event, DATA_CACHE));
    return;
  }

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

  // Arquivos do próprio site: Network-first (sempre a versão publicada;
  // o cache só responde offline)
  event.respondWith(networkFirstShell(event.request));
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function networkFirstShell(request) {
  try {
    // "no-cache" revalida com o servidor (ETag) em vez de aceitar a cópia do
    // cache HTTP do navegador, que o GitHub Pages deixa valer por 10 minutos.
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    return cached || new Response("Recurso não disponível offline.", { status: 503 });
  }
}

async function staleWhileRevalidate(event, cacheName) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return (await network) || new Response("Offline — dado não disponível.", { status: 503 });
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
