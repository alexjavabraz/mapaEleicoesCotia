/**
 * contas.js — Página "Contas do Município" (despesas de Cotia, TCE-SP).
 *
 * Lê data/contas_cotia.json (gerado por scripts/download_contas.py) e monta
 * três abas:
 *  - Visão geral: valores pagos de todo o período, sem filtros (evolução anual,
 *    top 10 de cada ano, gráficos por ano/mês/órgão e maiores recebedores);
 *  - Por fornecedor: filtros, top 10, gráfico por ano do fornecedor escolhido
 *    e a tabela agrupada por recebedor;
 *  - Viagens da Câmara (montada por js/viagens.js).
 */

const DATA_URL = "data/contas_cotia.json";
const POR_PAGINA = 50;

const fmtBRL = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "BRL" });
const fmtCompacto = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat(LOCALE);
const fmtPct = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVar1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MESES = LANG === "en"
  ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  : ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const COR = "#e94560";
const COR_SUAVE = "rgba(233,69,96,0.35)";
const CORES_ORGAO = ["#4fc3f7", "#81c784", "#ffb74d", "#f06292", "#ba68c8", "#4db6ac", "#9e9e9e"];

let DADOS = null;
const estado = {
  evento: "",
  ano: "",       // "" = todos os anos
  sel: null,     // índice em DADOS.fornecedores
  busca: "",
  sort: "valor",
  asc: false,
  pagina: 0,
  aba: "lanc",
};
/** Estado fixo da aba Visão geral: valor pago, todos os anos, sem busca. */
const FIXO = { evento: "Pago", ano: "", sel: null, busca: "" };
const ABAS = ["geral", "fornecedor", "viagens"];
const graficos = {};

// -----------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

