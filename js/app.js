/**
 * app.js — Lógica principal da aplicação Mapa Eleitoral de Cotia 2024.
 *
 * Fluxo:
 * 1. Carrega dados TSE (./data/tse_cotia_2024.json)
 * 2. Inicia mapa Leaflet
 * 3. Busca contorno do município + bairros via Overpass API
 * 4. Renderiza mapa interativo
 * 5. Mostra dados eleitorais ao clicar/hover em bairros
 */

// ---- MAPEAMENTO BAIRRO → ZONA ELEITORAL ----
// Fonte: TSE - Eleitorado por Local de Votação 2024 (eleitorado_local_votacao_2024_SP.csv)
//
// Zonas de Cotia/SP nas Eleições Municipais 2024:
//   227 → Cotia sede + Granja Viana + bairros urbanos/suburbanos
//   286 → Caucaia do Alto + região rural e periférica
//
// Mapeamento exato baseado nos endereços dos locais de votação do TSE.
// Chave: substring do nome do bairro (lowercase) → número da zona TSE.
const BAIRRO_ZONA_MAP_DEFAULT = {
  // === ZONA 227 ===
  "caputera": "227",
  "centro": "227",         // Centro de Cotia (sede)
  "chácara canta galo": "227",
  "chácara vista alegre": "227",
  "granja viana": "227",   // Granja Viana → Zona 227
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
  "caucaia": "286",        // Caucaia do Alto → Zona 286
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
let currentZona = null;
let currentBairroNome = null;    // chave de lookup em votosPorBairro
let currentBairroDisplay = null; // nome exibido no header
let currentTab = "prefeito";   // "prefeito" | "vereadores"
let currentTurno = "1";
let bairroZonaMap = { ...BAIRRO_ZONA_MAP_DEFAULT };
let currentVereadorFiltro = ""; // "" = todos
let currentVereadorOrdem = "votos"; // "votos" | "nome"

// ---- UTILITÁRIOS ----

/**
 * Retorna a lista de candidatos de um cargo para um bairro,
 * enriquecida com situacao+partido dos totais do TSE.
 * Retorna [] se não houver dados.
 */
function getBairroCandidatos(bairroNome, cargo) {
  if (!votosPorBairro || !bairroNome) return [];
  const data = votosPorBairro[bairroNome] || votosPorBairro[bairroNome.toUpperCase()];
  if (!data || !data[cargo]) return [];

  // Enriquece com situacao + partido dos totais do TSE
  const totais = getTotais();
  const allCands = totais?.[cargo]?.["1"] || [];
  const meta = {};
  for (const c of allCands) meta[c.nome] = c;

  return data[cargo].map(c => ({
    nome: c.nome,
    votos: c.votos,
    situacao: meta[c.nome]?.situacao || "",
    partido:  meta[c.nome]?.partido  || "",
  }));
}

function setLoadingStatus(text) {
  const el = document.getElementById("loading-status");
  if (el) el.textContent = text;
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "flex" : "none";
}

function toggleExtra(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const hidden = el.style.display === "none";
  el.style.display = hidden ? "block" : "none";
  btn.textContent = hidden ? "Ver menos ▲" : `Ver mais ${el.children.length} candidatos ▼`;
}

/** Alterna entre as abas Prefeito / Vereadores e re-renderiza o conteúdo. */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".cargo-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  if (currentBairroNome) {
    renderConteudoSidebarBairro(currentBairroDisplay, currentBairroNome);
  } else {
    renderConteudoSidebarTotais();
  }
}

/** Alterna o turno (só aplicável a prefeito) */
function switchTurno(turno) {
  currentTurno = turno;
  switchTab(currentTab);
}

// ---- RENDERIZAÇÃO DO SIDEBAR ----

