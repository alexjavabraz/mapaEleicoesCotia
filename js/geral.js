/**
 * geral.js — Página de Eleições Gerais (Presidente, Governador, Senador,
 * Deputado Federal, Deputado Estadual) com seletor de ano (2022 / 2026).
 *
 * Reaproveita de tse.js as funções genéricas (formatVotos, renderCandidateCard,
 * renderPrefeito, renderVereadores, getZonas, getZonaData, getTotais,
 * loadLocaisVotacao) e toda a infraestrutura de mapa de map.js.
 *
 * Diferença-chave em relação a app.js: não existe dado de votação por bairro
 * aqui — isso só existe pós-eleição, no arquivo de seção (secao_votos), que
 * ainda não foi adaptado para eleição geral. Clicar num bairro mostra o
 * resultado da ZONA eleitoral a que ele pertence, não do bairro em si.
 */

// Mesmo mapeamento bairro→zona usado em app.js (as zonas eleitorais de Cotia
// — 227 e 286 — não mudam entre pleitos, salvo redistritamento pelo TSE).
const BAIRRO_ZONA_MAP = {
  // === ZONA 227 ===
  "caputera": "227",
  "centro": "227",
  "chácara canta galo": "227",
  "chácara vista alegre": "227",
  "granja viana": "227",
  "granja viana ii": "227",
  "jardim barro branco": "227",
  "jardim cláudio": "227",
  "jardim claudio": "227",
  "jardim do engenho": "227",
  "jardim dos ipês": "227",
  "jardim dos ipes": "227",
  "jardim estela maris": "227",
  "jardim guerreiro": "227",
  "jardim leonor": "227",
  "jardim maranhão": "227",
  "jardim maranhao": "227",
  "jardim monte santo": "227",
  "jardim nomura": "227",
  "jardim nova coimbra": "227",
  "jardim panorama": "227",
  "jardim petropolis": "227",
  "jardim rio das pedras": "227",
  "jardim rosalina": "227",
  "jardim rosemary": "227",
  "jardim sabiá": "227",
  "jardim sabia": "227",
  "jardim santa angela": "227",
  "jardim santa izabel": "227",
  "jardim são miguel": "227",
  "jardim sao miguel": "227",
  "jardim torino": "227",
  "nakamura park": "227",
  "parque alexandre": "227",
  "parque miguel mirizola": "227",
  "parque são george": "227",
  "parque sao george": "227",
  "portão": "227",
  "portao": "227",
  "quinta dos angicos": "227",
  "recanto dos victor": "227",
  "rio cotia": "227",
  "vila monte serrat": "227",
  "vila santo antônio do portão": "227",
  "vila santo antonio": "227",
  "vila são francisco": "227",
  "vila sao francisco": "227",
  "vila são joaquim": "227",
  "vila sao joaquim": "227",
  // === ZONA 286 ===
  "agua espraiada": "286",
  "água espraiada": "286",
  "aguassaí": "286",
  "aguassai": "286",
  "altos de caucaia": "286",
  "apache": "286",
  "atalaia": "286",
  "bairro dos pereiras": "286",
  "cachoeira": "286",
  "candido pinto": "286",
  "caucaia": "286",
  "jardim araruama": "286",
  "jardim das oliveiras": "286",
  "jardim elias": "286",
  "jardim japão": "286",
  "jardim japao": "286",
  "jardim monte verde": "286",
  "jardim sandra": "286",
  "jardim ísis": "286",
  "jardim isis": "286",
  "lavapé": "286",
  "lavape": "286",
  "morro grande": "286",
  "parque mirante da mata": "286",
};

// ---- ESTADO GLOBAL ----
let currentYear  = "2022"; // 2022 tem dados já publicados; 2026 ainda não (pós-apuração)
let currentCargo = "presidente";
let currentTurno = "1";
let currentZona  = null;

function cargoCfg(key) {
  return CARGOS_GERAL.find((c) => c.key === key);
}

function setLoadingStatus(text) {
  const el = document.getElementById("loading-status");
  if (el) el.textContent = text;
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "flex" : "none";
}

function showNoBanner(message) {
  const banner = document.getElementById("no-data-banner");
  if (banner) {
    banner.style.display = "block";
    banner.innerHTML = message;
  }
}

function hideNoBanner() {
  const banner = document.getElementById("no-data-banner");
  if (banner) banner.style.display = "none";
}