function normaliza(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function fmtCNPJ(d) {
  if (!d || d.length !== 14) return d || "";
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function fmtData(iso) {
  const [a, m, d] = (iso || "").split("-");
  if (!d) return iso;
  return LANG === "en" ? `${m}/${d}/${a}` : `${d}/${m}/${a}`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Ano de competência do lançamento (mês consultado na API); cai para a data de emissão. */
function anoLanc(l, idxMes) {
  return (l[idxMes] || l[0] || "").slice(0, 4);
}

function rotuloForn(f) {
  return f.doc ? `${f.nome} — ${fmtCNPJ(f.doc)}` : f.nome;
}

/** Valor do fornecedor no evento/ano do estado `s`. */
function valorForn(f, s = estado) {
  const fonte = s.ano ? f.anos[s.ano] : f.total;
  return (fonte && fonte[s.evento]) || 0;
}

function anos() {
  return Object.keys(DADOS.por_ano).sort();
}

function eventoLabel(s = estado) {
  return t(s.evento).toLowerCase();
}

/** "pagos" no plural em português ("Top 10 valores pagos"); em inglês não flexiona. */
function eventoPlural() {
  const ev = eventoLabel();
  return ev === "pago" ? "pagos" : ev;
}

function periodoLabel(s = estado) {
  return s.ano || `${anos()[0]}–${anos().at(-1)}`;
}

/** Fornecedores que passam no filtro de busca (sem seleção). */
function fornecedoresFiltrados(s = estado) {
  const q = normaliza(s.busca).trim();
  const qd = q.replace(/\D/g, "");
  return DADOS.fornecedores
    .map((f, i) => ({ f, i, valor: valorForn(f, s) }))
    .filter(({ f, valor }) => {
      if (valor <= 0) return false;
      if (!q) return true;
      return normaliza(f.nome).includes(q) || (qd.length >= 3 && f.doc.includes(qd));
    });
}

// -----------------------------------------------------------------------
// Inicialização
// -----------------------------------------------------------------------

async function init() {
  try {
    $("loading-status").textContent = t("Baixando dados do TCE-SP…");
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    DADOS = await resp.json();
  } catch (err) {
    $("loading").innerHTML =
      `<p>${t("Não foi possível carregar as contas ({erro}).", { erro: esc(err.message) })}</p>`;
    return;
  }

  Chart.defaults.color = "#a0a0b0";
  Chart.defaults.borderColor = "rgba(255,255,255,0.07)";
  Chart.defaults.font.family = "'Segoe UI', 'Inter', Arial, sans-serif";

  const ev = DADOS.meta.eventos;
  estado.evento = ev.includes("Pago") ? "Pago" : ev[0];
  $("f-evento").innerHTML = ev.map((e) => `<option value="${esc(e)}">${esc(t(e))}</option>`).join("");
  $("f-evento").value = estado.evento;
  $("f-ano").innerHTML = `<option value="">${t("Todos")} (${anos()[0]}–${anos().at(-1)})</option>` +
    anos().slice().reverse().map((a) => `<option value="${a}">${a}</option>`).join("");

  $("lista-fornecedores").innerHTML = DADOS.fornecedores
    .map((f) => `<option value="${esc(rotuloForn(f))}"></option>`).join("");

  const [ua, um] = DADOS.meta.ultimo_mes.split("-");
  const [pa, pm] = DADOS.meta.primeiro_mes.split("-");
  $("k-ultimo").textContent = `${MESES[+um - 1]}/${ua}`;
  $("fonte").innerHTML =
    `${t("Fonte")}: <a href="${esc(DADOS.meta.url)}" target="_blank" rel="noopener">${esc(DADOS.meta.fonte)}</a> · ` +
    t("despesas de {ini} a {fim}", { ini: `${pm}/${pa}`, fim: `${um}/${ua}` }) + " · " +
    t("{n} registros", { n: fmtInt.format(DADOS.meta.registros) }) + " · " +
    t("atualizado em {data}.", { data: fmtData(DADOS.meta.gerado_em.slice(0, 10)) }) + " " +
    t("CPF de pessoa física não é exibido.");

  ligarEventos();
  initEvolucao();
  renderGeral();
  render();
  $("loading").style.display = "none";
}

// -----------------------------------------------------------------------
// Abas (#geral, #fornecedor, #viagens na URL)
// -----------------------------------------------------------------------

function abaDaUrl() {
  const h = location.hash.slice(1);
  return ABAS.includes(h) ? h : "geral";
}

function mostrarAba(nome, foco = false) {
  ABAS.forEach((a) => {
    const ativa = a === nome;
    const tab = $(`tab-${a}`);
    tab.classList.toggle("ativa", ativa);
    tab.setAttribute("aria-selected", ativa);
    tab.tabIndex = ativa ? 0 : -1;
    $(`aba-${a}`).hidden = !ativa;
  });
  if (foco) $(`tab-${nome}`).focus();
}

function irParaAba(nome) {
  if (abaDaUrl() !== nome || !location.hash) history.pushState(null, "", `#${nome}`);
  mostrarAba(nome);
}

function initAbas() {
  const lista = document.querySelector(".abas-contas");
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-aba]");
    if (b) irParaAba(b.dataset.aba);
  });
  // Setas esquerda/direita trocam de aba (padrão WAI-ARIA de tabs)
  lista.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = ABAS.indexOf(abaDaUrl());
    const prox = ABAS[(i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length];
    irParaAba(prox);
    $(`tab-${prox}`).focus();
  });
  window.addEventListener("popstate", () => mostrarAba(abaDaUrl()));
  mostrarAba(abaDaUrl());
}