/** Gera HTML das abas Prefeito / Vereadores */
function renderCargoTabs() {
  return `
    <div class="cargo-tabs">
      <button class="cargo-tab ${currentTab === "prefeito" ? "active" : ""}"
              data-tab="prefeito" onclick="switchTab('prefeito')">Prefeito</button>
      <button class="cargo-tab ${currentTab === "vereadores" ? "active" : ""}"
              data-tab="vereadores" onclick="switchTab('vereadores')">Vereadores</button>
    </div>`;
}

function showPlaceholder() {
  currentBairroNome = null;
  currentBairroDisplay = null;
  currentZona = null;
  document.getElementById("sidebar-header").innerHTML = `<h2>Selecione um bairro</h2>`;
  document.getElementById("sidebar-content").innerHTML = `
    <div class="placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
      <p>Clique em um bairro ou local de votação no mapa para ver os resultados eleitorais por zona.</p>
    </div>`;
}

function showNoBairroData(bairroName) {
  document.getElementById("sidebar-content").innerHTML = `
    <div class="placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Bairro "<strong>${bairroName}</strong>" sem zona eleitoral mapeada.</p>
    </div>`;
}

/** Renderiza aba Prefeito (zona específica ou totais) */
function renderAbaPrefeito(prefData, label) {
  const prefT1 = prefData?.["1"] || [];
  const prefT2 = prefData?.["2"] || [];
  const hasTurno2 = prefT2.length > 0;
  let html = `<div class="election-section">`;
  html += `<div class="section-title"><div class="dot" style="background:#e94560"></div>${label}</div>`;
  if (hasTurno2) {
    html += `<div class="turno-tabs">
      <button class="turno-tab ${currentTurno==="1"?"active":""}" onclick="switchTurno('1')">1º Turno</button>
      <button class="turno-tab ${currentTurno==="2"?"active":""}" onclick="switchTurno('2')">2º Turno</button>
    </div>`;
  } else if (prefT1.length) {
    html += `<div class="turno-tabs"><button class="turno-tab active">1º Turno</button></div>`;
  }
  const candidatos = (hasTurno2 ? prefData[currentTurno] : prefT1) || [];
  html += `<div class="candidate-list">${renderPrefeito(candidatos, currentTurno)}</div></div>`;
  return html;
}

/**
 * Destaca no mapa os bairros onde o vereador teve votos.
 * Usa dados por bairro (votosPorBairro) quando disponíveis; caso contrário
 * usa dados agregados por zona eleitoral como fallback.
 */
function highlightVereadorOnMap(nomeVereador) {
  if (!neighborhoodLayer) return;

  if (!nomeVereador) {
    resetBairrosStyle();
    return;
  }

  // --- Tenta usar dados por bairro ---
  if (votosPorBairro && Object.keys(votosPorBairro).length > 0) {
    // Calcula o máximo de votos em qualquer bairro para normalizar intensidade
    // Usa getVotosVereadorBairro que resolve urna→nome-completo automaticamente
    let maxVotos = 1;
    for (const bairroKey of Object.keys(votosPorBairro)) {
      const v = getVotosVereadorBairro(bairroKey, nomeVereador) || 0;
      if (v > maxVotos) maxVotos = v;
    }

    neighborhoodLayer.eachLayer((layer) => {
      if (!layer.feature) return;
      const bairroNome = layer.feature.properties.name || layer.feature.properties.nome || "";
      const zona = layer.feature.properties._zona;
      const votos = getVotosVereadorBairro(bairroNome, nomeVereador) || 0;

      if (votos > 0) {
        const intensity = maxVotos > 0 ? votos / maxVotos : 0;
        layer.setStyle({
          fillColor:   "#29b6f6",
          fillOpacity: 0.3 + intensity * 0.55,
          color:       "#81d4fa",
          weight:      2,
          opacity:     1,
          dashArray:   null,
        });
      } else {
        layer.setStyle(getFeatureStyle(layer.feature, zona));
      }
    });
    return;
  }

  // --- Fallback: usa votos por zona eleitoral ---
  const zonas = getZonas();
  const votosPorZona = {};
  let maxVotos = 1;
  for (const zona of zonas) {
    const zonaData = getZonaData(zona);
    const candidatos = zonaData?.vereadores?.["1"] || [];
    const c = candidatos.find(x => x.nome === nomeVereador);
    votosPorZona[zona] = c?.votos || 0;
    if (votosPorZona[zona] > maxVotos) maxVotos = votosPorZona[zona];
  }

  neighborhoodLayer.eachLayer((layer) => {
    if (!layer.feature) return;
    const zona = layer.feature.properties._zona;
    const votos = zona ? (votosPorZona[zona] || 0) : 0;

    if (votos > 0) {
      const intensity = maxVotos > 0 ? votos / maxVotos : 0;
      layer.setStyle({
        fillColor:   "#29b6f6",
        fillOpacity: 0.3 + intensity * 0.55,
        color:       "#81d4fa",
        weight:      2,
        opacity:     1,
        dashArray:   null,
      });
    } else {
      layer.setStyle(getFeatureStyle(layer.feature, zona));
    }
  });
}

