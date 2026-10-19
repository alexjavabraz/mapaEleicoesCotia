/**
 * i18n.js — Português (padrão) / inglês.
 *
 * Idioma: o escolhido no botão PT/EN (localStorage "lang"); sem escolha, inglês
 * se o navegador não estiver em português. Carregado no <head>, antes dos
 * outros scripts, que usam t("texto em português", { vars }) para traduzir.
 *
 * HTML estático: marque o elemento com data-i18n (o texto dele é a chave) e
 * atributos com data-i18n-placeholder / data-i18n-title / data-i18n-aria-label.
 * Nomes de candidatos, bairros, fornecedores e órgãos são dados e não mudam.
 */

const LANG = (() => {
  try {
    const salvo = localStorage.getItem("lang");
    if (salvo === "pt" || salvo === "en") return salvo;
  } catch (e) { /* storage bloqueado: segue o navegador */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "pt";
  return /^pt\b/i.test(nav) ? "pt" : "en";
})();
const LOCALE = LANG === "en" ? "en-US" : "pt-BR";

document.documentElement.lang = LANG === "en" ? "en" : "pt-BR";

const I18N_EN = {
  // ---- Header / navegação / títulos ----
  "Mapa Eleitoral — Cotia 2024": "Election Map — Cotia 2024",
  "Mapa Eleitoral — Cotia — Eleição Geral": "Election Map — Cotia — General Election",
  "Contas do Município — Cotia": "Municipal Spending — Cotia",
  "Mapa Eleitoral de Cotia": "Cotia Election Map",
  "Eleição Geral": "General Election",
  "Eleições Municipais 2024 — Cotia/SP": "2024 Municipal Elections — Cotia/SP",
  "Eleição Geral (2022/2026) →": "General Election (2022/2026) →",
  "Contas do Município →": "Municipal Spending →",
  "Contas do Município": "Municipal Spending",
  "← Eleição Municipal 2024": "← 2024 Municipal Election",
  "Eleição Municipal 2024": "2024 Municipal Election",
  "Presidente · Governador · Senador · Dep. Federal · Dep. Estadual — Cotia/SP":
    "President · Governor · Senator · Federal Deputy · State Deputy — Cotia/SP",

  // ---- Carregamento ----
  "Carregando dados...": "Loading data...",
  "Inicializando...": "Starting...",
  "Inicializando mapa...": "Starting map...",
  "Carregando dados eleitorais...": "Loading election data...",
  "Carregando dados eleitorais de {ano}...": "Loading {ano} election data...",
  "Carregando dados de {ano}...": "Loading {ano} data...",
  "Carregando locais de votação...": "Loading polling places...",
  "Buscando contorno de Cotia (OpenStreetMap)...": "Fetching Cotia boundary (OpenStreetMap)...",
  "Buscando bairros (Overpass API)...": "Fetching neighborhoods (Overpass API)...",
  "Buscando bairros no OpenStreetMap...": "Fetching neighborhoods from OpenStreetMap...",
  "Buscando contorno do município...": "Fetching city boundary...",
  "Overpass indisponível — usando contorno local de Cotia...": "Overpass unavailable — using local Cotia boundary...",
  "Gerando bairros por proximidade (Voronoi)...": "Building neighborhoods by proximity (Voronoi)...",
  "Renderizando locais de votação...": "Drawing polling places...",

  // ---- Sidebar ----
  "Selecione um bairro": "Select a neighborhood",
  "Clique em um bairro no mapa para ver os resultados eleitorais por zona eleitoral.":
    "Click a neighborhood on the map to see election results by electoral zone.",
  "Clique em um bairro ou local de votação no mapa para ver os resultados eleitorais por zona.":
    "Click a neighborhood or polling place on the map to see election results by zone.",
  "Clique em um bairro no mapa para ver os resultados da zona eleitoral.":
    "Click a neighborhood on the map to see the results for its electoral zone.",
  "Bairro \"{b}\" sem zona eleitoral mapeada.": "Neighborhood \"{b}\" has no mapped electoral zone.",
  "Prefeito": "Mayor",
  "Vereadores": "City Council",
  "1º Turno": "1st round",
  "2º Turno": "2nd round",
  "Nenhum dado de vereadores.": "No city council data.",
  "Eleitos": "Elected",
  "Não Eleitos": "Not elected",
  "Eleito": "Elected",
  "Não Eleito": "Not elected",
  "Candidatos": "Candidates",
  "Total Votos": "Total votes",
  "Ordenar:": "Sort:",
  "Votos ▼": "Votes ▼",
  "Buscar vereador": "Find a council candidate",
  "— Todos os candidatos —": "— All candidates —",
  "Ver mais {n} candidatos ▼": "Show {n} more candidates ▼",
  "Ver menos ▲": "Show less ▲",
  "Fonte": "Source",
  "TSE — Dados Abertos — Eleições {ano}": "TSE (Superior Electoral Court) — Open Data — {ano} Elections",
  "TSE — Dados Abertos": "TSE — Open Data",
  "Votação Nominal por Município e Zona": "Votes per candidate by municipality and zone",
  "Dados do bairro não disponíveis.": "Neighborhood data not available.",
  "Execute:": "Run:",
  "Votos prefeito": "Mayor votes",
  "Votos Prefeito": "Mayor votes",
  "Vereadores eleitos": "Council members elected",
  "Vereadores Eleitos": "Council members elected",
  "Candidatos vereador": "Council candidates",
  "Resultado — Prefeito": "Result — Mayor",
  "Resultado — Prefeito (Total Geral)": "Result — Mayor (overall total)",
  "Bairro": "Neighborhood",
  "Zona {z}": "Zone {z}",
  "{n} votos": "{n} votes",
  "{n} votos (prefeito)": "{n} votes (mayor)",
  "Sem votos": "No votes",
  "Endereço": "Address",
  "Seções": "Sections",
  "Eleitores registrados": "Registered voters",
  "Votos (prefeito)": "Votes (mayor)",
  "Abstenção": "Abstention",
  "% de Abstenção": "Abstention %",
  "Cotia — Total Geral": "Cotia — Overall total",
  "Total Geral": "Overall total",
  "Todas as Zonas": "All zones",
  "Arquivo de dados não encontrado.": "Data file not found.",
  "Em seguida, sirva a aplicação com:": "Then serve the app with:",
  "e acesse": "and open",
  "Erro ao carregar dados TSE:": "Error loading TSE data:",
  "Nenhum dado disponível para o {n}º turno.": "No data available for round {n}.",

  // ---- Mapa ----
  "Escuro": "Dark",
  "Claro": "Light",
  "Satélite": "Satellite",
  "Aproximar": "Zoom in",
  "Afastar": "Zoom out",
  "Sem nome": "Unnamed",
  "Votos por Bairro": "Votes by neighborhood",
  "Nenhum candidato selecionado": "No candidate selected",
  "Dados por bairro não disponíveis.": "Neighborhood data not available.",
  "Sem votos por bairro disponíveis": "No neighborhood votes available",
  "{v} votos em {n} bairros": "{v} votes in {n} neighborhoods",
  "{v} votos em {n} bairro": "{v} votes in {n} neighborhood",
  "Votos": "Votes",
  "Zonas Eleitorais": "Electoral zones",
  "{n} eleitores": "{n} voters",
  "{n} seções": "{n} sections",
  "{n} seção": "{n} section",
  "Você está aqui": "You are here",

  // ---- Eleição geral ----
  "2026 — 1º Turno": "2026 — 1st round",
  "Dados do 1º turno (04/10/2026). O 2º turno ocorre em 25/10/2026.":
    "1st-round data (Oct 4, 2026). The runoff takes place on Oct 25, 2026.",
  "Presidente": "President",
  "Governador": "Governor",
  "Senador": "Senator",
  "Dep. Federal": "Federal Deputy",
  "Dep. Estadual": "State Deputy",
  "Vermelho": "Red",
  "Azul": "Blue",
  "Azul escuro": "Dark blue",
  "Verde": "Green",
  "Âmbar": "Amber",
  "Laranja": "Orange",
  "Roxo": "Purple",
  "Teal": "Teal",
  "Rosa": "Pink",
  "Cinza": "Gray",
  "O TSE ainda não publicou os dados de votação de {ano} (só saem depois que a apuração termina).":
    "The TSE has not published the {ano} voting data yet (it is released after the count ends).",
  "Erro ao carregar dados de {ano}:": "Error loading {ano} data:",
  "Sem dados eleitorais de {ano} ainda.": "No {ano} election data yet.",
  "Ver votos por bairro de um candidato": "See a candidate's votes by neighborhood",
  "— Nenhum —": "— None —",
  "Dados por bairro não disponíveis para {ano}.": "Neighborhood data not available for {ano}.",
  "Cor do destaque": "Highlight color",
  "Desativar destaque": "Turn off highlight",
  "Destacar bairros no mapa": "Highlight neighborhoods on the map",
  "Candidato sem dados neste cargo.": "No data for this candidate in this office.",
  "Limpar filtro": "Clear filter",
  "Limpar destaque do mapa": "Clear map highlight",
  "Sem dados para esta zona.": "No data for this zone.",
  "Dados reais por bairro": "Actual neighborhood data",
  "Sem dados para este bairro.": "No data for this neighborhood.",
  "Sem dados específicos para este bairro — exibindo Zona {z}": "No specific data for this neighborhood — showing Zone {z}",
  "Dados ainda não disponíveis.": "Data not available yet.",
  "dados por bairro": "neighborhood data",
  "Ver resultado geral de Cotia": "See Cotia's overall result",
  "Ver dados gerais": "See overall data",
  "por bairro": "by neighborhood",
  "Dados por bairro": "Neighborhood data",
  "Dados por zona": "Zone data",
  "3 primeiros": "top 3",
  "cor = quem dos 3 venceu ali": "color = which of the 3 won there",

  // ---- Contas do Município ----
  "Evento": "Stage",
  "Ano": "Year",
  "Fornecedor / recebedor": "Supplier / payee",
  "Digite o nome ou CNPJ…": "Type a name or CNPJ (tax ID)…",
  "Limpar": "Clear",
  "Top 10 valores pagos": "Top 10 paid amounts",
  "Top 10 valores {ev}": "Top 10 {ev} amounts",
  "Recebedores": "Payees",
  "Registros (todos os eventos)": "Records (all stages)",
  "Último mês publicado": "Latest month published",
  "Evolução dos pagamentos por ano": "Payments by year",
  "Órgão": "Agency",
  "Top 10 pagamentos do ano": "Top 10 payments of the year",
  "Por ano": "By year",
  "Por mês": "By month",
  "Maiores recebedores": "Largest payees",
  "Por órgão": "By agency",
  "Agrupado por recebedor": "Grouped by payee",
  "Recebedor": "Payee",
  "Lançamentos": "Entries",
  "Valor": "Amount",
  "% do total": "% of total",
  "‹ Anterior": "‹ Previous",
  "Próxima ›": "Next ›",
  "Maiores pagamentos": "Largest payments",
  "Fechar": "Close",
  "Carregando contas…": "Loading spending data…",
  "Baixando dados do TCE-SP…": "Downloading TCE-SP data…",
  "Não foi possível carregar as contas ({erro}).": "Could not load the spending data ({erro}).",
  "Todos": "All",
  "despesas de {ini} a {fim}": "expenses from {ini} to {fim}",
  "{n} registros": "{n} records",
  "atualizado em {data}.": "updated {data}.",
  "CPF de pessoa física não é exibido.": "Individuals' CPF (personal tax ID) is not shown.",
  "Total {ev}": "Total {ev}",
  "Pessoa física": "Individual",
  "pessoa física": "individual",
  "{n} lançamentos": "{n} entries",
  "Ver todos": "Show all",
  "Data": "Date",
  "Empenho": "Commitment no.",
  "Valor {ev}": "Amount {ev}",
  "Nenhum lançamento {ev} em {ano}.": "No {ev} entries in {ano}.",
  "Nenhum lançamento {ev}.": "No {ev} entries.",
  "Valor {ev} por ano": "Amount {ev} by year",
  "Valor {ev} por mês — município": "Amount {ev} by month — whole city",
  "Nenhum recebedor encontrado.": "No payees found.",
  "{n} recebedores · página {p} de {total}": "{n} payees · page {p} of {total}",
  "Top 10 maiores valores {ev}": "Top 10 largest {ev} amounts",
  "Sem lançamentos.": "No entries.",
  "Top 10 recebedores ({ev})": "Top 10 payees ({ev})",
  "Sem recebedores.": "No payees.",
  "Prefeitura": "City Hall",
  "Câmara Municipal": "City Council",
  "Instituto de Previdência": "Pension Institute",
  "Todos os órgãos": "All agencies",
  "{quem} pagou {valor} em {ano}": "{quem} paid {valor} in {ano}",
  ", contra {valor} em {ano} ({var})": ", versus {valor} in {ano} ({var})",
  "Em {ano}, até {mes}: {valor} ({var} sobre {ini}–{mes} de {anoAnt}).":
    "In {ano}, through {mes}: {valor} ({var} vs. {ini}–{mes} {anoAnt}).",
  "{ano}* é parcial: só {ini} a {mes} foram publicados pelo TCE.":
    "{ano}* is partial: only {ini} to {mes} have been published by the TCE.",
  "Valores nominais (sem correção pela inflação), pelo mês do pagamento.":
    "Nominal amounts (not adjusted for inflation), by month of payment.",
  "{var} vs {ini}–{mes} de {ano}": "{var} vs. {ini}–{mes} {ano}",
  "Mês": "Month",
  "Valor pago": "Amount paid",
  "% do ano": "% of year",
  "Sem pagamentos em {ano}.": "No payments in {ano}.",
  // Eventos da despesa pública (valores de DADOS.meta.eventos)
  "Pago": "Paid",
  "Liquidado": "Accrued",
  "Empenhado": "Committed",
  "Anulação": "Cancellation",
  "Reforço": "Increase",
};

/** Situação do candidato (dado do TSE) → rótulo exibido. */
const I18N_SITUACAO_EN = {
  "ELEITO": "ELECTED",
  "ELEITO POR QP": "ELECTED (PARTY QUOTA)",
  "ELEITO POR MÉDIA": "ELECTED (REMAINDER)",
  "NÃO ELEITO": "NOT ELECTED",
  "SUPLENTE": "ALTERNATE",
  "2º TURNO": "RUNOFF",
};

/** Traduz um texto em português; {nome} é substituído por vars.nome. */
function t(pt, vars) {
  let s = LANG === "en" && I18N_EN[pt] != null ? I18N_EN[pt] : pt;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

/** "VOTO NULO"/"VOTO BRANCO" aparecem como candidatos nos dados do TSE. */
const I18N_VOTO_EN = { "VOTO NULO": "NULL VOTE", "VOTO BRANCO": "BLANK VOTE" };
function tNomeVoto(nome) {
  return LANG === "en" ? I18N_VOTO_EN[nome] || nome : nome;
}

function tSituacao(s) {
  return LANG === "en" ? I18N_SITUACAO_EN[(s || "").toUpperCase()] || s : s;
}

/** Traduz os elementos marcados com data-i18n* dentro de root. */
function applyI18n(root = document) {
  if (LANG !== "en") return;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const chave = el.textContent.replace(/\s+/g, " ").trim();
    if (I18N_EN[chave] != null) el.textContent = I18N_EN[chave];
  });
  for (const attr of ["placeholder", "title", "aria-label"]) {
    root.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => {
      el.setAttribute(attr, t(el.getAttribute(attr)));
    });
  }
}

function setLang(lang) {
  try { localStorage.setItem("lang", lang); } catch (e) { /* sem storage: vale só nesta página */ }
  window.location.reload();
}

/** Botão PT/EN no header: mostra o idioma para o qual troca. Fica fora de
 *  #controls para não ser empurrado para fora da tela no celular. */
function addLangToggle() {
  const alvo = document.getElementById("header");
  if (!alvo || document.getElementById("lang-toggle")) return;
  const outro = LANG === "en" ? "pt" : "en";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "lang-toggle";
  btn.className = "lang-toggle";
  btn.textContent = outro === "en" ? "EN" : "PT";
  btn.title = outro === "en" ? "View in English" : "Ver em português";
  btn.setAttribute("aria-label", btn.title);
  btn.lang = outro === "en" ? "en" : "pt-BR";
  btn.addEventListener("click", () => setLang(outro));
  alvo.appendChild(btn);
}

function initI18n() {
  applyI18n();
  addLangToggle();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initI18n);
} else {
  initI18n();
}
