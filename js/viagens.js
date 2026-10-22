/**
 * viagens.js — Seção "Viagens da Câmara" de contas.html.
 *
 * Lê data/viagens_camara.json (gerado por scripts/download_viagens.py a partir
 * dos relatórios de viagens da Câmara) e mostra o gasto por vereador e por ano.
 * Viagem com mais de uma pessoa tem o custo dividido igualmente entre elas.
 */

(() => {
  const URL_DADOS = urlSite("data/viagens_camara.json");

  // Textos traduzíveis: usa t() de js/i18n.js quando a página tiver, e registra
  // as traduções desta seção no dicionário dele.
  const EN = {
    "Viagens da Câmara": "City Council trips",
    "Carregando viagens…": "Loading trips…",
    "Não foi possível carregar as viagens da Câmara.": "Could not load the City Council trips.",
    "Quem viajou": "Who travelled",
    "Vereadores": "Council members",
    "Servidores": "Staff",
    "Todos": "All",
    "Viagens": "Trips",
    "Custo médio por viagem": "Average cost per trip",
    "Gasto com viagens por ano": "Travel spending per year",
    "Por vereador e por ano": "By council member and year",
    "Gasto com viagens · {periodo}": "Travel spending · {periodo}",
    "Vereadores que viajaram": "Council members who travelled",
    "Pessoas que viajaram": "People who travelled",
    "Maiores gastos · {periodo}": "Highest spending · {periodo}",
    "Nome": "Name",
    "Total": "Total",
    "Ato": "Act",
    "Período": "Dates",
    "Destino": "Destination",
    "Passagens": "Airfare",
    "Hospedagem": "Lodging",
    "Adiantamento usado": "Advance used",
    "Relatório": "Report",
    "PDF": "PDF",
    "lido por OCR, conferir no PDF": "read by OCR, check the PDF",
    "não lido": "not read",
    "custo parcial": "partial cost",
    "{n} viagens com custo parcial: o adiantamento gasto não pôde ser lido do relatório e não entra no total.":
      "{n} trips with partial cost: the advance spent could not be read from the report and is not included in the total.",
    "Viagens de {nome}": "Trips by {nome}",
    "dividida entre {n} pessoas": "split among {n} people",
    "Nenhuma viagem no período.": "No trips in this period.",
    "Fonte: {fonte}, {n} relatórios lidos de {total} arquivos, atualizado em {data}.":
      "Source: {fonte}, {n} reports read out of {total} files, updated on {data}.",
    "Custo = passagens + hospedagem + adiantamento efetivamente gasto (alimentação e transporte local, lido da observação do relatório). Viagens com mais de uma pessoa têm o custo dividido igualmente.":
      "Cost = airfare + lodging + the part of the cash advance actually spent (meals and local transport, read from the report notes). Trips with more than one person have the cost split equally.",
    "Não foi possível ler {n} arquivos (privados no Google Drive ou ilegíveis): {lista}.":
      "{n} files could not be read (private on Google Drive or illegible): {lista}.",
  };
  if (typeof I18N_EN === "object") Object.assign(I18N_EN, EN);
  const tr = typeof t === "function"
    ? t
    : (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : `{${k}}`));
  const LOC = typeof LOCALE === "string" ? LOCALE : "pt-BR";

  const brl = new Intl.NumberFormat(LOC, { style: "currency", currency: "BRL" });
  const brl0 = new Intl.NumberFormat(LOC, { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const compacto = new Intl.NumberFormat(LOC, { notation: "compact", maximumFractionDigits: 1 });
  const inteiro = new Intl.NumberFormat(LOC);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const COR_VER = "#e94560";
  const COR_SERV = "#4fc3f7";

  let D = null;
  const st = { ano: "", tipo: "vereador", pessoa: null };
  const charts = {};

  function chart(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), cfg);
  }

  const nome = (k) => (D.nomes[k] || k);
  const anos = () => [...new Set(D.viagens.map((v) => v.ano).filter(Boolean))].sort();
  const periodo = () => st.ano || `${anos()[0]}–${anos().at(-1)}`;

  function viagensFiltradas(comAno = true) {
    return D.viagens.filter((v) =>
      (!st.tipo || v.tipo === st.tipo) && (!comAno || !st.ano || v.ano === st.ano));
  }

  /** Soma por pessoa (custo dividido entre quem viajou junto). */
  function porPessoa(lista) {
    const m = new Map();
    for (const v of lista) {
      const parte = v.total / v.pessoas.length;
      for (const p of v.pessoas) {
        const x = m.get(p) || { total: 0, n: 0, anos: {} };
        x.total += parte;
        x.n += 1;
        x.anos[v.ano] = (x.anos[v.ano] || 0) + parte;
        m.set(p, x);
      }
    }
    return [...m.entries()].map(([k, x]) => ({ k, ...x })).sort((a, b) => b.total - a.total);
  }

  function semDados() {
    const p = $("viag-vazio");
    if (p) p.textContent = tr("Não foi possível carregar as viagens da Câmara.");
  }

  async function init() {
    try {
      const r = await fetch(URL_DADOS);
      if (!r.ok) return semDados();
      D = await r.json();
    } catch (e) {
      return semDados();
    }
    if (!D.viagens || !D.viagens.length) return semDados();
    $("viagens").hidden = false;

    $("v-ano").innerHTML = `<option value="">${esc(tr("Todos"))} (${anos()[0]}–${anos().at(-1)})</option>` +
      anos().slice().reverse().map((a) => `<option value="${a}">${a}</option>`).join("");
    $("v-tipo").innerHTML = [["vereador", "Vereadores"], ["servidor", "Servidores"], ["", "Todos"]]
      .map(([v, l]) => `<option value="${v}">${esc(tr(l))}</option>`).join("");
    $("v-tipo").value = st.tipo;

    $("v-ano").addEventListener("change", (e) => { st.ano = e.target.value; render(); });
    $("v-tipo").addEventListener("change", (e) => { st.tipo = e.target.value; st.pessoa = null; render(); });
    $("t-viag-pivo").addEventListener("click", (e) => {
      const tr_ = e.target.closest("tr[data-k]");
      if (!tr_) return;
      const k = tr_.dataset.k;
      st.pessoa = st.pessoa === k ? null : k;
      renderPivo();
      renderDetalhe();
      // a tabela é redesenhada: devolve o foco ao botão para quem usa teclado
      const btn = [...$("t-viag-pivo").querySelectorAll("tr[data-k]")].find((r) => r.dataset.k === k);
      if (btn) btn.querySelector("button").focus();
    });

    const m = D.meta;
    let nota = tr("Fonte: {fonte}, {n} relatórios lidos de {total} arquivos, atualizado em {data}.", {
      fonte: `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.fonte)}</a>`,
      n: inteiro.format(m.viagens),
      total: inteiro.format(m.arquivos),
      data: m.gerado_em.slice(0, 10).split("-").reverse().join("/"),
    }) + " " + esc(tr("Custo = passagens + hospedagem + adiantamento efetivamente gasto (alimentação e transporte local, lido da observação do relatório). Viagens com mais de uma pessoa têm o custo dividido igualmente."));
    if (m.nao_lidos && m.nao_lidos.length) {
      nota += " " + tr("Não foi possível ler {n} arquivos (privados no Google Drive ou ilegíveis): {lista}.", {
        n: m.nao_lidos.length,
        lista: m.nao_lidos.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.rotulo || "?")}</a>`).join(", "),
      });
    }
    $("viag-nota").innerHTML = nota;
    render();
  }

  function render() {
    const lista = viagensFiltradas();
    const pessoas = porPessoa(lista);
    const total = lista.reduce((s, v) => s + v.total, 0);
    $("vk-total").textContent = brl.format(total);
    $("vk-total-lbl").textContent = tr("Gasto com viagens · {periodo}", { periodo: periodo() });
    $("vk-viagens").textContent = inteiro.format(lista.length);
    $("vk-pessoas").textContent = inteiro.format(pessoas.length);
    $("vk-pessoas-lbl").textContent = tr(st.tipo === "vereador" ? "Vereadores que viajaram" : "Pessoas que viajaram");
    $("vk-media").textContent = lista.length ? brl.format(total / lista.length) : "—";
    const parciais = lista.filter((v) => !v.adiantamento_lido).length;
    $("viag-parcial").textContent = parciais
      ? tr("{n} viagens com custo parcial: o adiantamento gasto não pôde ser lido do relatório e não entra no total.", { n: parciais })
      : "";
    renderGraficoAno();
    renderGraficoPessoa(pessoas);
    renderPivo();
    renderDetalhe();
  }

  function renderGraficoAno() {
    const as = anos();
    const soma = (tipo, a) => D.viagens.filter((v) => v.tipo === tipo && v.ano === a)
      .reduce((s, v) => s + v.total, 0);
    const series = [["vereador", "Vereadores", COR_VER], ["servidor", "Servidores", COR_SERV]]
      .filter(([tipo]) => !st.tipo || st.tipo === tipo);
    chart("g-viag-ano", {
      type: "bar",
      data: {
        labels: as,
        datasets: series.map(([tipo, rot, cor]) => ({
          label: tr(rot),
          data: as.map((a) => soma(tipo, a)),
          backgroundColor: as.map((a) => (!st.ano || a === st.ano ? cor : cor + "55")),
          borderRadius: 3,
        })),
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: series.length > 1, position: "bottom", labels: { boxWidth: 10 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${brl.format(c.parsed.y)}` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => "R$ " + compacto.format(v) } },
        },
        onClick: (_, els) => {
          if (!els.length) return;
          const a = as[els[0].index];
          st.ano = st.ano === a ? "" : a;
          $("v-ano").value = st.ano;
          render();
        },
      },
    });
  }

  function renderGraficoPessoa(pessoas) {
    const top = pessoas.slice(0, 12);
    $("g-viag-pessoa-titulo").textContent = tr("Maiores gastos · {periodo}", { periodo: periodo() });
    chart("g-viag-pessoa", {
      type: "bar",
      data: {
        labels: top.map((p) => { const n = nome(p.k); return n.length > 28 ? n.slice(0, 26) + "…" : n; }),
        datasets: [{
          data: top.map((p) => p.total),
          backgroundColor: top.map((p) => (p.k === st.pessoa ? "#ffb74d" : COR_VER)),
          borderRadius: 3,
        }],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (c) => nome(top[c[0].dataIndex].k),
              label: (c) => `${brl.format(c.parsed.x)} · ${top[c.dataIndex].n} ${tr("Viagens").toLowerCase()}`,
            },
          },
        },
        scales: {
          x: { beginAtZero: true, ticks: { callback: (v) => "R$ " + compacto.format(v) } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
        onClick: (_, els) => {
          if (!els.length) return;
          st.pessoa = top[els[0].index].k;
          renderPivo();
          renderDetalhe();
          $("viag-detalhe").scrollIntoView({ behavior: "smooth", block: "nearest" });
        },
      },
    });
  }

  /** Tabela pessoa × ano (sempre todos os anos; o filtro de ano destaca a coluna). */
  function renderPivo() {
    const as = anos();
    const pessoas = porPessoa(viagensFiltradas(false));
    const totAno = Object.fromEntries(as.map((a) => [a, 0]));
    pessoas.forEach((p) => as.forEach((a) => { totAno[a] += p.anos[a] || 0; }));
    const cel = (v, a) => {
      const cls = ["num", v ? "" : "zero", st.ano === a ? "ativo" : ""].join(" ");
      return `<td class="${cls}">${v ? brl0.format(v) : "—"}</td>`;
    };
    $("t-viag-pivo").innerHTML = `
      <thead><tr><th>${esc(tr("Nome"))}</th>${as.map((a) => `<th class="num">${a}</th>`).join("")}
        <th class="num">${esc(tr("Total"))}</th><th class="num">${esc(tr("Viagens"))}</th></tr></thead>
      <tbody>${pessoas.map((p) => `
        <tr data-k="${esc(p.k)}" class="${p.k === st.pessoa ? "ativa" : ""}">
          <td><button type="button" class="link-btn" aria-expanded="${p.k === st.pessoa}">${esc(nome(p.k))}</button></td>${as.map((a) => cel(p.anos[a] || 0, a)).join("")}
          <td class="num"><b>${brl0.format(p.total)}</b></td><td class="num">${p.n}</td>
        </tr>`).join("")}</tbody>
      <tfoot><tr><td>${esc(tr("Total"))}</td>${as.map((a) => cel(totAno[a], a)).join("")}
        <td class="num">${brl0.format(pessoas.reduce((s, p) => s + p.total, 0))}</td><td></td></tr></tfoot>`;
  }

  function renderDetalhe() {
    const box = $("viag-detalhe");
    if (!st.pessoa) { box.innerHTML = ""; return; }
    const lista = viagensFiltradas().filter((v) => v.pessoas.includes(st.pessoa));
    box.innerHTML = `
      <h4>${esc(tr("Viagens de {nome}", { nome: nome(st.pessoa) }))} · ${esc(periodo())}</h4>
      <div class="tabela-wrap"><table>
        <thead><tr><th>${esc(tr("Ato"))}</th><th>${esc(tr("Período"))}</th><th>${esc(tr("Destino"))}</th>
          <th class="num">${esc(tr("Passagens"))}</th><th class="num">${esc(tr("Hospedagem"))}</th>
          <th class="num">${esc(tr("Adiantamento usado"))}</th><th class="num">${esc(tr("Total"))}</th>
          <th>${esc(tr("Relatório"))}</th></tr></thead>
        <tbody>${lista.map((v) => {
          const n = v.pessoas.length;
          const div = n > 1 ? `<div class="motivo">${esc(tr("dividida entre {n} pessoas", { n }))}</div>` : "";
          return `<tr>
            <td>${esc(v.ato)}</td><td>${esc(v.periodo)}</td>
            <td>${esc(v.destino)}<div class="motivo">${esc(v.motivo)}</div></td>
            <td class="num">${brl.format(v.passagens / n)}</td><td class="num">${brl.format(v.hospedagem / n)}</td>
            <td class="num">${v.adiantamento_lido ? brl.format(v.adiantamento_usado / n) : esc(tr("não lido"))}</td>
            <td class="num"><b>${brl.format(v.total / n)}</b>${v.adiantamento_lido ? "" : `<div class="motivo">${esc(tr("custo parcial"))}</div>`}${div}</td>
            <td><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(tr("PDF"))}</a>${v.ocr
              ? `<div class="motivo">${esc(tr("lido por OCR, conferir no PDF"))}</div>` : ""}</td>
          </tr>`;
        }).join("") || `<tr><td colspan="8" class="vazio">${esc(tr("Nenhuma viagem no período."))}</td></tr>`}</tbody>
      </table></div>`;
  }

  init();
})();
