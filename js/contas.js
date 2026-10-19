/**
 * contas.js — Página "Contas do Município" (despesas de Cotia, TCE-SP).
 *
 * Lê data/contas_cotia.json (gerado por scripts/download_contas.py) e monta:
 * filtro por fornecedor, top 10, gráficos por ano/mês/órgão e a tabela
 * agrupada por recebedor.
 */

const DATA_URL = "data/contas_cotia.json";
const POR_PAGINA = 50;

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("pt-BR");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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
  return d ? `${d}/${m}/${a}` : iso;
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

/** Valor do fornecedor no evento/ano selecionados. */
function valorForn(f) {
  const fonte = estado.ano ? f.anos[estado.ano] : f.total;
  return (fonte && fonte[estado.evento]) || 0;
}

function anos() {
  return Object.keys(DADOS.por_ano).sort();
}

function eventoLabel() {
  return estado.evento.toLowerCase();
}

function periodoLabel() {
  return estado.ano || `${anos()[0]}–${anos().at(-1)}`;
}

/** Fornecedores que passam no filtro de busca (sem seleção). */
function fornecedoresFiltrados() {
  const q = normaliza(estado.busca).trim();
  const qd = q.replace(/\D/g, "");
  return DADOS.fornecedores
    .map((f, i) => ({ f, i, valor: valorForn(f) }))
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
    $("loading-status").textContent = "Baixando dados do TCE-SP…";
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    DADOS = await resp.json();
  } catch (err) {
    $("loading").innerHTML =
      `<p>Não foi possível carregar as contas (${esc(err.message)}).</p>`;
    return;
  }

  Chart.defaults.color = "#a0a0b0";
  Chart.defaults.borderColor = "rgba(255,255,255,0.07)";
  Chart.defaults.font.family = "'Segoe UI', 'Inter', Arial, sans-serif";

  const ev = DADOS.meta.eventos;
  estado.evento = ev.includes("Pago") ? "Pago" : ev[0];
  $("f-evento").innerHTML = ev.map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join("");
  $("f-evento").value = estado.evento;
  $("f-ano").innerHTML = `<option value="">Todos (${anos()[0]}–${anos().at(-1)})</option>` +
    anos().slice().reverse().map((a) => `<option value="${a}">${a}</option>`).join("");

  $("lista-fornecedores").innerHTML = DADOS.fornecedores
    .map((f) => `<option value="${esc(rotuloForn(f))}"></option>`).join("");

  const [ua, um] = DADOS.meta.ultimo_mes.split("-");
  $("k-ultimo").textContent = `${MESES[+um - 1]}/${ua}`;
  $("fonte").innerHTML =
    `Fonte: <a href="${esc(DADOS.meta.url)}" target="_blank" rel="noopener">${esc(DADOS.meta.fonte)}</a> · ` +
    `despesas de ${fmtData(DADOS.meta.primeiro_mes + "-01").slice(3)} a ${um}/${ua} · ` +
    `${fmtInt.format(DADOS.meta.registros)} registros · atualizado em ${fmtData(DADOS.meta.gerado_em.slice(0, 10))}. ` +
    `CPF de pessoa física não é exibido.`;

  ligarEventos();
  render();
  $("loading").style.display = "none";
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

function render() {
  $("btn-top10").textContent = `Top 10 valores ${eventoLabel() === "pago" ? "pagos" : eventoLabel()}`;
  renderKPIs();
  renderSelecionado();
  renderGraficoAno();
  renderGraficoMes();
  renderGraficoTop();
  renderGraficoOrgao();
  renderTabela();
}

function renderKPIs() {
  let total, receb, lanc;
  if (estado.sel !== null) {
    const f = DADOS.fornecedores[estado.sel];
    total = valorForn(f);
    receb = 1;
    lanc = f.n;
  } else {
    const lista = fornecedoresFiltrados();
    total = estado.busca
      ? lista.reduce((s, x) => s + x.valor, 0)
      : estado.ano
        ? (DADOS.por_ano[estado.ano] || {})[estado.evento] || 0
        : anos().reduce((s, a) => s + ((DADOS.por_ano[a] || {})[estado.evento] || 0), 0);
    receb = lista.length;
    lanc = lista.reduce((s, x) => s + x.f.n, 0);
  }
  $("k-total").textContent = fmtBRL.format(total);
  $("k-total-lbl").textContent = `Total ${eventoLabel()} · ${periodoLabel()}`;
  $("k-receb").textContent = fmtInt.format(receb);
  $("k-lanc").textContent = fmtInt.format(lanc);
}

