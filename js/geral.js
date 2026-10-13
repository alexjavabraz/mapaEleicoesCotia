/**
 * geral.js — Página de Eleições Gerais (Presidente, Governador, Senador,
 * Deputado Federal, Deputado Estadual) com seletor de ano (2022 / 2026).
 *
 * Reaproveita de tse.js as funções genéricas (formatVotos, renderCandidateCard,
 * renderPrefeito, renderVereadores, getZonas, getZonaData, getTotais,
 * loadLocaisVotacao) e toda a infraestrutura de mapa de map.js.
 *
 * Quando cotia_votos_por_bairro_<ano>.json estiver disponível, o clique num
 * bairro mostra os dados reais daquele bairro. Caso contrário, cai para os
 * dados da zona eleitoral correspondente.
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
let currentYear  = "2026"; // 2026 publicado pelo TSE em 11/10/2026 (pós-apuração 1º turno)
let currentCargo = "presidente";
let currentTurno = "1";
let currentZona  = null;
let currentBairroGeral = null;   // nome do bairro selecionado (chave em votosPorBairroGeral)
let votosPorBairroGeral = null;  // dados de cotia_votos_por_bairro_<ano>.json

// Candidato atualmente destacado no mapa (highlight por clique no ícone)
let candidatoDestaque = null;  // { nome, cor } ou null

// Cores pré-definidas por nome de urna (maiúsculas) — usadas pelo seletor de cor
// Ordem: PT vermelho, PL azul, outros cores distintas
const CORES_CANDIDATO_PADRAO = {
  // 2026 — Presidente
  "LULA":                      "#e53935", // vermelho PT
  "FLAVIO BOLSONARO":          "#1e88e5", // azul PL
  "ESCRITOR AUGUSTO CURY":     "#f9a825", // âmbar
  "RENAN SANTOS":              "#7b1fa2", // roxo
  "RONALDO CAIADO":            "#00897b", // teal
  "ZEMA":                      "#43a047", // verde
  // 2026 — Governador
  "TARCÍSIO":                  "#1565c0", // azul escuro
  "FERNANDO HADDAD":           "#c62828", // vermelho
  "VERA LÚCIA":                "#6a1b9a", // roxo escuro
  // 2022 — Presidente
  "JAIR BOLSONARO":            "#1e88e5", // azul PL
  // 2022 — Governador
  "TARCISIO GOMES DE FREITAS": "#1565c0",
  "RODRIGO GARCIA":            "#fb8c00", // laranja
};

// Paleta de cores disponíveis no seletor (nome → hex)
const PALETA_CORES = [
  { label: "Vermelho",     value: "#e53935" },
  { label: "Azul",         value: "#1e88e5" },
  { label: "Azul escuro",  value: "#1565c0" },
  { label: "Verde",        value: "#43a047" },
  { label: "Âmbar",        value: "#f9a825" },
  { label: "Laranja",      value: "#fb8c00" },
  { label: "Roxo",         value: "#7b1fa2" },
  { label: "Teal",         value: "#00897b" },
  { label: "Rosa",         value: "#e91e63" },
  { label: "Cinza",        value: "#607d8b" },
];

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

/** Carrega cotia_votos_por_bairro_<ano>.json. Silencioso se o arquivo não existir. */
async function loadVotosPorBairroGeral(year) {
  const cfg = ELECTION_YEARS[year];
  if (!cfg?.bairroFile) { votosPorBairroGeral = null; return { error: "no_file" }; }
  try {
    const r = await fetch(cfg.bairroFile);
    if (!r.ok) { votosPorBairroGeral = null; return { error: r.status }; }
    votosPorBairroGeral = await r.json();
    return { ok: true, bairros: Object.keys(votosPorBairroGeral.bairros || {}).length };
  } catch (e) {
    votosPorBairroGeral = null;
    return { error: e.message };
  }
}

