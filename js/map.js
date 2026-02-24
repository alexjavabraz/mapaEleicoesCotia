/**
 * map.js — Inicialização e controle do mapa Leaflet.
 * Busca dados de bairros/distritos de Cotia via Overpass API (OpenStreetMap).
 */

const COTIA_CENTER = [-23.6037, -46.8997];
const COTIA_ZOOM = 12;

// Cores para cada zona eleitoral (atribuídas dinamicamente)
const ZONE_COLORS = [
  "#4fc3f7", // azul claro
  "#81c784", // verde
  "#ffb74d", // laranja
  "#f06292", // rosa
  "#ba68c8", // roxo
  "#4db6ac", // teal
  "#fff176", // amarelo
  "#ff8a65", // laranja escuro
];

// Mapeamento zona -> cor
let zoneColorMap = {};

// Layers do Leaflet
let map = null;
let neighborhoodLayer = null;
let municipioLayer = null;
let escolasLayer = null;
let rankingControl = null;
let userLocationMarker = null;

/**
 * Adiciona controle de zoom customizado (estilizado para o tema escuro).
 */
function addCustomZoomControl() {
  const ctrl = L.control({ position: "topright" });
  ctrl.onAdd = function () {
    const div = L.DomUtil.create("div", "custom-zoom-control");
    div.innerHTML = `
      <button class="zoom-btn" id="zoom-in-btn" title="Aproximar">+</button>
      <button class="zoom-btn" id="zoom-out-btn" title="Afastar">&#x2212;</button>
    `;
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.on(div.querySelector("#zoom-in-btn"), "click", () => map.zoomIn());
    L.DomEvent.on(div.querySelector("#zoom-out-btn"), "click", () => map.zoomOut());
    return div;
  };
  ctrl.addTo(map);
}

/**
 * Inicializa o mapa Leaflet.
 */
function initMap() {
  map = L.map("map", {
    center: COTIA_CENTER,
    zoom: COTIA_ZOOM,
    zoomControl: false,   // usamos controle customizado
    attributionControl: true,
  });

  // Tile layer: CartoDB Dark Matter (combina com o tema escuro)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_matter_nolabels/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);

  // Labels por cima (sem camada de tiles duplicada)
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_matter_only_labels/{z}/{x}/{y}{r}.png",
    {
      attribution: "",
      subdomains: "abcd",
      maxZoom: 19,
      pane: "shadowPane",
    }
  ).addTo(map);

  addCustomZoomControl();

  return map;
}

/**
 * Atribui cores às zonas eleitorais.
 */
function buildZoneColors(zonasList) {
  zoneColorMap = {};
  zonasList.forEach((zona, i) => {
    zoneColorMap[zona] = ZONE_COLORS[i % ZONE_COLORS.length];
  });
}

/**
 * Determina a zona eleitoral de um feature GeoJSON.
 * Prioriza o campo 'zona' direto (features Voronoi), depois faz matching por nome.
 */
function getZonaForFeature(feature, bairroZonaMap) {
  if (feature.properties.zona) return feature.properties.zona;

  const name = feature.properties.name || feature.properties.nome || "";
  const nameLower = name.toLowerCase().trim();

  for (const [bairro, zona] of Object.entries(bairroZonaMap)) {
    if (nameLower.includes(bairro.toLowerCase()) || bairro.toLowerCase().includes(nameLower)) {
      return zona;
    }
  }
  return null;
}

/**
 * Gera polígonos Voronoi por bairro a partir dos locais de votação,
 * recortados pelo contorno do município de Cotia.
 * Usado como fallback quando o OSM não tem dados de bairros.
 */