/** Carrega o JSON do ano selecionado para a variável global `tseData` (tse.js). */
async function loadYearData(year) {
  try {
    const r = await fetch(ELECTION_YEARS[year].dataFile);
    if (!r.ok) return { error: r.status === 404 ? "not_found" : `http_${r.status}` };
    tseData = await r.json();
    return { ok: true };
  } catch (e) {
    return { error: e.name === "TypeError" ? "cors_or_network" : e.message };
  }
}

function showDataErrorBanner(year, error) {
  const cfg = ELECTION_YEARS[year];
  const banner =
    error === "not_found" || error === "cors_or_network"
      ? `⚠️ O TSE ainda não publicou os dados de votação de ${year}
         (só saem depois que a apuração termina).
         Dataset: <a href="${cfg.datasetUrl}" target="_blank">dadosabertos.tse.jus.br</a>`
      : `⚠️ Erro ao carregar dados de ${year}: ${error}`;
  showNoBanner(banner);
  document.getElementById("sidebar-content").innerHTML =
    `<div class="placeholder"><p>Sem dados eleitorais de ${year} ainda.</p></div>`;
  document.getElementById("sidebar-header").innerHTML = `<h2>Selecione um bairro</h2>`;
}

// ---- RENDERIZAÇÃO DO SIDEBAR ----

function renderCargoTabs() {
  return (
    `<div class="cargo-tabs">` +
    CARGOS_GERAL.map(
      (c) =>
        `<button class="cargo-tab ${currentCargo === c.key ? "active" : ""}"
                 onclick="switchCargo('${c.key}')">${c.label}</button>`
    ).join("") +
    `</div>`
  );
}

function switchCargo(key) {
  currentCargo = key;
  currentTurno = "1";
  renderSidebar();
}

function switchTurno(turno) {
  currentTurno = turno;
  renderSidebar();
}

function fonteInfo() {
  const cfg = ELECTION_YEARS[currentYear];
  return `<div class="fonte-info">
    Fonte: <a href="${cfg.datasetUrl}" target="_blank">TSE — Dados Abertos — Eleições ${currentYear}</a><br>
    Votação Nominal por Município e Zona
  </div>`;
}

function renderCargoSection(cargoData, label) {
  const cfg = cargoCfg(currentCargo);
  const t1 = cargoData?.["1"] || [];
  const t2 = cargoData?.["2"] || [];
  const hasTurno2 = cfg.turnos && t2.length > 0;

  let html = `<div class="election-section">`;
  html += `<div class="section-title"><div class="dot" style="background:#e94560"></div>${label}</div>`;
  if (hasTurno2) {
    html += `<div class="turno-tabs">
      <button class="turno-tab ${currentTurno === "1" ? "active" : ""}" onclick="switchTurno('1')">1º Turno</button>
      <button class="turno-tab ${currentTurno === "2" ? "active" : ""}" onclick="switchTurno('2')">2º Turno</button>
    </div>`;
  } else if (t1.length) {
    html += `<div class="turno-tabs"><button class="turno-tab active">1º Turno</button></div>`;
  }

  const candidatos = (hasTurno2 ? cargoData[currentTurno] : t1) || [];
  const uid = `g_${currentCargo}`;
  // renderVereadores já cuida de listas longas (10 visíveis + "ver mais");
  // renderPrefeito mostra tudo direto — útil pra Presidente/Governador (poucos candidatos).
  const renderFn = candidatos.length > 15 ? renderVereadores : renderPrefeito;
  html += `<div class="candidate-list">${renderFn(candidatos, currentTurno, uid)}</div></div>`;
  return html;
}

