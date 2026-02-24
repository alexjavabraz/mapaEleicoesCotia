/**
 * tse.js — Carregamento e manipulação dos dados eleitorais do TSE.
 *
 * Tenta carregar ./data/tse_cotia_2024.json (gerado pelo script Python).
 * Se não encontrar, mostra instruções ao usuário.
 */

let tseData = null;
let votosPorBairro = null;  // dados de ./data/cotia_votos_por_bairro.json
let locaisVotacao = null;   // dados de ./data/cotia_locais_votacao.json (por seção)
let escolasSummary = null;  // dados agregados por local de votação (62 escolas)

/**
 * Carrega o arquivo JSON gerado pelo script download_tse.py
 */
async function loadTSEData() {
  try {
    const response = await fetch("./data/tse_cotia_2024.json");
    if (!response.ok) {
      if (response.status === 404) return { error: "not_found" };
      return { error: `http_${response.status}` };
    }
    tseData = await response.json();
    return { ok: true, data: tseData };
  } catch (err) {
    // Pode falhar com CORS se abrir como file:// sem servidor
    if (err.name === "TypeError") {
      return { error: "cors_or_network" };
    }
    return { error: err.message };
  }
}

/**
 * Carrega os votos por bairro (gerado por download_secoes.py).
 * Retorna { ok } ou { error } sem quebrar o app se o arquivo não existir.
 */