function computeVoronoiBairros(locais, municipioGeoJSON) {
  if (!locais || !locais.length || !municipioGeoJSON) return null;
  if (typeof turf === "undefined") return null;

  // Agrupa locais por bairro e calcula centróide
  const bairroMap = {};
  for (const local of locais) {
    const lat = parseFloat(local.lat);
    const lng = parseFloat(local.lng);
    const nome = (local.bairro || "").trim();
    const zona = local.zona;
    if (!lat || !lng || !nome) continue;
    if (!bairroMap[nome]) bairroMap[nome] = { nome, zona, lats: [], lngs: [] };
    bairroMap[nome].lats.push(lat);
    bairroMap[nome].lngs.push(lng);
  }

  const points = Object.values(bairroMap).map(({ nome, zona, lats, lngs }) => {
    const lat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const lng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    return turf.point([lng, lat], { nome, name: nome, zona });
  });

  if (points.length < 3) return null;

  // Encontra o polígono do município para recorte
  let municipioPoly = null;
  for (const f of municipioGeoJSON.features) {
    const t = f.geometry && f.geometry.type;
    if (t === "Polygon" || t === "MultiPolygon") { municipioPoly = f; break; }
  }
  if (!municipioPoly) return null;

  const bbox = turf.bbox(municipioPoly);
  const voronoi = turf.voronoi(turf.featureCollection(points), { bbox });
  if (!voronoi || !voronoi.features.length) return null;

  // Recorta cada célula pelo contorno do município.
  // turf.intersect funciona com Polygon e MultiPolygon no turf@6.5.
  // Fallback: se falhar, inclui a célula se o centróide estiver dentro do município.
  const clipped = [];
  voronoi.features.forEach((cell, i) => {
    if (!cell || !points[i]) return;
    try {
      const cut = turf.intersect(cell, municipioPoly);
      if (cut) {
        cut.properties = { ...points[i].properties };
        clipped.push(cut);
      }
    } catch (e) {
      try {
        if (turf.booleanPointInPolygon(points[i], municipioPoly)) {
          cell.properties = { ...points[i].properties };
          clipped.push(cell);
        }
      } catch (e2) {}
    }
  });

  return clipped.length > 0 ? turf.featureCollection(clipped) : null;
}

/**
 * Reseta o estilo de todos os bairros para o padrão (por zona).
 */
function resetBairrosStyle() {
  if (!neighborhoodLayer) return;
  neighborhoodLayer.eachLayer((layer) => {
    if (layer.feature) {
      const zona = layer.feature.properties._zona;
      layer.setStyle(getFeatureStyle(layer.feature, zona));
    }
  });
}

/**
 * Estilo padrão para polígonos de bairros — cor por zona eleitoral, borda vermelha.
 */
function getFeatureStyle(feature, zona) {
  const fillColor = zona ? (zoneColorMap[zona] || "#0f2a4a") : "#0f2a4a";
  return {
    fillColor: fillColor,
    fillOpacity: 0.55,
    color: "#e94560",
    weight: 2,
    opacity: 0.9,
    dashArray: "6 4",
  };
}

/**
 * Estilo para hover — apenas realça a borda, sem alterar a cor de preenchimento.
 * Salva o estilo atual no layer para restaurar no mouseout.
 */
function applyHoverStyle(layer) {
  layer._preHoverStyle = {
    fillColor:   layer.options.fillColor,
    fillOpacity: layer.options.fillOpacity,
    color:       layer.options.color,
    weight:      layer.options.weight,
    opacity:     layer.options.opacity,
    dashArray:   layer.options.dashArray || null,
  };
  layer.setStyle({
    color:   "#ffffff",
    weight:  3,
    opacity: 1,
    dashArray: null,
  });
}

function restoreHoverStyle(layer, feature, zona) {
  if (layer._preHoverStyle) {
    layer.setStyle(layer._preHoverStyle);
    layer._preHoverStyle = null;
  } else {
    layer.setStyle(getFeatureStyle(feature, zona));
  }
}

/**
 * Renderiza uma máscara branca fora dos limites do município de Cotia,
 * usando a regra even-odd para criar o efeito de "buraco" no polígono.
 */