function ligarEventos() {
  $("f-evento").addEventListener("change", (e) => { estado.evento = e.target.value; estado.pagina = 0; render(); });
  $("f-ano").addEventListener("change", (e) => { estado.ano = e.target.value; estado.pagina = 0; render(); });

  let t;
  $("f-busca").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      const v = e.target.value;
      // Escolheu uma opção do autocomplete → seleciona o fornecedor
      const idx = DADOS.fornecedores.findIndex((f) => rotuloForn(f) === v);
      if (idx >= 0) {
        selecionar(idx);
        return;
      }
      estado.busca = v;
      estado.sel = null;
      estado.pagina = 0;
      render();
    }, 200);
  });

  $("btn-limpar").addEventListener("click", () => {
    $("f-busca").value = "";
    estado.busca = "";
    estado.sel = null;
    estado.pagina = 0;
    render();
  });

  $("t-receb").querySelector("thead").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (!th) return;
    const k = th.dataset.sort;
    if (estado.sort === k) estado.asc = !estado.asc;
    else { estado.sort = k; estado.asc = k === "nome" || k === "doc"; }
    estado.pagina = 0;
    renderTabela();
  });
  $("t-receb").querySelector("tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]");
    if (tr) selecionar(+tr.dataset.i);
  });
  $("p-ant").addEventListener("click", () => { estado.pagina--; renderTabela(); });
  $("p-prox").addEventListener("click", () => { estado.pagina++; renderTabela(); });

  $("btn-top10").addEventListener("click", () => { renderTop10(); $("modal-top10").showModal(); });
  const modal = $("modal-top10");
  modal.querySelector(".fechar").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  modal.querySelectorAll(".aba").forEach((b) =>
    b.addEventListener("click", () => { estado.aba = b.dataset.aba; renderTop10(); }));
  $("m-tabela").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]");
    if (!tr) return;
    modal.close();
    selecionar(+tr.dataset.i);
  });
}

/** Abre a aba Por fornecedor já com o recebedor escolhido (cliques na Visão geral). */
function abrirFornecedor(idx) {
  irParaAba("fornecedor");
  selecionar(idx);
}