function renderSidebarForZona(zonaNum) {
  const zonaData = getZonaData(zonaNum);
  const cfg = cargoCfg(currentCargo);
  let html = renderCargoTabs();
  if (!zonaData) {
    html += `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Sem dados para esta zona.</p>`;
  } else {
    html += renderCargoSection(zonaData[currentCargo], `${cfg.label} — Zona ${zonaNum}`);
  }
  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

function renderSidebarTotais() {
  const totais = getTotais();
  const cfg = cargoCfg(currentCargo);
  let html = renderCargoTabs();
  if (!totais) {
    html += `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Dados ainda não disponíveis.</p>`;
  } else {
    html += renderCargoSection(totais[currentCargo], `${cfg.label} — Total Geral`);
  }
  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

function renderSidebar() {
  if (currentZona) {
    renderSidebarForZona(currentZona);
  } else {
    renderSidebarTotais();
  }
}

function displayZona(displayName, zonaNum) {
  currentZona = zonaNum;
  const zonaColor = zoneColorMap[zonaNum] || "#888";
  document.getElementById("sidebar-header").innerHTML = `
    <h2>${displayName}</h2>
    <span class="zona-badge" style="background:${zonaColor}20;color:${zonaColor};border:1px solid ${zonaColor}50">
      Zona ${zonaNum}
    </span>`;
  renderSidebarForZona(zonaNum);
}

function displayTotaisGerais() {
  currentZona = null;
  document.getElementById("sidebar-header").innerHTML = `
    <h2>Cotia — Total Geral</h2>
    <span class="zona-badge" style="background:rgba(233,69,96,0.15);color:#e94560;border:1px solid rgba(233,69,96,0.3)">
      Todas as Zonas
    </span>`;
  renderSidebarTotais();
}

/** Tooltip de bairro: só zona (sem voto por bairro — dado não existe aqui ainda). */
function getTooltipContentGeral(feature, zona) {
  const name = feature.properties.name || feature.properties.nome || "Bairro";
  const zonaColor = zona && zoneColorMap[zona] ? zoneColorMap[zona] : "#888";
  return `<div class="tooltip-name">${name}</div>
          <div class="tooltip-zona" style="color:${zonaColor}">Zona ${zona || "—"}</div>`;
}

// ---- TROCA DE ANO ----

async function changeYear(year) {
  currentYear = year;
  currentZona = null;
  currentTurno = "1";
  showLoading(true);
  setLoadingStatus(`Carregando dados de ${year}...`);

  const result = await loadYearData(year);
  if (result.error) {
    tseData = null;
    showDataErrorBanner(year, result.error);
  } else {
    hideNoBanner();
    buildZoneColors(getZonas());
    updateLegend(getZonas());
    displayTotaisGerais();
  }
  showLoading(false);
}

// ---- INICIALIZAÇÃO ----

async function init() {
  showLoading(true);
  setLoadingStatus("Inicializando mapa...");
  initMap();

  const yearSelect = document.getElementById("year-select");
  if (yearSelect) yearSelect.value = currentYear;

  setLoadingStatus("Carregando locais de votação...");
  await loadLocaisVotacao(); // dado geográfico (geometria), reaproveitado de 2024 — serve de base pra Voronoi

  setLoadingStatus(`Carregando dados eleitorais de ${currentYear}...`);
  const result = await loadYearData(currentYear);
  if (result.ok) buildZoneColors(getZonas());

  setLoadingStatus("Buscando contorno de Cotia (OpenStreetMap)...");
  const municipioGeoJSON = await fetchCotiaMunicipio(setLoadingStatus);
  if (municipioGeoJSON) {
    renderMascaraExterna(municipioGeoJSON);
    renderMunicipio(municipioGeoJSON);
    localizarUsuario(municipioGeoJSON);
  }

  setLoadingStatus("Buscando bairros (Overpass API)...");
  let bairrosGeoJSON = await fetchCotiaBairros(setLoadingStatus);
  const osmPolygons =
    bairrosGeoJSON?.features?.filter((f) => {
      const t = f.geometry?.type;
      return t === "Polygon" || t === "MultiPolygon";
    }) || [];

  const locais = getLocaisVotacao();
  if (osmPolygons.length < 5 && locais.length) {
    setLoadingStatus("Gerando bairros por proximidade (Voronoi)...");
    bairrosGeoJSON = computeVoronoiBairros(locais, municipioGeoJSON);
  }

  if (bairrosGeoJSON && bairrosGeoJSON.features.length > 0) {
    renderBairros(
      bairrosGeoJSON,
      BAIRRO_ZONA_MAP,
      (feature, zona) => {
        const name = feature.properties.name || feature.properties.nome || "Bairro";
        displayZona(name, zona);
      },
      null,
      getTooltipContentGeral
    );
  }

  if (result.error) {
    showDataErrorBanner(currentYear, result.error);
  } else {
    if (getZonas().length) updateLegend(getZonas());
    displayTotaisGerais();
  }

  showLoading(false);
}

window.addEventListener("DOMContentLoaded", init);