function renderSelecionado() {
  const box = $("fornecedor-sel");
  if (estado.sel === null) { box.hidden = true; return; }
  const f = DADOS.fornecedores[estado.sel];
  const tops = ((f.top || {})[estado.evento] || [])
    .filter((l) => !estado.ano || anoLanc(l, 4) === estado.ano);
  const totalEv = DADOS.meta.eventos
    .map((e) => `${esc(e)}: <b>${fmtBRL.format(f.total[e] || 0)}</b>`).join(" · ");
  box.hidden = false;
  box.innerHTML = `
    <div class="sel-head">
      <div>
        <h3>${esc(f.nome)}</h3>
        <div class="sel-meta">${f.tipo === "PF" ? "Pessoa física" : f.doc ? "CNPJ " + fmtCNPJ(f.doc) : ""}
          · ${fmtInt.format(f.n)} lançamentos · ${totalEv} (${anos()[0]}–${anos().at(-1)})</div>
      </div>
      <button type="button" class="btn sec" onclick="document.getElementById('btn-limpar').click()">Ver todos</button>
    </div>
    ${tops.length ? `
      <div class="tabela-wrap"><table>
        <thead><tr><th>Data</th><th>Órgão</th><th>Empenho</th><th class="num">Valor ${esc(eventoLabel())}</th></tr></thead>
        <tbody>${tops.map((l) => `<tr><td>${fmtData(l[0])}</td><td>${esc(l[2])}</td>
          <td>${esc(l[3])}</td><td class="num">${fmtBRL.format(l[1])}</td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="vazio">Nenhum lançamento ${esc(eventoLabel())} ${estado.ano ? "em " + estado.ano : ""}.</p>`}`;
}

function grafico(id, config) {
  if (graficos[id]) graficos[id].destroy();
  graficos[id] = new Chart($(id), config);
}

const tooltipBRL = {
  callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ": " : ""}${fmtBRL.format(c.parsed.y ?? c.parsed)}` },
};
const eixoBRL = { ticks: { callback: (v) => "R$ " + fmtCompacto.format(v) }, beginAtZero: true };