function selecionar(idx) {
  estado.sel = idx;
  estado.busca = "";
  $("f-busca").value = rotuloForn(DADOS.fornecedores[idx]);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// -----------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------

/** Aba Visão geral: sempre o estado FIXO, desenhada uma vez. */
function renderGeral() {
  if (!DADOS.meta.eventos.includes(FIXO.evento)) FIXO.evento = DADOS.meta.eventos[0];
  renderKPIs(FIXO, "gk-");
  renderGraficoAno(FIXO, "g-ano-geral");
  renderGraficoMes(FIXO);
  renderGraficoTop(FIXO);
  renderGraficoOrgao(FIXO);
}

/** Aba Por fornecedor: redesenhada a cada mudança de filtro ou seleção. */
function render() {
  $("btn-top10").textContent = t("Top 10 valores {ev}", { ev: eventoPlural() });
  renderKPIs(estado, "k-");
  renderSelecionado();
  renderGraficoAno(estado, "g-ano");
  renderTabela();
}

function renderKPIs(s, pre) {
  let total, receb, lanc;
  if (s.sel !== null) {
    const f = DADOS.fornecedores[s.sel];
    total = valorForn(f, s);
    receb = 1;
    lanc = f.n;
  } else {
    const lista = fornecedoresFiltrados(s);
    total = s.busca
      ? lista.reduce((soma, x) => soma + x.valor, 0)
      : s.ano
        ? (DADOS.por_ano[s.ano] || {})[s.evento] || 0
        : anos().reduce((soma, a) => soma + ((DADOS.por_ano[a] || {})[s.evento] || 0), 0);
    receb = lista.length;
    lanc = lista.reduce((soma, x) => soma + x.f.n, 0);
  }
  $(pre + "total").textContent = fmtBRL.format(total);
  $(pre + "total-lbl").textContent = `${t("Total {ev}", { ev: eventoLabel(s) })} · ${periodoLabel(s)}`;
  $(pre + "receb").textContent = fmtInt.format(receb);
  $(pre + "lanc").textContent = fmtInt.format(lanc);
}

function renderSelecionado() {
  const box = $("fornecedor-sel");
  if (estado.sel === null) { box.hidden = true; return; }
  const f = DADOS.fornecedores[estado.sel];
  const tops = ((f.top || {})[estado.evento] || [])
    .filter((l) => !estado.ano || anoLanc(l, 4) === estado.ano);
  const totalEv = DADOS.meta.eventos
    .map((e) => `${esc(t(e))}: <b>${fmtBRL.format(f.total[e] || 0)}</b>`).join(" · ");
  box.hidden = false;
  box.innerHTML = `
    <div class="sel-head">
      <div>
        <h3>${esc(f.nome)}</h3>
        <div class="sel-meta">${f.tipo === "PF" ? t("Pessoa física") : f.doc ? "CNPJ " + fmtCNPJ(f.doc) : ""}
          · ${t("{n} lançamentos", { n: fmtInt.format(f.n) })} · ${totalEv} (${anos()[0]}–${anos().at(-1)})</div>
      </div>
      <button type="button" class="btn sec" onclick="document.getElementById('btn-limpar').click()">${t("Ver todos")}</button>
    </div>
    ${tops.length ? `
      <div class="tabela-wrap"><table>
        <thead><tr><th>${t("Data")}</th><th>${t("Órgão")}</th><th>${t("Empenho")}</th><th class="num">${t("Valor {ev}", { ev: esc(eventoLabel()) })}</th></tr></thead>
        <tbody>${tops.map((l) => `<tr><td>${fmtData(l[0])}</td><td>${esc(l[2])}</td>
          <td>${esc(l[3])}</td><td class="num">${fmtBRL.format(l[1])}</td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="vazio">${estado.ano
        ? t("Nenhum lançamento {ev} em {ano}.", { ev: esc(eventoLabel()), ano: estado.ano })
        : t("Nenhum lançamento {ev}.", { ev: esc(eventoLabel()) })}</p>`}`;
}

function grafico(id, config) {
  if (graficos[id]) graficos[id].destroy();
  graficos[id] = new Chart($(id), config);
}

const tooltipBRL = {
  callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ": " : ""}${fmtBRL.format(c.parsed.y ?? c.parsed)}` },
};
const eixoBRL = { ticks: { callback: (v) => "R$ " + fmtCompacto.format(v) }, beginAtZero: true };

/**
 * Valor por ano: do município (sem busca), do fornecedor selecionado ou da
 * soma dos fornecedores que casam com a busca.
 */
function renderGraficoAno(s, id) {
  const as = anos();
  const f = s.sel !== null ? DADOS.fornecedores[s.sel] : null;
  const filtrados = !f && s.busca ? fornecedoresFiltrados({ ...s, ano: "" }) : null;
  const valores = as.map((a) => {
    if (f) return (f.anos[a] || {})[s.evento] || 0;
    if (filtrados) return filtrados.reduce((soma, x) => soma + ((x.f.anos[a] || {})[s.evento] || 0), 0);
    return (DADOS.por_ano[a] || {})[s.evento] || 0;
  });
  $(`${id}-titulo`).textContent = t("Valor {ev} por ano", { ev: eventoLabel(s) }) +
    (f ? " — " + f.nome : filtrados ? ` — “${s.busca.trim()}”` : "");
  const interativo = s === estado;
  grafico(id, {
    type: "bar",
    data: {
      labels: as,
      datasets: [{
        data: valores,
        backgroundColor: as.map((a) => (!s.ano || a === s.ano ? COR : COR_SUAVE)),
        borderRadius: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipBRL },
      scales: { y: eixoBRL, x: { grid: { display: false } } },
      onClick: (_, els) => {
        if (!interativo || !els.length) return;
        const a = as[els[0].index];
        estado.ano = estado.ano === a ? "" : a;
        $("f-ano").value = estado.ano;
        estado.pagina = 0;
        render();
      },
    },
  });
}

function renderGraficoMes(s) {
  const meses = Object.keys(DADOS.por_mes).filter((m) => !s.ano || m.startsWith(s.ano));
  $("g-mes-titulo").textContent = t("Valor {ev} por mês — município", { ev: eventoLabel(s) }) + (s.ano ? " · " + s.ano : "");
  grafico("g-mes", {
    type: s.ano ? "bar" : "line",
    data: {
      labels: meses.map((m) => `${MESES[+m.slice(5) - 1]}/${m.slice(2, 4)}`),
      datasets: [{
        data: meses.map((m) => DADOS.por_mes[m][s.evento] || 0),
        borderColor: COR,
        backgroundColor: s.ano ? COR : COR_SUAVE,
        fill: !s.ano,
        pointRadius: 0,
        tension: 0,
        borderRadius: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: tooltipBRL },
      scales: { y: eixoBRL, x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } } },
    },
  });
}

function renderGraficoTop(s) {
  const top = fornecedoresFiltrados(s).sort((a, b) => b.valor - a.valor).slice(0, 10);
  grafico("g-top", {
    type: "bar",
    data: {
      labels: top.map((x) => (x.f.nome.length > 32 ? x.f.nome.slice(0, 30) + "…" : x.f.nome)),
      datasets: [{
        data: top.map((x) => x.valor),
        backgroundColor: COR,
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { title: (c) => top[c[0].dataIndex].f.nome, label: (c) => fmtBRL.format(c.parsed.x) } },
      },
      scales: {
        x: { ticks: { callback: (v) => "R$ " + fmtCompacto.format(v) }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
      onClick: (_, els) => { if (els.length) abrirFornecedor(top[els[0].index].i); },
    },
  });
}

function renderGraficoOrgao(s) {
  const as = anos();
  const orgaos = Object.keys(DADOS.por_orgao)
    .map((o) => ({ o, tot: as.reduce((soma, a) => soma + ((DADOS.por_orgao[o][a] || {})[s.evento] || 0), 0) }))
    .filter((x) => x.tot > 0)
    .sort((a, b) => b.tot - a.tot);
  grafico("g-orgao", {
    type: "bar",
    data: {
      labels: as,
      datasets: orgaos.map(({ o }, k) => ({
        label: o,
        data: as.map((a) => (DADOS.por_orgao[o][a] || {})[s.evento] || 0),
        backgroundColor: CORES_ORGAO[k % CORES_ORGAO.length],
        borderRadius: 2,
      })),
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: tooltipBRL },
      scales: { x: { stacked: true, grid: { display: false } }, y: { ...eixoBRL, stacked: true } },
    },
  });
}

function renderTabela() {
  const lista = estado.sel !== null
    ? [{ f: DADOS.fornecedores[estado.sel], i: estado.sel, valor: valorForn(DADOS.fornecedores[estado.sel]) }]
    : fornecedoresFiltrados();
  const total = lista.reduce((s, x) => s + x.valor, 0) || 1;
  const k = estado.sort;
  const dir = estado.asc ? 1 : -1;
  lista.sort((a, b) => {
    const va = k === "valor" ? a.valor : a.f[k];
    const vb = k === "valor" ? b.valor : b.f[k];
    return (typeof va === "string" ? va.localeCompare(vb, "pt-BR") : va - vb) * dir;
  });

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  estado.pagina = Math.min(Math.max(0, estado.pagina), paginas - 1);
  const ini = estado.pagina * POR_PAGINA;
  const max = lista.reduce((m, x) => Math.max(m, x.valor), 0) || 1;

  $("t-receb").querySelectorAll("th[data-sort]").forEach((th) => {
    th.classList.toggle("ordenado", th.dataset.sort === k);
    th.classList.toggle("asc", th.dataset.sort === k && estado.asc);
  });
  $("t-receb").querySelector("tbody").innerHTML = lista.length
    ? lista.slice(ini, ini + POR_PAGINA).map(({ f, i, valor }) => `
      <tr data-i="${i}">
        <td>${esc(f.nome)}</td>
        <td>${f.tipo === "PF" ? `<i>${t("pessoa física")}</i>` : fmtCNPJ(f.doc)}</td>
        <td class="num">${fmtInt.format(f.n)}</td>
        <td class="num"><span class="barra" style="width:${Math.max(2, (valor / max) * 60)}px"></span>${fmtBRL.format(valor)}</td>
        <td class="num">${fmtPct.format((valor / total) * 100)}%</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="vazio">${t("Nenhum recebedor encontrado.")}</td></tr>`;

  $("p-info").textContent = t("{n} recebedores · página {p} de {total}", { n: fmtInt.format(lista.length), p: estado.pagina + 1, total: paginas });
  $("p-ant").disabled = estado.pagina === 0;
  $("p-prox").disabled = estado.pagina >= paginas - 1;
}

function renderTop10() {
  document.querySelectorAll("#modal-top10 .aba").forEach((b) =>
    b.classList.toggle("ativa", b.dataset.aba === estado.aba));
  const evl = eventoLabel();
  const f = estado.sel !== null ? DADOS.fornecedores[estado.sel] : null;
  const sufixo = `${periodoLabel()}${f ? " · " + f.nome : ""}`;
  const tab = $("m-tabela");

  if (estado.aba === "lanc") {
    $("m-titulo").textContent = `${t("Top 10 maiores valores {ev}", { ev: eventoPlural() })} · ${sufixo}`;
    let linhas;
    if (f) {
      linhas = ((f.top || {})[estado.evento] || [])
        .filter((l) => !estado.ano || anoLanc(l, 4) === estado.ano)
        .map((l) => ({ data: l[0], valor: l[1], orgao: l[2], emp: l[3], i: estado.sel }));
    } else {
      const q = normaliza(estado.busca).trim();
      linhas = DADOS.top_lancamentos
        .filter((l) => l[2] === estado.evento && (!estado.ano || anoLanc(l, 6) === estado.ano))
        .filter((l) => !q || normaliza(DADOS.fornecedores[l[5]].nome).includes(q))
        .map((l) => ({ data: l[0], valor: l[1], orgao: l[3], emp: l[4], i: l[5] }));
    }
    linhas = linhas.sort((a, b) => b.valor - a.valor).slice(0, 10);
    tab.innerHTML = `
      <thead><tr><th>#</th><th>${t("Recebedor")}</th><th>${t("Data")}</th><th>${t("Órgão")}</th><th>${t("Empenho")}</th><th class="num">${t("Valor")}</th></tr></thead>
      <tbody>${linhas.map((l, k) => `
        <tr data-i="${l.i}" style="cursor:pointer">
          <td>${k + 1}</td><td>${esc(DADOS.fornecedores[l.i].nome)}</td><td>${fmtData(l.data)}</td>
          <td>${esc(l.orgao)}</td><td>${esc(l.emp)}</td><td class="num">${fmtBRL.format(l.valor)}</td>
        </tr>`).join("") || `<tr><td colspan="6" class="vazio">${t("Sem lançamentos.")}</td></tr>`}</tbody>`;
  } else {
    $("m-titulo").textContent = `${t("Top 10 recebedores ({ev})", { ev: evl })} · ${periodoLabel()}`;
    const lista = fornecedoresFiltrados().sort((a, b) => b.valor - a.valor).slice(0, 10);
    tab.innerHTML = `
      <thead><tr><th>#</th><th>${t("Recebedor")}</th><th>CNPJ</th><th class="num">${t("Lançamentos")}</th><th class="num">${t("Valor")}</th></tr></thead>
      <tbody>${lista.map((x, k) => `
        <tr data-i="${x.i}" style="cursor:pointer">
          <td>${k + 1}</td><td>${esc(x.f.nome)}</td><td>${x.f.tipo === "PF" ? `<i>${t("pessoa física")}</i>` : fmtCNPJ(x.f.doc)}</td>
          <td class="num">${fmtInt.format(x.f.n)}</td><td class="num">${fmtBRL.format(x.valor)}</td>
        </tr>`).join("") || `<tr><td colspan="5" class="vazio">${t("Sem recebedores.")}</td></tr>`}</tbody>`;
  }
}

// -----------------------------------------------------------------------
// Evolução anual dos pagamentos + top 10 de cada ano
// (sempre evento "Pago", independente dos filtros do topo da página)
// -----------------------------------------------------------------------

const EVO_EVENTO = "Pago";
const evo = { orgao: "", ano: "" };

function nomeOrgaoCurto(o) {
  if (/PREFEITURA/i.test(o)) return t("Prefeitura");
  if (/C[AÂ]MARA/i.test(o)) return t("Câmara Municipal");
  if (/PREV/i.test(o)) return t("Instituto de Previdência");
  return o;
}

/** Soma de "Pago" no órgão escolhido, para os meses do ano (opcionalmente até o mês `ate`). */
function pagoAno(ano, ate = 12) {
  const fontes = evo.orgao ? [DADOS.por_orgao_mes[evo.orgao] || {}] : Object.values(DADOS.por_orgao_mes);
  let total = 0;
  for (const meses of fontes) {
    for (let m = 1; m <= ate; m++) {
      total += (meses[`${ano}-${String(m).padStart(2, "0")}`] || {})[EVO_EVENTO] || 0;
    }
  }
  return total;
}

function fmtVar(atual, anterior) {
  if (!anterior) return "";
  const v = (atual / anterior - 1) * 100;
  return `${v >= 0 ? "+" : "−"}${fmtVar1.format(Math.abs(v))}%`;
}

function initEvolucao() {
  if (!DADOS.por_orgao_mes || !DADOS.meta.eventos.includes(EVO_EVENTO)) {
    $("evolucao").hidden = true;
    return;
  }
  const orgaos = Object.keys(DADOS.por_orgao_mes);
  evo.orgao = orgaos.find((o) => /PREFEITURA/i.test(o)) || "";
  $("evo-orgao").innerHTML = `<option value="">${t("Todos os órgãos")}</option>` +
    orgaos.map((o) => `<option value="${esc(o)}">${esc(nomeOrgaoCurto(o))}</option>`).join("");
  $("evo-orgao").value = evo.orgao;
  $("evo-orgao").addEventListener("change", (e) => { evo.orgao = e.target.value; renderEvolucao(); });

  evo.ano = anos().at(-1);
  $("evo-anos").innerHTML = anos().map((a) =>
    `<button type="button" role="tab" data-ano="${a}">${a}</button>`).join("");
  $("evo-anos").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ano]");
    if (!b) return;
    evo.ano = b.dataset.ano;
    renderTopAno();
  });
  $("evo-top").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-i]");
    if (tr) abrirFornecedor(+tr.dataset.i);
  });
  renderEvolucao();
}