/** Filtra vereadores pelo nome selecionado no combobox e re-renderiza. */
function filtrarVereador(nome) {
  currentVereadorFiltro = nome;
  highlightVereadorOnMap(nome);
  renderRankingBox(nome, votosPorBairro);
  switchTab("vereadores");
}

/** Alterna a ordenação da lista de vereadores. */
function setVereadorOrdem(ordem) {
  currentVereadorOrdem = ordem;
  switchTab(currentTab);
}

/** Renderiza aba Vereadores: toggle de ordem + combobox + lista */
function renderAbaVereadores(verData, uid) {
  const verT1 = verData?.["1"] || [];
  if (!verT1.length) return `<p style="color:var(--text-muted);padding:12px 0;font-size:.8rem">Nenhum dado de vereadores.</p>`;

  // Usa o maior valor de votos da lista original (não ordenada) para as barras
  const maxVotos = Math.max(...verT1.map(c => c.votos), 1);
  const extraId  = `${uid}-nao-eleitos`;

  // Ordena cópia conforme preferência do usuário
  const sorted = [...verT1].sort((a, b) =>
    currentVereadorOrdem === "nome"
      ? a.nome.localeCompare(b.nome, "pt-BR")
      : b.votos - a.votos
  );

  const eleitos    = sorted.filter(c => isEleito(c));
  const naoEleitos = sorted.filter(c => !isEleito(c));

  // Stats
  let html = `
    <div class="ver-stats">
      <div class="ver-stat eleitos-stat">
        <span class="ver-stat-num">${eleitos.length}</span>
        <span class="ver-stat-label">Eleitos</span>
      </div>
      <div class="ver-stat">
        <span class="ver-stat-num">${verT1.length}</span>
        <span class="ver-stat-label">Candidatos</span>
      </div>
      <div class="ver-stat">
        <span class="ver-stat-num">${formatVotos(totalVotos(verT1))}</span>
        <span class="ver-stat-label">Total Votos</span>
      </div>
    </div>`;

  // Toggle de ordenação
  html += `
    <div class="ver-sort-row">
      <span class="ver-sort-label">Ordenar:</span>
      <button class="ver-sort-btn${currentVereadorOrdem === "votos" ? " active" : ""}"
              onclick="setVereadorOrdem('votos')">Votos ▼</button>
      <button class="ver-sort-btn${currentVereadorOrdem === "nome" ? " active" : ""}"
              onclick="setVereadorOrdem('nome')">A–Z</button>
    </div>`;

  // Combobox — usa sempre a lista completa dos totais gerais, ordenada por A-Z
  const allVerT1 = getTotais()?.vereadores?.["1"] || verT1;
  const comboSorted = [...allVerT1].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const options = comboSorted.map(c =>
    `<option value="${c.nome}" ${currentVereadorFiltro === c.nome ? "selected" : ""}>${c.nome} (${c.partido || "?"})</option>`
  ).join("");
  html += `
    <div class="ver-select-wrapper">
      <label class="ver-select-label">Buscar vereador</label>
      <select class="ver-select" onchange="filtrarVereador(this.value)">
        <option value="">— Todos os candidatos —</option>
        ${options}
      </select>
    </div>`;

  // Filtro ativo: exibe apenas o candidato selecionado
  if (currentVereadorFiltro) {
    const candidato = sorted.find(c => c.nome === currentVereadorFiltro);
    if (candidato) {
      const dotColor = isEleito(candidato) ? "#4caf50" : "#607d8b";
      const label    = isEleito(candidato) ? "Eleito" : "Não Eleito";
      html += `
        <div class="election-section">
          <div class="section-title">
            <div class="dot" style="background:${dotColor}"></div>${label}
          </div>
          <div class="candidate-list">${renderCandidateCard(candidato, maxVotos)}</div>
        </div>`;
    }
    return html;
  }

  // Lista completa: eleitos em destaque, não eleitos colapsáveis
  if (eleitos.length) {
    html += `<div class="election-section">
      <div class="section-title"><div class="dot" style="background:#4caf50"></div>Eleitos (${eleitos.length})</div>
      <div class="candidate-list">${eleitos.map(c => renderCandidateCard(c, maxVotos)).join("")}</div>
    </div>`;
  }

  if (naoEleitos.length) {
    const SHOW = 8;
    const inicial  = naoEleitos.slice(0, SHOW);
    const restante = naoEleitos.slice(SHOW);
    html += `<div class="election-section">
      <div class="section-title"><div class="dot" style="background:#607d8b"></div>Não Eleitos (${naoEleitos.length})</div>
      <div class="candidate-list">
        ${inicial.map(c => renderCandidateCard(c, maxVotos)).join("")}
        ${restante.length ? `
          <div id="${extraId}" style="display:none">
            ${restante.map(c => renderCandidateCard(c, maxVotos)).join("")}
          </div>
          <button class="show-more" onclick="toggleExtra('${extraId}',this)">
            Ver mais ${restante.length} candidatos ▼
          </button>` : ""}
      </div>
    </div>`;
  }
  return html;
}