function renderGraficoAno() {
  const as = anos();
  const f = estado.sel !== null ? DADOS.fornecedores[estado.sel] : null;
  const valores = as.map((a) => ((f ? f.anos[a] : DADOS.por_ano[a]) || {})[estado.evento] || 0);
  $("g-ano-titulo").textContent = `Valor ${eventoLabel()} por ano${f ? " — " + f.nome : ""}`;
  grafico("g-ano", {
    type: "bar",
    data: {
      labels: as,
      datasets: [{
        data: valores,
        backgroundColor: as.map((a) => (!estado.ano || a === estado.ano ? COR : COR_SUAVE)),
        borderRadius: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: tooltipBRL },
      scales: { y: eixoBRL, x: { grid: { display: false } } },
      onClick: (_, els) => {
        if (!els.length) return;
        const a = as[els[0].index];
        estado.ano = estado.ano === a ? "" : a;
        $("f-ano").value = estado.ano;
        estado.pagina = 0;
        render();
      },
    },
  });
}

function renderGraficoMes() {
  const meses = Object.keys(DADOS.por_mes).filter((m) => !estado.ano || m.startsWith(estado.ano));
  $("g-mes-titulo").textContent = `Valor ${eventoLabel()} por mês — município${estado.ano ? " · " + estado.ano : ""}`;
  grafico("g-mes", {
    type: estado.ano ? "bar" : "line",
    data: {
      labels: meses.map((m) => `${MESES[+m.slice(5) - 1]}/${m.slice(2, 4)}`),
      datasets: [{
        data: meses.map((m) => DADOS.por_mes[m][estado.evento] || 0),
        borderColor: COR,
        backgroundColor: estado.ano ? COR : COR_SUAVE,
        fill: !estado.ano,
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

function renderGraficoTop() {
  const top = fornecedoresFiltrados().sort((a, b) => b.valor - a.valor).slice(0, 10);
  grafico("g-top", {
    type: "bar",
    data: {
      labels: top.map((x) => (x.f.nome.length > 32 ? x.f.nome.slice(0, 30) + "…" : x.f.nome)),
      datasets: [{
        data: top.map((x) => x.valor),
        backgroundColor: top.map((x) => (x.i === estado.sel ? "#ffb74d" : COR)),
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
      onClick: (_, els) => { if (els.length) selecionar(top[els[0].index].i); },
    },
  });
}

function renderGraficoOrgao() {
  const as = anos();
  const orgaos = Object.keys(DADOS.por_orgao)
    .map((o) => ({ o, tot: as.reduce((s, a) => s + ((DADOS.por_orgao[o][a] || {})[estado.evento] || 0), 0) }))
    .filter((x) => x.tot > 0)
    .sort((a, b) => b.tot - a.tot);
  grafico("g-orgao", {
    type: "bar",
    data: {
      labels: as,
      datasets: orgaos.map(({ o }, k) => ({
        label: o,
        data: as.map((a) => (DADOS.por_orgao[o][a] || {})[estado.evento] || 0),
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
        <td>${f.tipo === "PF" ? "<i>pessoa física</i>" : fmtCNPJ(f.doc)}</td>
        <td class="num">${fmtInt.format(f.n)}</td>
        <td class="num"><span class="barra" style="width:${Math.max(2, (valor / max) * 60)}px"></span>${fmtBRL.format(valor)}</td>
        <td class="num">${((valor / total) * 100).toFixed(2).replace(".", ",")}%</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="vazio">Nenhum recebedor encontrado.</td></tr>`;

  $("p-info").textContent = `${fmtInt.format(lista.length)} recebedores · página ${estado.pagina + 1} de ${paginas}`;
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
    $("m-titulo").textContent = `Top 10 maiores valores ${evl === "pago" ? "pagos" : evl} · ${sufixo}`;
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
      <thead><tr><th>#</th><th>Recebedor</th><th>Data</th><th>Órgão</th><th>Empenho</th><th class="num">Valor</th></tr></thead>
      <tbody>${linhas.map((l, k) => `
        <tr data-i="${l.i}" style="cursor:pointer">
          <td>${k + 1}</td><td>${esc(DADOS.fornecedores[l.i].nome)}</td><td>${fmtData(l.data)}</td>
          <td>${esc(l.orgao)}</td><td>${esc(l.emp)}</td><td class="num">${fmtBRL.format(l.valor)}</td>
        </tr>`).join("") || `<tr><td colspan="6" class="vazio">Sem lançamentos.</td></tr>`}</tbody>`;
  } else {
    $("m-titulo").textContent = `Top 10 recebedores (${evl}) · ${periodoLabel()}`;
    const lista = fornecedoresFiltrados().sort((a, b) => b.valor - a.valor).slice(0, 10);
    tab.innerHTML = `
      <thead><tr><th>#</th><th>Recebedor</th><th>CNPJ</th><th class="num">Lançamentos</th><th class="num">Valor</th></tr></thead>
      <tbody>${lista.map((x, k) => `
        <tr data-i="${x.i}" style="cursor:pointer">
          <td>${k + 1}</td><td>${esc(x.f.nome)}</td><td>${x.f.tipo === "PF" ? "<i>pessoa física</i>" : fmtCNPJ(x.f.doc)}</td>
          <td class="num">${fmtInt.format(x.f.n)}</td><td class="num">${fmtBRL.format(x.valor)}</td>
        </tr>`).join("") || `<tr><td colspan="5" class="vazio">Sem recebedores.</td></tr>`}</tbody>`;
  }
}

init();