function renderEvolucao() {
  const as = anos();
  const [ua, um] = DADOS.meta.ultimo_mes.split("-").map(Number);
  const parcial = um < 12 ? String(ua) : null;
  const valores = as.map((a) => pagoAno(a));
  const quem = evo.orgao ? nomeOrgaoCurto(evo.orgao) : t("Todos os órgãos");

  // Resumo: primeiro → último ano completo, e o ano corrente contra o mesmo período do anterior
  const completos = as.filter((a) => a !== parcial);
  const ini = completos[0], fim = completos.at(-1);
  let resumo = t("{quem} pagou {valor} em {ano}", { quem: `<b>${quem}</b>`, valor: `<b>${fmtBRL.format(pagoAno(fim))}</b>`, ano: fim });
  if (ini !== fim) {
    resumo += t(", contra {valor} em {ano} ({var})", { valor: `<b>${fmtBRL.format(pagoAno(ini))}</b>`, ano: ini, var: `<b>${fmtVar(pagoAno(fim), pagoAno(ini))}</b>` });
  }
  resumo += ".";
  if (parcial) {
    const mesNome = MESES[um - 1];
    resumo += " " + t("Em {ano}, até {mes}: {valor} ({var} sobre {ini}–{mes} de {anoAnt}).", {
      ano: parcial, mes: mesNome, valor: `<b>${fmtBRL.format(pagoAno(parcial, um))}</b>`,
      var: fmtVar(pagoAno(parcial, um), pagoAno(ua - 1, um)), ini: MESES[0], anoAnt: ua - 1,
    });
  }
  $("evo-resumo").innerHTML = resumo;
  $("evo-nota").textContent = (parcial ? t("{ano}* é parcial: só {ini} a {mes} foram publicados pelo TCE.", { ano: parcial, ini: MESES[0], mes: MESES[um - 1] }) + " " : "") +
    t("Valores nominais (sem correção pela inflação), pelo mês do pagamento.");

  grafico("g-evolucao", {
    type: "bar",
    data: {
      labels: as.map((a) => (a === parcial ? `${a}*` : a)),
      datasets: [{
        label: `${t("Pago")} — ${quem}`,
        data: valores,
        backgroundColor: as.map((a) => (a === parcial ? COR_SUAVE : COR)),
        borderColor: COR,
        borderWidth: as.map((a) => (a === parcial ? 1 : 0)),
        borderRadius: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => fmtBRL.format(c.parsed.y),
            afterLabel: (c) => {
              const i = c.dataIndex;
              if (i === 0) return "";
              const a = as[i];
              if (a === parcial) {
                return t("{var} vs {ini}–{mes} de {ano}", { var: fmtVar(pagoAno(a, um), pagoAno(ua - 1, um)), ini: MESES[0], mes: MESES[um - 1], ano: ua - 1 });
              }
              return `${fmtVar(valores[i], valores[i - 1])} vs ${as[i - 1]}`;
            },
          },
        },
      },
      scales: { y: eixoBRL, x: { grid: { display: false } } },
      onClick: (_, els) => {
        if (!els.length) return;
        evo.ano = as[els[0].index];
        renderTopAno();
      },
    },
  });
  renderTopAno();
}