async function loadVotosPorBairro() {
  try {
    const r = await fetch("./data/cotia_votos_por_bairro.json");
    if (!r.ok) return { error: r.status === 404 ? "not_found" : `http_${r.status}` };
    votosPorBairro = await r.json();
    return { ok: true, count: Object.keys(votosPorBairro).length };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Carrega os locais de votação (cotia_locais_votacao.json — formato TSE bruto).
 * Transforma para o formato { bairro, lat, lng, zona, nome, endereco }.
 */
async function loadLocaisVotacao() {
  try {
    const r = await fetch("./data/cotia_locais_votacao.json");
    if (!r.ok) return { error: r.status === 404 ? "not_found" : `http_${r.status}` };
    const raw = await r.json();

    // Registros individuais por seção — usados para Voronoi de bairros
    locaisVotacao = raw
      .filter(l => l.NR_LATITUDE && l.NR_LONGITUDE && l.NM_BAIRRO)
      .map(l => ({
        bairro:   l.NM_BAIRRO || "",
        lat:      parseFloat(l.NR_LATITUDE),
        lng:      parseFloat(l.NR_LONGITUDE),
        zona:     String(l.NR_ZONA || ""),
        nome:     l.NM_LOCAL_VOTACAO || "",
        endereco: l.DS_ENDERECO || "",
      }))
      .filter(l => !isNaN(l.lat) && !isNaN(l.lng));

    // Agrega por local de votação (NR_LOCAL_VOTACAO) para exibir escolas no mapa
    const escolaMap = {};
    for (const l of raw) {
      const k = l.NR_LOCAL_VOTACAO;
      if (!k || !l.NR_LATITUDE || !l.NR_LONGITUDE) continue;
      if (!escolaMap[k]) {
        escolaMap[k] = {
          nr:       k,
          nome:     l.NM_LOCAL_VOTACAO || "",
          endereco: l.DS_ENDERECO || "",
          bairro:   l.NM_BAIRRO || "",
          zona:     String(l.NR_ZONA || ""),
          lat:      parseFloat(l.NR_LATITUDE),
          lng:      parseFloat(l.NR_LONGITUDE),
          eleitores: 0,
          secoes:    0,
        };
      }
      escolaMap[k].secoes++;
      escolaMap[k].eleitores += parseInt(l.QT_ELEITOR_ELEICAO_MUNICIPAL || 0);
    }
    escolasSummary = Object.values(escolaMap)
      .filter(e => !isNaN(e.lat) && !isNaN(e.lng));

    return { ok: true, count: locaisVotacao.length, escolas: escolasSummary.length };
  } catch (e) {
    return { error: e.message };
  }
}

function getLocaisVotacao() {
  return locaisVotacao || [];
}

function getEscolasSummary() {
  return escolasSummary || [];
}

/**
 * Retorna o total de votos registrados em um bairro (soma dos votos ao prefeito).
 * Retorna null se os dados por bairro não estiverem carregados.
 */
function getTotalVotosBairro(bairroNome) {
  if (!votosPorBairro || !bairroNome) return null;
  const data = votosPorBairro[bairroNome] || votosPorBairro[bairroNome.toUpperCase()];
  if (!data) return null;
  return (data.prefeito || []).reduce((s, c) => s + c.votos, 0);
}

/**
 * Retorna votos de um vereador em um bairro específico.
 * Retorna número ou null se não houver dados.
 */
function normalizeName(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

function getVotosVereadorBairro(bairroNome, vereadorNome) {
  if (!votosPorBairro || !bairroNome || !vereadorNome) return null;
  const data = votosPorBairro[bairroNome] || votosPorBairro[bairroNome.toUpperCase()];
  if (!data) return null;
  const normalizedNome = normalizeName(vereadorNome);
  const c = (data.vereadores || []).find(v => normalizeName(v.nome) === normalizedNome);
  return c ? c.votos : 0;
}

/**
 * Retorna as zonas disponíveis.
 */
function getZonas() {
  if (!tseData) return [];
  return tseData.zonas_lista || Object.keys(tseData.zonas || {});
}

/**
 * Retorna dados de uma zona específica.
 */
function getZonaData(zonaNum) {
  if (!tseData || !tseData.zonas) return null;
  return tseData.zonas[zonaNum] || null;
}

/**
 * Retorna os totais agregados de todas as zonas.
 */
function getTotais() {
  if (!tseData) return null;
  return tseData.totais || null;
}

/**
 * Formata número de votos.
 */
function formatVotos(n) {
  if (typeof n !== "number") n = parseInt(n) || 0;
  return n.toLocaleString("pt-BR");
}

/**
 * Retorna a classe CSS da situação do candidato.
 */
function getSituacaoClass(situacao) {
  const s = (situacao || "").toUpperCase();
  if (s.includes("ELEITO") && !s.includes("NÃO")) return "eleito";
  if (s.includes("2º TURNO") || s.includes("SEGUNDO TURNO")) return "segundo-turno";
  if (s.includes("SUPLENTE")) return "suplente";
  return "nao-eleito";
}

/**
 * Retorna a classe CSS do badge de situação.
 */
function getSituacaoBadgeClass(situacao) {
  const s = (situacao || "").toUpperCase();
  if (s.includes("ELEITO") && !s.includes("NÃO")) return "situacao-eleito";
  if (s.includes("2º TURNO") || s.includes("SEGUNDO TURNO")) return "situacao-segundo-turno";
  if (s.includes("SUPLENTE")) return "situacao-suplente";
  return "situacao-nao-eleito";
}

/**
 * Gera HTML do card de um candidato.
 */
function renderCandidateCard(candidato, maxVotos) {
  const pct = maxVotos > 0 ? (candidato.votos / maxVotos) * 100 : 0;
  const situacaoClass = getSituacaoClass(candidato.situacao);
  const badgeClass = getSituacaoBadgeClass(candidato.situacao);
  const barColor = situacaoClass === "eleito" ? "#4caf50" :
                   situacaoClass === "segundo-turno" ? "#ff9800" :
                   situacaoClass === "suplente" ? "#607d8b" : "#ef5350";

  const situacaoLabel = candidato.situacao
    ? `<span class="situacao-badge ${badgeClass}">${candidato.situacao}</span>`
    : "";

  return `
    <div class="candidate-card ${situacaoClass}">
      <div class="candidate-header">
        <div>
          <div class="candidate-name">${candidato.nome}</div>
          ${situacaoLabel}
        </div>
        <span class="candidate-partido">${candidato.partido || "??"}</span>
      </div>
      <div class="vote-bar-wrapper">
        <div class="vote-bar">
          <div class="vote-bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
        </div>
        <span class="vote-count">${formatVotos(candidato.votos)} votos</span>
      </div>
    </div>
  `;
}

/**
 * Renderiza a lista de candidatos a prefeito para uma zona/turno.
 */
function renderPrefeito(candidatos, turno) {
  if (!candidatos || candidatos.length === 0) {
    return `<p style="color:var(--text-muted);font-size:0.8rem;padding:8px 0">Nenhum dado disponível para o ${turno}º turno.</p>`;
  }

  const maxVotos = candidatos[0]?.votos || 1;
  return candidatos.map((c) => renderCandidateCard(c, maxVotos)).join("");
}

/**
 * Renderiza a lista de candidatos a vereador para uma zona/turno.
 * Mostra os top 15 e permite expandir.
 */
function renderVereadores(candidatos, turno, containerId) {
  if (!candidatos || candidatos.length === 0) {
    return `<p style="color:var(--text-muted);font-size:0.8rem;padding:8px 0">Nenhum dado disponível para o ${turno}º turno.</p>`;
  }

  const INITIAL_SHOW = 10;
  const maxVotos = candidatos[0]?.votos || 1;
  const inicial = candidatos.slice(0, INITIAL_SHOW);
  const restante = candidatos.slice(INITIAL_SHOW);

  let html = inicial.map((c) => renderCandidateCard(c, maxVotos)).join("");

  if (restante.length > 0) {
    html += `
      <div id="${containerId}-extra" style="display:none">
        ${restante.map((c) => renderCandidateCard(c, maxVotos)).join("")}
      </div>
      <button class="show-more" onclick="toggleExtra('${containerId}-extra', this)">
        Ver mais ${restante.length} candidatos ▼
      </button>
    `;
  }

  return html;
}

/**
 * Calcula total de votos de uma lista de candidatos.
 */
function totalVotos(candidatos) {
  if (!candidatos || !candidatos.length) return 0;
  return candidatos.reduce((sum, c) => sum + (c.votos || 0), 0);
}

/**
 * Retorna true se o candidato foi eleito.
 */
function isEleito(c) {
  const s = (c.situacao || "").toUpperCase();
  return s.includes("ELEITO") && !s.includes("NÃO");
}

/**
 * Retorna número de eleitos de uma lista de candidatos.
 */
function countEleitos(candidatos) {
  if (!candidatos) return 0;
  return candidatos.filter(isEleito).length;
}
