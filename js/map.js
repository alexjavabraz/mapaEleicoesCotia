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
let selectedLayer = null;
let rankingControl = null;

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
 * Estilo para hover — pinta o bairro de vermelho.
 */
function getHoverStyle(feature, zona) {
  return {
    fillColor: "#e94560",
    fillOpacity: 0.75,
    color: "#e94560",
    weight: 2.5,
    opacity: 1,
    dashArray: null,
  };
}

/**
 * Estilo para feature selecionada — vermelho sólido mais intenso.
 */
function getSelectedStyle(zona) {
  return {
    fillColor: "#e94560",
    fillOpacity: 0.85,
    color: "#ffffff",
    weight: 2.5,
    opacity: 1,
    dashArray: null,
  };
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
          if (layer !== selectedLayer) {
            layer.setStyle(getHoverStyle(feature, zona));
          }
          if (onBairroHover) onBairroHover(feature, zona, layer);
        },
        mouseout: (e) => {
          if (layer !== selectedLayer) {
            layer.setStyle(getFeatureStyle(feature, zona));
          }
        },
        click: (e) => {
          // Desseleciona o anterior
          if (selectedLayer && selectedLayer !== layer) {
            const prevFeature = selectedLayer.feature;
            const prevZona = prevFeature.properties._zona;
            selectedLayer.setStyle(getFeatureStyle(prevFeature, prevZona));
          }
          selectedLayer = layer;
          layer.setStyle(getSelectedStyle(zona));
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
    const normalizeN = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const normalizedVereador = normalizeN(vereadorNome);
    const itens = [];
    for (const [bairro, data] of Object.entries(dadosBairro)) {
      const c = (data.vereadores || []).find(v => normalizeN(v.nome) === normalizedVereador);
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

    const rows = itens.map(item =>
      `<div class="ranking-row">
        <span class="ranking-bairro">${item.bairro}</span>
        <span class="ranking-votos">${item.votos.toLocaleString("pt-BR")}</span>
      </div>`
    ).join("");

    div.innerHTML = `
      <div class="ranking-title">${vereadorNome}</div>
      <div class="ranking-total">Total: ${itens.reduce((s, i) => s + i.votos, 0).toLocaleString("pt-BR")} votos em ${itens.length} bairro${itens.length !== 1 ? "s" : ""}</div>
      <div class="ranking-list">${rows}</div>`;
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