function renderMascaraExterna(municipioGeoJSON) {
  if (!municipioGeoJSON || !municipioGeoJSON.features.length) return;

  // Anel exterior cobrindo o mundo inteiro [lng, lat] — sentido anti-horário
  const worldRing = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90],
  ];

  const holes = [];
  for (const feature of municipioGeoJSON.features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      holes.push(geom.coordinates[0]);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        holes.push(poly[0]);
      }
    }
  }

  if (!holes.length) return;

  const maskFeature = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [worldRing, ...holes],
    },
    properties: {},
  };

  L.geoJSON(maskFeature, {
    style: {
      fillColor: "#ffffff",
      fillOpacity: 1,
      color: "transparent",
      weight: 0,
      fillRule: "evenodd",
    },
    interactive: false,
  }).addTo(map);
}

/**
 * Carrega os bairros de Cotia via Overpass API.
 * Retorna um FeatureCollection GeoJSON.
 */
async function fetchCotiaBairros(onStatus) {
  // Query Overpass para buscar os distritos e subdistritos de Cotia
  // Relation ID 296610 = Cotia (município)
  const query = `
[out:json][timeout:90];
(
  relation["name"="Cotia"]["admin_level"="8"];
)->.municipio;
area.municipio->.area_mun;
(
  relation["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.area_mun);
  relation["place"~"^(suburb|neighbourhood|quarter|district|village|town|hamlet)$"](area.area_mun);
  way["place"~"^(suburb|neighbourhood|quarter|district)$"](area.area_mun);
);
out body;
>;
out skel qt;
`.trim();

  const url = "https://overpass-api.de/api/interpreter";

  if (onStatus) onStatus("Buscando bairros no OpenStreetMap...");

  try {
    const response = await fetch(url, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) throw new Error(`Overpass API: ${response.status}`);

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      console.warn("Overpass: nenhum bairro encontrado, usando boundary do município.");
      return null;
    }

    // Converte OSM JSON -> GeoJSON usando osmtogeojson
    const geojson = osmtogeojson(data);
    console.log(`Overpass: ${geojson.features.length} features encontradas.`);
    return geojson;
  } catch (err) {
    console.error("Erro ao buscar bairros:", err);
    return null;
  }
}

/**
 * Carrega o contorno do município de Cotia.
 */
async function fetchCotiaMunicipio(onStatus) {
  const query = `
[out:json][timeout:30];
relation["name"="Cotia"]["admin_level"="8"];
out body;
>;
out skel qt;
`.trim();

  if (onStatus) onStatus("Buscando contorno do município...");

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) throw new Error(`Overpass API: ${response.status}`);
    const data = await response.json();
    const geojson = osmtogeojson(data);
    return geojson;
  } catch (err) {
    console.error("Erro ao buscar município:", err);
    return null;
  }
}

/**
 * Renderiza o contorno do município no mapa.
 */
function renderMunicipio(geojson) {
  if (!geojson || !geojson.features.length) return;

  if (municipioLayer) {
    map.removeLayer(municipioLayer);
  }

  municipioLayer = L.geoJSON(geojson, {
    style: {
      fillColor: "transparent",
      color: "#e94560",
      weight: 2.5,
      opacity: 0.7,
      dashArray: "6 4",
    },
    onEachFeature: (feature, layer) => {
      if (feature.properties && feature.properties.name) {
        layer.bindTooltip(feature.properties.name, {
          permanent: false,
          className: "map-tooltip",
        });
      }
    },
  }).addTo(map);

  // Ajusta o zoom para o município
  try {
    map.fitBounds(municipioLayer.getBounds(), { padding: [20, 20] });
  } catch (e) {}
}

/**
 * Renderiza os bairros no mapa com interatividade.
 * @param {Function} onGetTooltipContent  - (feature, zona) => htmlString; se fornecida,
 *   o tooltip é reavaliado a cada abertura (lê globals como currentVereadorFiltro).
 */