/**
 * Normaliza o nome de um bairro para lookup em votosPorBairroGeral.
 * O JSON usa maiúsculas sem acento (ex: "GRANJA VIANA").
 * O GeoJSON do OSM pode usar capitalização mista (ex: "Granja Viana").
 */
function normBairro(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

/**
 * Retorna a lista de candidatos de um cargo para um bairro a partir dos
 * dados por bairro. Converte para o formato { nome, votos, situacao, partido }
 * enriquecendo com partido/situação dos totais TSE por zona.
 */
function getBairroCandidatosGeral(bairroKey, cargoKey) {
  if (!votosPorBairroGeral) return null;
  const dadosBairro = votosPorBairroGeral.bairros[bairroKey];
  if (!dadosBairro) return null;
  const lista = dadosBairro[cargoKey];
  if (!lista || !lista.length) return null;

  // Enriquece com partido e situação vindos dos totais do tseData (por zona)
  const metaMap = {};
  if (tseData) {
    const totais = tseData.totais?.[cargoKey]?.["1"] || [];
    for (const c of totais) metaMap[normBairro(c.nome)] = c;
  }

  return lista.map(c => {
    const meta = metaMap[normBairro(c.nome)] || {};
    return {
      nome:     c.nome,
      votos:    c.votos,
      partido:  meta.partido  || "",
      situacao: meta.situacao || "",
    };
  });
}

/**
 * Encontra a chave exata de um bairro no JSON de votos por bairro.
 * Tenta normalização progressiva: exato → maiúsculas → sem acento.
 */
function resolveBairroKey(nomeDisplay) {
  if (!votosPorBairroGeral) return null;
  const bairros = votosPorBairroGeral.bairros;

  // Tenta exato
  if (bairros[nomeDisplay]) return nomeDisplay;

  // Tenta maiúsculas
  const upper = nomeDisplay.toUpperCase();
  if (bairros[upper]) return upper;

  // Tenta normalizado sem acento
  const norm = normBairro(nomeDisplay);
  if (bairros[norm]) return norm;

  // Fuzzy: procura chave que contenha a palavra principal ou vice-versa
  for (const key of Object.keys(bairros)) {
    const keyNorm = normBairro(key);
    if (keyNorm.includes(norm) || norm.includes(keyNorm)) return key;
  }

  return null;
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
  candidatoDestaque = null; // limpa destaque ao trocar de cargo
  renderSidebar();
  if (!currentZona && !currentBairroGeral) colorirMapaPartidoVencedor();
}

function switchTurno(turno) {
  currentTurno = turno;
  candidatoDestaque = null;
  renderSidebar();
  if (!currentZona && !currentBairroGeral) colorirMapaPartidoVencedor();
}

function fonteInfo() {
  const cfg = ELECTION_YEARS[currentYear];
  return `<div class="fonte-info">
    Fonte: <a href="${cfg.datasetUrl}" target="_blank">TSE — Dados Abertos — Eleições ${currentYear}</a><br>
    Votação Nominal por Município e Zona
  </div>`;
}

// ---- HIGHLIGHT DE CANDIDATO NO MAPA ----

/**
 * Retorna a cor pré-definida de um candidato (pelo nome de urna normalizado).
 * Percorre CORES_CANDIDATO_PADRAO com correspondência parcial por palavra-chave.
 */
function getCorPadraoCandidat(nomeUrna) {
  const norm = normBairro(nomeUrna);
  for (const [key, cor] of Object.entries(CORES_CANDIDATO_PADRAO)) {
    if (normBairro(key) === norm) return cor;
    // Correspondência por palavra principal (ex: "TARCÍSIO" dentro de "TARCISIO GOMES DE FREITAS")
    const words = normBairro(key).split(" ").filter(w => w.length > 3);
    if (words.length && words.every(w => norm.includes(w))) return cor;
    if (norm.split(" ").filter(w => w.length > 3).every(w => normBairro(key).includes(w))) return cor;
  }
  return PALETA_CORES[Math.floor(Math.random() * PALETA_CORES.length)].value;
}

/**
 * Ativa/desativa o highlight de um candidato no mapa.
 * Chamado pelo clique no ícone de mapa do card de candidato.
 */
function toggleHighlightCandidat(nomeUrna, cor) {
  // Toggle: se já está ativo para este candidato, desativa
  if (candidatoDestaque && candidatoDestaque.nome === nomeUrna) {
    candidatoDestaque = null;
    colorirMapaPartidoVencedor(); // volta para coloração por partido vencedor
    renderSidebar();              // re-renderiza para atualizar o ícone ativo
    return;
  }
  candidatoDestaque = { nome: nomeUrna, cor };
  aplicarHighlightCandidato();
  renderSidebar();
}

/**
 * Pinta os bairros onde o candidatoDestaque venceu com a cor escolhida;
 * os demais ficam esmaecidos (transparente + borda fraca).
 */
function aplicarHighlightCandidato() {
  if (!neighborhoodLayer || !candidatoDestaque) return;

  const { nome, cor } = candidatoDestaque;
  const normNome = normBairro(nome);

  neighborhoodLayer.eachLayer((layer) => {
    if (!layer.feature) return;
    const nomeFeat = layer.feature.properties.name || layer.feature.properties.nome || "";
    const zona = layer.feature.properties._zona;

    // Descobre quem venceu neste bairro para o cargo atual
    let vencedor = null;
    if (votosPorBairroGeral) {
      const bairroKey = resolveBairroKey(nomeFeat);
      if (bairroKey) {
        const lista = votosPorBairroGeral.bairros[bairroKey]?.[currentCargo];
        if (lista && lista.length) vencedor = normBairro(lista[0].nome);
      }
    }
    if (!vencedor && tseData && zona) {
      const lista = tseData.zonas[zona]?.[currentCargo]?.["1"] || [];
      if (lista.length) vencedor = normBairro(lista[0].nome);
    }

    const ganhou = vencedor && (vencedor === normNome ||
      normNome.split(" ").filter(w => w.length > 3).some(w => vencedor.includes(w)));

    if (ganhou) {
      layer.setStyle({
        fillColor:   cor,
        fillOpacity: 0.65,
        color:       cor,
        weight:      2.5,
        opacity:     1,
        dashArray:   null,
      });
    } else {
      layer.setStyle({
        fillColor:   "#000",
        fillOpacity: 0.08,
        color:       "rgba(255,255,255,0.15)",
        weight:      1,
        opacity:     0.5,
        dashArray:   "4 4",
      });
    }
  });
}

/**
 * Gera o HTML do ícone de mapa + seletor de cor para um candidato.
 * Só aparece para presidente e governador na visão geral (sem bairro selecionado).
 */
function renderIconeMapaCandidato(candidato) {
  if (currentBairroGeral) return ""; // não mostra no detalhe de bairro
  if (currentCargo !== "presidente" && currentCargo !== "governador") return "";

  const isAtivo = candidatoDestaque?.nome === candidato.nome;
  const corAtual = isAtivo
    ? candidatoDestaque.cor
    : getCorPadraoCandidat(candidato.nome);

  // ID único baseado no índice do nome (sem caracteres especiais)
  const id = "csel_" + normBairro(candidato.nome).replace(/\s+/g, "_").slice(0, 20);
  const nomeEsc = candidato.nome.replace(/'/g, "\\'").replace(/"/g, "&quot;");

  const opcoes = PALETA_CORES.map(p =>
    `<option value="${p.value}" ${p.value === corAtual ? "selected" : ""}>${p.label}</option>`
  ).join("");

  return `
    <div class="cand-map-ctrl${isAtivo ? " ativo" : ""}">
      <select id="${id}" class="cand-cor-select" title="Cor do destaque"
              onclick="event.stopPropagation()"
              onchange="if(candidatoDestaque&&candidatoDestaque.nome==='${nomeEsc}'){candidatoDestaque.cor=this.value;aplicarHighlightCandidato();}">
        ${opcoes}
      </select>
      <button class="cand-map-btn${isAtivo ? " ativo" : ""}"
              title="${isAtivo ? "Desativar destaque" : "Destacar bairros no mapa"}"
              onclick="toggleHighlightCandidat('${nomeEsc}', document.getElementById('${id}').value)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </button>
    </div>`;
}

/**
 * Versão da renderCargoSection para eleições gerais que injeta ícones de mapa
 * nos candidatos de Presidente e Governador na visão geral (totais).
 */
function renderCargoSectionGeral(cargoData, label) {
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
  const maxVotos = candidatos[0]?.votos || 1;
  const comIcone = currentCargo === "presidente" || currentCargo === "governador";

  let cardsHtml;
  if (comIcone && !currentBairroGeral) {
    // Renderiza cada card com o ícone de mapa injetado
    cardsHtml = candidatos.map(c =>
      renderCandidateCard(c, maxVotos, renderIconeMapaCandidato(c))
    ).join("");
    // Nota: se tiver destaque ativo, mostra botão para limpar
    if (candidatoDestaque) {
      cardsHtml += `<button class="limpar-destaque-btn" onclick="toggleHighlightCandidat('${candidatoDestaque.nome.replace(/'/g,"\\'")}', '')">
        ✕ Limpar destaque do mapa
      </button>`;
    }
  } else {
    const uid = `g_${currentCargo}`;
    const renderFn = candidatos.length > 15 ? renderVereadores : renderPrefeito;
    cardsHtml = renderFn(candidatos, currentTurno, uid);
  }

  html += `<div class="candidate-list">${cardsHtml}</div></div>`;
  return html;
}

function renderSidebarForZona(zonaNum) {
  const zonaData = getZonaData(zonaNum);
  const cfg = cargoCfg(currentCargo);
  let html = renderCargoTabs();

  // Aviso de dados parciais
  const yearCfg = ELECTION_YEARS[currentYear];
  if (yearCfg?.aviso) {
    html += `<div class="turno-aviso">⚠️ ${yearCfg.aviso}</div>`;
  }

  if (!zonaData) {
    html += `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Sem dados para esta zona.</p>`;
  } else {
    html += renderCargoSection(zonaData[currentCargo], `${cfg.label} — Zona ${zonaNum}`);
  }
  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

/**
 * Renderiza o sidebar para um bairro específico usando dados por bairro.
 * Se o bairro não estiver no JSON, cai para dados da zona.
 */
function renderSidebarBairro(displayName, bairroKey, zonaNum) {
  const cfg = cargoCfg(currentCargo);
  let html = renderCargoTabs();

  const yearCfg = ELECTION_YEARS[currentYear];
  if (yearCfg?.aviso) {
    html += `<div class="turno-aviso">⚠️ ${yearCfg.aviso}</div>`;
  }

  const candidatos = bairroKey ? getBairroCandidatosGeral(bairroKey, currentCargo) : null;

  if (candidatos && candidatos.length) {
    // Dados reais por bairro — adapta para o formato esperado por renderCargoSection
    // que recebe { "1": [...] }  (estrutura de turno)
    const cargoDataFake = { "1": candidatos };
    html += renderCargoSection(cargoDataFake, `${cfg.label} — ${displayName}`);
    html += `<div class="fonte-info" style="margin-top:6px">
      <span style="color:var(--text-muted);font-size:0.68rem">Dados reais por bairro · </span>
      <a href="${yearCfg?.datasetUrl || '#'}" target="_blank">TSE — Dados Abertos</a>
    </div>`;
  } else {
    // Fallback para zona
    const zonaData = getZonaData(zonaNum);
    if (!zonaData) {
      html += `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Sem dados para este bairro.</p>`;
    } else {
      html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px">
        (Sem dados específicos para este bairro — exibindo Zona ${zonaNum})
      </div>`;
      html += renderCargoSection(zonaData[currentCargo], `${cfg.label} — Zona ${zonaNum}`);
    }
    html += fonteInfo();
  }
  document.getElementById("sidebar-content").innerHTML = html;
}

function renderSidebarTotais() {
  const totais = getTotais();
  const cfg = cargoCfg(currentCargo);
  let html = renderCargoTabs();

  // Aviso de dados parciais (ex: só 1º turno disponível)
  const yearCfg = ELECTION_YEARS[currentYear];
  if (yearCfg?.aviso) {
    html += `<div class="turno-aviso">⚠️ ${yearCfg.aviso}</div>`;
  }

  if (!totais) {
    html += `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Dados ainda não disponíveis.</p>`;
  } else {
    html += renderCargoSectionGeral(totais[currentCargo], `${cfg.label} — Total Geral`);
  }
  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

function renderSidebar() {
  if (currentBairroGeral) {
    renderSidebarBairro(currentBairroGeral.display, currentBairroGeral.key, currentZona);
  } else if (currentZona) {
    renderSidebarForZona(currentZona);
  } else {
    renderSidebarTotais();
  }
}

function displayZona(displayName, zonaNum) {
  currentZona = zonaNum;
  const zonaColor = zoneColorMap[zonaNum] || "#888";

  // Resolve chave do bairro nos dados por bairro
  const bairroKey = resolveBairroKey(displayName);
  const temBairro = bairroKey !== null;

  currentBairroGeral = temBairro ? { display: displayName, key: bairroKey } : null;

  // Badge: mostra "bairro" se tiver dados por bairro, senão "zona"
  const badgeHtml = temBairro
    ? `<span class="zona-badge" style="background:rgba(76,175,80,0.15);color:#81c784;border:1px solid rgba(76,175,80,0.3)">
         dados por bairro
       </span>`
    : `<span class="zona-badge" style="background:${zonaColor}20;color:${zonaColor};border:1px solid ${zonaColor}50">
         Zona ${zonaNum}
       </span>`;

  document.getElementById("sidebar-header").innerHTML = `
    <div class="sidebar-header-row">
      <div>
        <h2>${displayName}</h2>
        ${badgeHtml}
      </div>
      <button class="ver-geral-btn" onclick="displayTotaisGerais()" title="Ver resultado geral de Cotia">
        Ver dados gerais
      </button>
    </div>`;

  if (temBairro) {
    renderSidebarBairro(displayName, bairroKey, zonaNum);
  } else {
    renderSidebarForZona(zonaNum);
  }
}

function displayTotaisGerais() {
  currentZona = null;
  currentBairroGeral = null;
  document.getElementById("sidebar-header").innerHTML = `
    <h2>Cotia — Total Geral</h2>
    <span class="zona-badge" style="background:rgba(233,69,96,0.15);color:#e94560;border:1px solid rgba(233,69,96,0.3)">
      Todas as Zonas
    </span>`;
  renderSidebarTotais();
  // Aplica destaque ativo ou coloração por partido
  if (candidatoDestaque) {
    aplicarHighlightCandidato();
  } else {
    colorirMapaPartidoVencedor();
  }
}

/** Tooltip de bairro: candidato vencedor (por bairro se disponível, senão por zona). */
function getTooltipContentGeral(feature, zona) {
  const name = feature.properties.name || feature.properties.nome || "Bairro";
  const zonaColor = zona && zoneColorMap[zona] ? zoneColorMap[zona] : "#888";
  let html = `<div class="tooltip-name">${name}</div>
              <div class="tooltip-zona" style="color:${zonaColor}">Zona ${zona || "—"}</div>`;

  const cargo = cargoCfg(currentCargo)?.label || currentCargo;
  let top = null;
  let fonte = "";

  // Tenta dados por bairro
  if (votosPorBairroGeral) {
    const bairroKey = resolveBairroKey(name);
    if (bairroKey) {
      const lista = votosPorBairroGeral.bairros[bairroKey]?.[currentCargo];
      if (lista && lista.length) {
        const nomeVenc = lista[0].nome;
        const totais = tseData?.totais?.[currentCargo]?.["1"] || [];
        const meta = totais.find(c => normBairro(c.nome) === normBairro(nomeVenc));
        top = { nome: lista[0].nome, votos: lista[0].votos, partido: meta?.partido || "" };
        fonte = "bairro";
      }
    }
  }

  // Fallback para zona
  if (!top && tseData && zona) {
    const candidatos = tseData.zonas[zona]?.[currentCargo]?.["1"] || [];
    if (candidatos.length) {
      top = candidatos[0];
      fonte = "zona";
    }
  }

  if (top) {
    const partido = (top.partido || "").toUpperCase();
    const corBadge = partido === "PT" ? "#c62828" : partido === "PL" ? "#1565c0" : "#607d8b";
    html += `<div style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15)">
      <span style="font-size:0.7rem;color:#aaa">${cargo}: </span>
      <strong style="color:#fff;font-size:0.8rem">${top.nome}</strong>
      ${top.partido ? `<span style="background:${corBadge};color:#fff;font-size:0.62rem;padding:1px 5px;border-radius:3px;margin-left:4px">${top.partido}</span>` : ""}
      <div style="font-size:0.7rem;color:#ccc;margin-top:2px">${formatVotos(top.votos)} votos${fonte === "bairro" ? " <span style='color:#81c784'>✓ por bairro</span>" : ""}</div>
    </div>`;
  }
  return html;
}

// ---- COLORAÇÃO DO MAPA POR PARTIDO VENCEDOR ----

/**
 * Retorna a cor de preenchimento para um bairro/zona.
 * Prioridade: dados reais do bairro > dados da zona.
 * PT → vermelho, PL → azul, outros → cinza.
 */
function getCorVencedorBairro(bairroNomeFeature, zona) {
  const CORES = { PT: { fill: "#c62828", opacity: 0.5 }, PL: { fill: "#1565c0", opacity: 0.5 } };
  const COR_OUTRO = { fill: "#607d8b", opacity: 0.30 };

  // --- Tenta dados reais por bairro ---
  if (votosPorBairroGeral) {
    const bairroKey = resolveBairroKey(bairroNomeFeature);
    if (bairroKey) {
      const lista = votosPorBairroGeral.bairros[bairroKey]?.[currentCargo];
      if (lista && lista.length) {
        const nomeVencedor = lista[0].nome;
        // Encontra partido nos metadados do tseData (totais)
        const totais = tseData?.totais?.[currentCargo]?.["1"] || [];
        const meta = totais.find(c => normBairro(c.nome) === normBairro(nomeVencedor));
        const partido = (meta?.partido || "").toUpperCase();
        return CORES[partido] || COR_OUTRO;
      }
    }
  }

  // --- Fallback: dados da zona ---
  if (!tseData || !zona) return null;
  const zonaData = tseData.zonas[zona];
  if (!zonaData) return null;
  const candidatos = zonaData[currentCargo]?.["1"] || [];
  if (!candidatos.length) return null;
  const partido = (candidatos[0].partido || "").toUpperCase();
  return CORES[partido] || COR_OUTRO;
}

/**
 * Pinta os polígonos do mapa com a cor do partido vencedor por bairro (ou zona).
 */
function colorirMapaPartidoVencedor() {
  if (!neighborhoodLayer) return;
  neighborhoodLayer.eachLayer((layer) => {
    if (!layer.feature) return;
    const zona = layer.feature.properties._zona;
    const nome = layer.feature.properties.name || layer.feature.properties.nome || "";
    const cor = getCorVencedorBairro(nome, zona);
    if (cor) {
      layer.setStyle({
        fillColor:   cor.fill,
        fillOpacity: cor.opacity,
        color:       "#e94560",
        weight:      1.5,
        opacity:     0.7,
        dashArray:   "5 4",
      });
    } else {
      layer.setStyle(getFeatureStyle(layer.feature, zona));
    }
  });
  atualizarLegendaPartidos();
}

/** Cria/atualiza a legenda de partidos no mapa (bottomright). */
let _legendaPartidosCtrl = null;
function atualizarLegendaPartidos() {
  if (_legendaPartidosCtrl) {
    _legendaPartidosCtrl.remove();
    _legendaPartidosCtrl = null;
  }

  if (!tseData) return;

  // Descobre quais partidos aparecem como vencedores
  const partidos = new Set();
  if (votosPorBairroGeral) {
    // Usa dados por bairro
    const totais = tseData.totais?.[currentCargo]?.["1"] || [];
    const metaMap = {};
    for (const c of totais) metaMap[normBairro(c.nome)] = c;

    for (const [bairro, cargos] of Object.entries(votosPorBairroGeral.bairros)) {
      const lista = cargos[currentCargo];
      if (lista && lista.length) {
        const meta = metaMap[normBairro(lista[0].nome)];
        if (meta?.partido) partidos.add(meta.partido.toUpperCase());
      }
    }
  } else {
    // Fallback: usa dados por zona
    for (const zona of getZonas()) {
      const candidatos = tseData.zonas[zona]?.[currentCargo]?.["1"] || [];
      if (candidatos.length) partidos.add((candidatos[0].partido || "").toUpperCase());
    }
  }

  const CORES_PARTIDO = { PT: "#c62828", PL: "#1565c0" };
  const itens = [...partidos].sort().map(p => ({
    partido: p,
    cor: CORES_PARTIDO[p] || "#607d8b",
    label: p,
  }));

  if (!itens.length) return;

  _legendaPartidosCtrl = L.control({ position: "bottomright" });
  _legendaPartidosCtrl.onAdd = () => {
    const div = L.DomUtil.create("div", "");
    div.id = "map-legend-partidos";
    const cargo = cargoCfg(currentCargo)?.label || currentCargo;
    const fonte = votosPorBairroGeral ? "por bairro" : "por zona";
    div.innerHTML = `
      <h4>${cargo} — vencedor</h4>
      ${itens.map(i => `
        <div class="legend-item">
          <div class="legend-color" style="background:${i.cor};opacity:0.85"></div>
          <span>${i.label}</span>
        </div>`).join("")}
      <div class="legend-item" style="margin-top:4px">
        <div class="legend-color" style="background:#607d8b;opacity:0.7"></div>
        <span>Outro partido</span>
      </div>
      <div style="font-size:0.62rem;color:var(--text-muted);margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px">
        Dados ${fonte}
      </div>
    `;
    return div;
  };
  _legendaPartidosCtrl.addTo(map);
}

// ---- TROCA DE ANO ----

async function changeYear(year) {
  currentYear = year;
  currentZona = null;
  currentBairroGeral = null;
  currentTurno = "1";
  candidatoDestaque = null;
  showLoading(true);
  setLoadingStatus(`Carregando dados de ${year}...`);

  const [result] = await Promise.all([
    loadYearData(year),
    loadVotosPorBairroGeral(year),
  ]);

  if (result.error) {
    tseData = null;
    showDataErrorBanner(year, result.error);
  } else {
    hideNoBanner();
    buildZoneColors(getZonas());
    updateLegend(getZonas());
    displayTotaisGerais();
    colorirMapaPartidoVencedor();
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
  const [result] = await Promise.all([
    loadYearData(currentYear),
    loadVotosPorBairroGeral(currentYear),
  ]);
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
    colorirMapaPartidoVencedor();
  }

  showLoading(false);
}

window.addEventListener("DOMContentLoaded", init);