function fonteInfo() {
  return `<div class="fonte-info">
    Fonte: <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2024" target="_blank">
      TSE — Dados Abertos — Eleições 2024</a><br>
    Votação Nominal por Município e Zona
  </div>`;
}

/** Renderiza conteúdo do sidebar usando dados por bairro */
function renderConteudoSidebarBairro(bairroName, bairroNome) {
  const uid      = `b_${(bairroNome || "").replace(/\W/g, "_")}`;
  const prefList = getBairroCandidatos(bairroNome, "prefeito");
  const verList  = getBairroCandidatos(bairroNome, "vereadores");
  const totalPref = prefList.reduce((s, c) => s + c.votos, 0);

  let html = renderCargoTabs();

  if (!prefList.length && !verList.length) {
    html += `<div class="placeholder">
      <p>Dados do bairro não disponíveis.</p>
      <p style="font-size:0.75rem;margin-top:8px;color:var(--text-muted)">
        Execute: <code style="background:rgba(255,255,255,0.07);padding:2px 5px;border-radius:3px;color:#ffd54f">python scripts/download_secoes.py</code>
      </p>
    </div>`;
    html += fonteInfo();
    document.getElementById("sidebar-content").innerHTML = html;
    return;
  }

  html += `<div class="zona-info">
    <div class="zona-info-row"><span>Votos prefeito</span><strong>${formatVotos(totalPref)}</strong></div>
    <div class="zona-info-row"><span>Vereadores eleitos</span><strong>${countEleitos(verList)}</strong></div>
    <div class="zona-info-row"><span>Candidatos vereador</span><strong>${verList.length}</strong></div>
  </div>`;

  if (currentTab === "prefeito") {
    html += renderAbaPrefeito({ "1": prefList }, "Resultado — Prefeito");
  } else {
    html += renderAbaVereadores({ "1": verList }, uid);
  }

  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

/** Renderiza totais gerais */
function renderConteudoSidebarTotais() {
  const totais = getTotais();
  if (!totais) return;
  const prefT1 = totais.prefeito?.["1"] || [];
  const verT1  = totais.vereadores?.["1"] || [];
  let html = renderCargoTabs();
  html += `<div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${formatVotos(totalVotos(prefT1))}</div>
      <div class="stat-label">Votos Prefeito</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${countEleitos(verT1)}</div>
      <div class="stat-label">Vereadores Eleitos</div>
    </div>
  </div>`;
  if (currentTab === "prefeito") {
    html += renderAbaPrefeito(totais.prefeito, "Resultado — Prefeito (Total Geral)");
  } else {
    html += renderAbaVereadores(totais.vereadores, "totais");
  }
  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

/**
 * Gera o conteúdo HTML do tooltip de um bairro.
 * Usa dados por bairro (votosPorBairro). Reavaliado a cada abertura do tooltip.
 */
function getTooltipContent(feature, zona) {
  const name = feature.properties.name || feature.properties.nome || "Bairro";

  // Tenta nome exato e fallback em maiúsculas (normalização defensiva)
  const total = getTotalVotosBairro(name) ?? getTotalVotosBairro(name.toUpperCase());

  const zonaColor = zona && zoneColorMap[zona] ? zoneColorMap[zona] : "#888";
  let html = `<div class="tooltip-name">${name}</div>`;
  html += `<div class="tooltip-zona" style="color:${zonaColor}">Zona ${zona || "—"}</div>`;

  if (total !== null && total > 0) {
    html += `<div class="tooltip-votos">${formatVotos(total)} votos (prefeito)</div>`;
  }

  if (currentVereadorFiltro) {
    const votos = getVotosVereadorBairro(name, currentVereadorFiltro)
               ?? getVotosVereadorBairro(name.toUpperCase(), currentVereadorFiltro);
    if (votos !== null) {
      const label = votos > 0
        ? `<strong style="color:#ffd54f">${formatVotos(votos)}</strong> votos`
        : `Sem votos`;
      html += `<div class="tooltip-zona" style="color:#ffd54f;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15)">${currentVereadorFiltro.split(" ")[0]}: ${label}</div>`;
    }
  }

  return html;
}

function displayBairroData(displayName, bairroNome, zonaNum) {
  currentBairroNome    = bairroNome;
  currentBairroDisplay = displayName;
  currentZona          = zonaNum;

  const total = getTotalVotosBairro(bairroNome);
  let badge = "";
  if (total !== null && total > 0) {
    badge = `<span class="zona-badge" style="background:rgba(233,69,96,0.15);color:#e94560;border:1px solid rgba(233,69,96,0.3)">
      ${formatVotos(total)} votos
    </span>`;
  } else if (zonaNum) {
    const zonaColor = zoneColorMap[zonaNum] || "#888";
    badge = `<span class="zona-badge" style="background:${zonaColor}20;color:${zonaColor};border:1px solid ${zonaColor}50">
      Zona ${zonaNum}
    </span>`;
  }

  document.getElementById("sidebar-header").innerHTML = `<h2>${displayName}</h2>${badge}`;
  renderConteudoSidebarBairro(displayName, bairroNome);
}

// Mantido por compatibilidade com marcadores de locais de votação
function displayZonaData(bairroName, zonaNum) {
  displayBairroData(bairroName, bairroName, zonaNum);
}

/** Exibe dados de uma escola (local de votação) no sidebar ao clicar no marcador. */
function displayEscolaData(escola) {
  currentBairroNome    = null;
  currentBairroDisplay = null;
  currentZona          = null;

  const temDados = escola.votos_prefeito > 0 && escola.eleitores > 0;
  const abstNum  = temDados
    ? Math.round((escola.eleitores - escola.votos_prefeito) / escola.eleitores * 100)
    : null;
  const cor = abstNum !== null ? corAbstencao(abstNum) : "#ffd54f";

  const zonaColor = zoneColorMap[escola.zona] || "#888";
  document.getElementById("sidebar-header").innerHTML = `
    <h2>${escola.nome}</h2>
    <span class="zona-badge" style="background:${zonaColor}20;color:${zonaColor};border:1px solid ${zonaColor}50">
      Zona ${escola.zona}
    </span>`;

  let html = `<div class="zona-info">`;
  html += `<div class="zona-info-row"><span>Bairro</span><strong>${escola.bairro}</strong></div>`;
  if (escola.endereco) {
    html += `<div class="zona-info-row"><span>Endereço</span><strong style="font-size:0.78rem">${escola.endereco}</strong></div>`;
  }
  html += `<div class="zona-info-row"><span>Seções</span><strong>${escola.secoes}</strong></div>`;
  html += `</div>`;

  if (temDados) {
    html += `<div class="zona-info" style="margin-top:8px">
      <div class="zona-info-row"><span>Eleitores registrados</span><strong>${escola.eleitores.toLocaleString("pt-BR")}</strong></div>
      <div class="zona-info-row"><span>Votos (prefeito)</span><strong>${escola.votos_prefeito.toLocaleString("pt-BR")}</strong></div>
      <div class="zona-info-row">
        <span>Abstenção</span>
        <strong style="color:${cor}">${abstNum}%</strong>
      </div>
    </div>`;
  } else if (escola.eleitores > 0) {
    html += `<div class="zona-info" style="margin-top:8px">
      <div class="zona-info-row"><span>Eleitores registrados</span><strong>${escola.eleitores.toLocaleString("pt-BR")}</strong></div>
    </div>`;
  }

  html += fonteInfo();
  document.getElementById("sidebar-content").innerHTML = html;
}

function displayTotaisGerais() {
  document.getElementById("sidebar-header").innerHTML = `
    <h2>Cotia — Total Geral</h2>
    <span class="zona-badge" style="background:rgba(233,69,96,0.15);color:#e94560;border:1px solid rgba(233,69,96,0.3)">
      Todas as Zonas
    </span>`;
  renderConteudoSidebarTotais();
}

// ---- BANNER SEM DADOS ----

function showNoBanner(message) {
  const banner = document.getElementById("no-data-banner");
  if (banner) {
    banner.style.display = "block";
    banner.innerHTML = message;
  }
}

// ---- CONTROLES ----

function setupControls() {
  // Os controles de cargo agora são as abas no sidebar (cargo-tabs).
  // Mantemos o cargo-select do header oculto por compatibilidade.
  const cargoSel = document.getElementById("cargo-select");
  if (cargoSel) cargoSel.closest(".control-group")?.remove();
  const turnoSel = document.getElementById("turno-select");
  if (turnoSel) turnoSel.closest(".control-group")?.remove();
}

// ---- INICIALIZAÇÃO ----

async function init() {
  showLoading(true);
  setLoadingStatus("Inicializando mapa...");

  // 1. Inicializa o mapa
  initMap();

  // 2. Carrega dados TSE
  setLoadingStatus("Carregando dados eleitorais...");
  const tseResult = await loadTSEData();

  // 2b. Carrega dados auxiliares em paralelo
  // loadLocaisVotacao deve completar antes de loadVotosPorEscola (que mescla no escolasSummary)
  const [bairroResult, locaisResult] = await Promise.all([
    loadVotosPorBairro(),
    loadLocaisVotacao(),
  ]);
  if (bairroResult.ok) {
    console.log(`Votos por bairro: ${bairroResult.count} bairros`);
    buildNomeMapping(); // constrói mapeamento urna→nome-completo
  } else {
    console.log("Votos por bairro não disponíveis:", bairroResult.error);
  }
  if (locaisResult.ok) console.log(`Locais de votação: ${locaisResult.count} seções, ${locaisResult.escolas} escolas`);
  else console.log("Locais de votação não disponíveis:", locaisResult.error);

  // Carrega votos por escola APÓS locais (mescla no escolasSummary)
  const escolaResult = await loadVotosPorEscola();
  if (escolaResult.ok) console.log(`Votos por escola: ${escolaResult.count} escolas, ${escolaResult.total?.toLocaleString("pt-BR")} votos`);
  else console.log("Votos por escola não disponíveis:", escolaResult.error);

  if (tseResult.error) {
    let banner = "";
    if (tseResult.error === "not_found" || tseResult.error === "cors_or_network") {
      banner = `
        ⚠️ Arquivo de dados não encontrado.
        Execute: <code>cd scripts && pip install -r requirements.txt && python download_tse.py</code>
        Em seguida, sirva a aplicação com: <code>python3 -m http.server 8080</code>
        e acesse <code>http://localhost:8080</code>
      `;
    } else {
      banner = `⚠️ Erro ao carregar dados TSE: ${tseResult.error}`;
    }
    showNoBanner(banner);
    document.getElementById("no-data-banner").style.display = "block";
    console.warn("TSE data not loaded:", tseResult.error);
  } else {
    // Dados carregados com sucesso
    const zonasList = getZonas();
    buildZoneColors(zonasList);
    setupControls();

    // Enriquecer mapeamento bairro→zona com os dados reais do TSE
    const tseMapFromJson = tseData && tseData.bairro_zona_map ? tseData.bairro_zona_map : {};
    for (const [bairro, zona] of Object.entries(tseMapFromJson)) {
      bairroZonaMap[bairro] = zona;
      // Também adicionar versão sem acentos
      bairroZonaMap[bairro.normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = zona;
    }

    // Mostra totais gerais por padrão
    displayTotaisGerais();
  }

  // 3. Busca contorno do município e aplica máscara branca fora de Cotia
  setLoadingStatus("Buscando contorno de Cotia (OpenStreetMap)...");
  const municipioGeoJSON = await fetchCotiaMunicipio(setLoadingStatus);
  if (municipioGeoJSON) {
    renderMascaraExterna(municipioGeoJSON);  // máscara branca externa (abaixo)
    renderMunicipio(municipioGeoJSON);       // borda do município (acima)
  }

  // 4. Busca bairros via OSM; se não retornar polígonos, usa Voronoi dos locais de votação
  setLoadingStatus("Buscando bairros (Overpass API)...");
  let bairrosGeoJSON = await fetchCotiaBairros(setLoadingStatus);

  const osmPolygons = bairrosGeoJSON?.features?.filter(f => {
    const t = f.geometry?.type;
    return t === "Polygon" || t === "MultiPolygon";
  }) || [];

  const locais = getLocaisVotacao();
  if (osmPolygons.length < 5 && municipioGeoJSON && locais.length) {
    setLoadingStatus("Gerando bairros por proximidade (Voronoi)...");
    bairrosGeoJSON = computeVoronoiBairros(locais, municipioGeoJSON);
    if (bairrosGeoJSON) {
      console.log(`Voronoi: ${bairrosGeoJSON.features.length} bairros gerados.`);
    }
  }

  if (bairrosGeoJSON && bairrosGeoJSON.features.length > 0) {
    renderBairros(
      bairrosGeoJSON,
      bairroZonaMap,
      // onClick
      (feature, zona) => {
        const name = feature.properties.name || feature.properties.nome || "Bairro";
        displayBairroData(name, name, zona);
      },
      // onHover — não utilizado (tooltip usa função dinâmica)
      null,
      // onGetTooltipContent — função reavaliada a cada abertura do tooltip
      getTooltipContent
    );
    console.log(`${bairrosGeoJSON.features.length} bairros renderizados.`);
  } else {
    console.warn("Nenhum bairro encontrado.");
  }

  // 5. Renderiza escolas (locais de votação) como marcadores amarelos
  const escolas = getEscolasSummary();
  if (escolas.length > 0) {
    setLoadingStatus("Renderizando locais de votação...");
    renderEscolas(escolas, displayEscolaData);
    console.log(`${escolas.length} locais de votação renderizados.`);
  }

  showLoading(false);
}

// ---- START ----
window.addEventListener("DOMContentLoaded", init);