function renderBairros(geojson, bairroZonaMap, onBairroClick, onBairroHover, onGetTooltipContent) {
  if (!geojson || !geojson.features.length) return null;

  if (neighborhoodLayer) {
    map.removeLayer(neighborhoodLayer);
    neighborhoodLayer = null;
  }

  neighborhoodLayer = L.geoJSON(geojson, {
    style: (feature) => {
      const zona = getZonaForFeature(feature, bairroZonaMap);
      feature.properties._zona = zona;
      return getFeatureStyle(feature, zona);
    },
    filter: (feature) => {
      // Remove features sem geometria de polígono
      const type = feature.geometry && feature.geometry.type;
      return type === "Polygon" || type === "MultiPolygon";
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.name || feature.properties.nome || "Sem nome";
      const zona = feature.properties._zona;

      // Tooltip — usa função para reavaliar conteúdo a cada abertura (lê globals atuais)
      const tooltipFn = onGetTooltipContent
        ? () => onGetTooltipContent(feature, zona)
        : () => `<div class="tooltip-name">${name}</div>`;
      layer.bindTooltip(tooltipFn, {
        sticky: true,
        className: "map-tooltip",
        direction: "top",
        offset: [0, -10],
      });

      // Eventos de mouse
      layer.on({
        mouseover: (e) => {
          applyHoverStyle(layer);
          if (onBairroHover) onBairroHover(feature, zona, layer);
        },
        mouseout: (e) => {
          restoreHoverStyle(layer, feature, zona);
        },
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          if (onBairroClick) onBairroClick(feature, zona);
        },
      });
    },
  }).addTo(map);

  return neighborhoodLayer;
}

/**
 * Renderiza os locais de votação como marcadores no mapa.
 * Agrupa por zona e exibe círculos coloridos.
 */
function renderLocaisVotacao(locais, onLocaisClick) {
  if (!locais || !locais.length) return;

  const layerGroup = L.layerGroup();

  locais.forEach((local) => {
    if (!local.lat || !local.lng) return;

    const color = "#81c784";
    const circle = L.circleMarker([local.lat, local.lng], {
      radius: 5,
      fillColor: color,
      color: "#fff",
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.7,
    });

    circle.bindTooltip(
      `<div class="tooltip-name">${local.nome}</div>
       <div class="tooltip-zona">${local.bairro} — Zona ${local.zona}</div>
       <div class="tooltip-zona" style="font-size:0.68rem;margin-top:2px">${local.endereco}</div>`,
      {
        sticky: true,
        className: "map-tooltip",
        direction: "top",
        offset: [0, -8],
      }
    );

    if (onLocaisClick) {
      circle.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onLocaisClick(local);
      });
    }

    layerGroup.addLayer(circle);
  });

  layerGroup.addTo(map);
  return layerGroup;
}

/**
 * Cria/atualiza a caixa de ranking de votos por bairro para o vereador selecionado.
 * @param {string} vereadorNome  - Nome do vereador (ou "" para limpar)
 * @param {Object} dadosBairro   - Objeto { BAIRRO: { vereadores: [{nome, votos}] } }
 */