function renderTopAno() {
  $("evo-anos").querySelectorAll("button").forEach((b) => {
    const ativa = b.dataset.ano === evo.ano;
    b.classList.toggle("ativa", ativa);
    b.setAttribute("aria-selected", ativa);
  });
  const totalAno = pagoAno(evo.ano) || 1;
  const linhas = DADOS.top_lancamentos
    .filter((l) => l[2] === EVO_EVENTO && anoLanc(l, 6) === evo.ano && (!evo.orgao || l[3] === evo.orgao))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  $("evo-top").innerHTML = `
    <thead><tr><th>#</th><th>${t("Recebedor")}</th><th>${t("Órgão")}</th><th>${t("Mês")}</th><th>${t("Empenho")}</th>
      <th class="num">${t("Valor pago")}</th><th class="num">${t("% do ano")}</th></tr></thead>
    <tbody>${linhas.map((l, k) => {
      const mes = l[6] || l[0].slice(0, 7);
      return `<tr data-i="${l[5]}" style="cursor:pointer">
        <td>${k + 1}</td><td>${esc(DADOS.fornecedores[l[5]].nome)}</td><td>${esc(nomeOrgaoCurto(l[3]))}</td>
        <td>${MESES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}</td><td>${esc(l[4])}</td>
        <td class="num">${fmtBRL.format(l[1])}</td>
        <td class="num">${fmtPct.format((l[1] / totalAno) * 100)}%</td>
      </tr>`;
    }).join("") || `<tr><td colspan="7" class="vazio">${t("Sem pagamentos em {ano}.", { ano: esc(evo.ano) })}</td></tr>`}</tbody>`;
}

initAbas();
init();