function renderRankingBox(vereadorNome, dadosBairro) {
  // Remove caixa anterior
  if (rankingControl) {
    rankingControl.remove();
    rankingControl = null;
  }

  rankingControl = L.control({ position: "bottomleft" });
  rankingControl.onAdd = function () {
    const div = L.DomUtil.create("div", "ranking-box");
    L.DomEvent.disableScrollPropagation(div);
    L.DomEvent.disableClickPropagation(div);

    if (!vereadorNome) {
      div.innerHTML = `<div class="ranking-title">Votos por Bairro</div><div class="ranking-empty">Nenhum vereador selecionado</div>`;
      return div;
    }

    if (!dadosBairro) {
      div.innerHTML = `
        <div class="ranking-title">${vereadorNome}</div>
        <div class="ranking-empty">Dados por bairro não disponíveis.<br>Execute:<br><code>python scripts/download_secoes.py</code></div>`;
      return div;
    }

    // Coleta e ordena votos por bairro para o vereador
    // Usa resolveNomeFull() para converter nome-de-urna em nome-completo (datasets distintos)
    const normalizeN = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const fullNome = (typeof resolveNomeFull === "function") ? resolveNomeFull(vereadorNome) : vereadorNome;
    const normalizedFull = normalizeN(fullNome);
    const normalizedUrna = normalizeN(vereadorNome);
    const itens = [];
    for (const [bairro, data] of Object.entries(dadosBairro)) {
      const c = (data.vereadores || []).find(v => {
        const n = normalizeN(v.nome);
        return n === normalizedFull || n === normalizedUrna;
      });
      if (c && c.votos > 0) {
        itens.push({ bairro, votos: c.votos });
      }
    }
    itens.sort((a, b) => b.votos - a.votos);

    if (!itens.length) {
      div.innerHTML = `
        <div class="ranking-title">${vereadorNome}</div>
        <div class="ranking-empty">Sem votos por bairro disponíveis</div>`;
      return div;
    }

    const totalVotos = itens.reduce((s, i) => s + i.votos, 0);
    const rows = itens.map((item, idx) =>
      `<tr class="ranking-tr">
        <td class="ranking-rank">${idx + 1}</td>
        <td class="ranking-bairro">${item.bairro}</td>
        <td class="ranking-votos">${item.votos.toLocaleString("pt-BR")}</td>
      </tr>`
    ).join("");

    div.innerHTML = `
      <div class="ranking-title">${vereadorNome}</div>
      <div class="ranking-total">${totalVotos.toLocaleString("pt-BR")} votos em ${itens.length} bairro${itens.length !== 1 ? "s" : ""}</div>
      <div class="ranking-list">
        <table class="ranking-table">
          <thead>
            <tr>
              <th class="ranking-th ranking-th-num">#</th>
              <th class="ranking-th">Bairro</th>
              <th class="ranking-th ranking-th-votos">Votos</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    return div;
  };
  rankingControl.addTo(map);
}

/**
 * Cria/atualiza a legenda das zonas eleitorais.
 */
function updateLegend(zonasList) {
  const existing = document.getElementById("map-legend");
  if (existing) existing.remove();

  if (!zonasList || zonasList.length === 0) return;

  const legend = L.control({ position: "bottomleft" });
  legend.onAdd = () => {
    const div = L.DomUtil.create("div", "");
    div.id = "map-legend";
    div.innerHTML = `
      <h4>Zonas Eleitorais</h4>
      ${zonasList
        .map(
          (z) => `
        <div class="legend-item">
          <div class="legend-color" style="background:${zoneColorMap[z] || "#888"}"></div>
          <span>Zona ${z}</span>
        </div>
      `
        )
        .join("")}
    `;
    return div;
  };
  legend.addTo(map);
}

/**
 * Retorna a cor do marcador/label de acordo com a % de abstenção.
 *   < 18% → verde   (abaixo da média)
 *  18-24% → âmbar  (na média)
 *   > 24% → vermelho (acima da média)
 */
function corAbstencao(pct) {
  if (pct < 18) return "#4caf50";
  if (pct < 24) return "#ffb74d";
  return "#ef5350";
}

/**
 * Renderiza os locais de votação (escolas) no mapa.
 *
 * Cada escola recebe:
 *  - Um circleMarker colorido pela abstenção (verde/âmbar/vermelho).
 *  - Um label permanente acima do marcador com "Eleitores Registrados" e
 *    "% de Abstenção" (via DivIcon não-interativo).
 *  - Um tooltip de hover com todos os detalhes.
 *
 * @param {Array}    escolas       - Array de objetos (ver tse.js · getEscolasSummary)
 * @param {Function} onEscolaClick - Callback opcional ao clicar numa escola
 */
function renderEscolas(escolas, onEscolaClick) {
  if (!escolas || !escolas.length) return null;

  if (escolasLayer) {
    map.removeLayer(escolasLayer);
    escolasLayer = null;
  }

  escolasLayer = L.layerGroup();

  for (const escola of escolas) {
    if (isNaN(escola.lat) || isNaN(escola.lng)) continue;

    const temDados  = escola.votos_prefeito > 0 && escola.eleitores > 0;
    const abstNum   = temDados
      ? Math.round((escola.eleitores - escola.votos_prefeito) / escola.eleitores * 100)
      : null;
    const cor       = abstNum !== null ? corAbstencao(abstNum) : "#ffd54f";
    const corHover  = abstNum !== null ? corAbstencao(abstNum - 2) : "#fff176"; // ligeiramente mais claro

    // ── Marcador circular colorido pela abstenção ──────────────────
    const circle = L.circleMarker([escola.lat, escola.lng], {
      radius:      6,
      fillColor:   cor,
      color:       "#1a1a2e",
      weight:      1.5,
      opacity:     1,
      fillOpacity: 0.92,
      pane:        "markerPane",
    });

    // ── Tooltip de hover com todos os detalhes ──────────────────────
    const statsHtml = temDados
      ? `<div class="tooltip-escola-detalhe">
           <div class="ted-row">
             <span class="ted-label">Eleitores registrados</span>
             <span class="ted-val">${escola.eleitores.toLocaleString("pt-BR")}</span>
           </div>
           <div class="ted-row">
             <span class="ted-label">Votos (prefeito)</span>
             <span class="ted-val">${escola.votos_prefeito.toLocaleString("pt-BR")}</span>
           </div>
           <div class="ted-row">
             <span class="ted-label">% de Abstenção</span>
             <span class="ted-val" style="color:${cor};font-weight:700">${abstNum}%</span>
           </div>
           <div class="ted-row">
             <span class="ted-label">Seções</span>
             <span class="ted-val">${escola.secoes}</span>
           </div>
         </div>`
      : escola.eleitores > 0
        ? `<div class="tooltip-escola-stat">
             <span>${escola.eleitores.toLocaleString("pt-BR")} eleitores</span>
             <span>${escola.secoes} seção${escola.secoes !== 1 ? "ões" : ""}</span>
           </div>`
        : "";

    circle.bindTooltip(
      `<div class="tooltip-name">${escola.nome}</div>
       <div class="tooltip-zona">${escola.endereco}</div>
       <div class="tooltip-zona" style="margin-bottom:4px">${escola.bairro} · Zona ${escola.zona}</div>
       ${statsHtml}`,
      { sticky: true, className: "map-tooltip", direction: "top", offset: [0, -10] }
    );

    circle.on("mouseover", () => circle.setStyle({ radius: 8, weight: 2, fillOpacity: 1 }));
    circle.on("mouseout",  () => circle.setStyle({ radius: 6, weight: 1.5, fillOpacity: 0.92 }));

    if (onEscolaClick) {
      circle.on("click", e => { L.DomEvent.stopPropagation(e); onEscolaClick(escola); });
    }

    escolasLayer.addLayer(circle);
  }

  escolasLayer.addTo(map);
  return escolasLayer;
}

/**
 * Solicita a geolocalização do usuário e, se ele estiver dentro do município
 * de Cotia, adiciona um marcador pulsante "Você está aqui" no mapa.
 * Se o usuário estiver fora de Cotia, recusar a permissão ou ocorrer erro,
 * não faz nada.
 *
 * @param {Object} municipioGeoJSON - FeatureCollection do contorno de Cotia
 */
function localizarUsuario(municipioGeoJSON) {
  if (!navigator.geolocation || !municipioGeoJSON) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Verifica se o ponto está dentro do polígono do município
      const ponto = turf.point([lng, lat]);
      let dentroDeCotia = false;
      for (const feature of municipioGeoJSON.features) {
        const t = feature.geometry?.type;
        if (t === "Polygon" || t === "MultiPolygon") {
          try {
            if (turf.booleanPointInPolygon(ponto, feature)) {
              dentroDeCotia = true;
              break;
            }
          } catch (_) {}
        }
      }

      if (!dentroDeCotia) return;

      // Remove marcador anterior, se houver
      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
        userLocationMarker = null;
      }

      const icon = L.divIcon({
        className: "user-location-icon",
        html: `<div class="user-location-dot"><div class="user-location-pulse"></div></div>`,
        iconSize:   [24, 24],
        iconAnchor: [12, 12],
      });

      userLocationMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
        .bindTooltip("Você está aqui", {
          permanent: false,
          className: "map-tooltip",
          direction: "top",
          offset: [0, -14],
        })
        .addTo(map);
    },
    () => {}, // permissão negada ou erro — silencioso
    { timeout: 10000, maximumAge: 300000 }
  );
}
