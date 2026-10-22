/**
 * contas-tipo.js — Aba "Por tipo" de contas.html e, nas cidades sem verba de
 * gabinete (Vargem Grande Paulista), a aba "Câmara".
 *
 * Lê data/contas_tipo_cotia.json ou data/<cidade>/contas_tipo.json (gerado por
 * scripts/download_despesas_tipo.py a partir do CSV anual de despesas do
 * TCE-SP). Usa as funções e formatos de js/contas.js ($, esc, fmtBRL,
 * grafico, eixoBRL, nomeOrgaoCurto, CORES_ORGAO), carregado antes.
 *
 * Formato: anos[ano] = {
 *   elementos: {órgão: {"31901101 - VENCIMENTOS…": [pago, empenhado]}},
 *   funcoes:   {órgão: {"Saúde": pago}},
 *   camara_pf: [[data, valor, favorecido, elemento, histórico], …]  (Câmara,
 *              pessoa física, fora da folha; valor negativo = devolução)
 * }
 */

(() => {
  const EN = {
    "Por tipo": "By type",
    "Despesas pagas por tipo": "Paid spending by type",
    "Por grupo de despesa": "By spending group",
    "Por área de governo (função)": "By government area (function)",
    "Por elemento da despesa": "By spending element",
    "Elemento": "Element",
    "Grupo": "Group",
    "Pessoal e encargos": "Payroll and benefits",
    "Juros e encargos da dívida": "Interest on debt",
    "Outras despesas correntes": "Other current expenses",
    "Investimentos": "Capital investment",
    "Inversões financeiras": "Financial investments",
    "Amortização da dívida": "Debt amortization",
    "Outros": "Other",
    "Valor pago": "Amount paid",
    "% do ano": "% of year",
    "vs ano anterior": "vs previous year",
    "{quem} pagou {valor} em {ano}.": "{quem} paid {valor} in {ano}.",
    "{g} foi {pct}% do total.": "{g} was {pct}% of the total.",
    "Carregando despesas por tipo…": "Loading spending by type…",
    "As despesas por tipo ainda não foram geradas para esta cidade.": "Spending by type has not been generated for this city yet.",
    "Fonte: {fonte}, valores pagos no ano (inclui restos a pagar), atualizado em {data}. Elemento é a classificação da despesa usada na contabilidade pública.":
      "Source: {fonte}, amounts paid in the year (including prior-year commitments), updated on {data}. Element is the spending classification used in public accounting.",
    "Mostrar todos ({n})": "Show all ({n})",
    "Mostrar menos": "Show less",
    // Aba Câmara
    "Câmara": "City Council",
    "Anos: {anos}. Clique em um ou mais anos para filtrar; Todos volta ao período inteiro.":
      "Years: {anos}. Click one or more years to filter; All goes back to the whole period.",
    "Câmara: diárias e adiantamentos": "City Council: per diems and cash advances",
    "Sem verba de gabinete": "No office allowance",
    "Pago pela Câmara": "Paid by the Council",
    "Folha (pessoal e encargos)": "Payroll (staff and benefits)",
    "Diárias de viagem": "Travel per diems",
    "Adiantamentos (líquido)": "Cash advances (net)",
    "Diária": "Per diem",
    "Adiantamento": "Cash advance",
    "Ressarcimento": "Reimbursement",
    "Outro": "Other",
    "Ano": "Year",
    "Anos": "Years",
    "Tipo": "Type",
    "Favorecido": "Payee",
    "Lançamentos": "Entries",
    "Valor líquido": "Net amount",
    "Data": "Date",
    "Histórico": "Description",
    "Valor": "Amount",
    "A Câmara de Vargem Grande Paulista não tem verba de gabinete nem verba indenizatória para vereadores. Conferimos o arquivo de despesas do TCE-SP de 2020 a 2025, a legislação municipal (SISCAM) e a Lei Orgânica. Fora da folha, os pagamentos a pessoas físicas são diárias de viagem e o caixa de adiantamento de um servidor, listados abaixo.":
      "Vargem Grande Paulista City Council has no office allowance or expense allowance for council members. We checked the TCE-SP spending files from 2020 to 2025, municipal legislation (SISCAM) and the city's Organic Law. Outside payroll, payments to individuals are travel per diems and one staff member's petty-cash advance, listed below.",
    "Pagamentos a pessoas físicas fora da folha": "Payments to individuals outside payroll",
    "Os adiantamentos têm comprovante?": "Do the cash advances have receipts?",
    "De que é feito o valor pago pela Câmara": "What the Council's total spending is made of",
    "O valor pago é tudo o que a Câmara pagou no período, segundo o TCE-SP: a maior parte é salário dos servidores, subsídio dos vereadores e INSS. Os pagamentos a pessoas físicas listados mais abaixo são só uma pequena parte, fora da folha.":
      "The amount paid is everything the Council paid in the period, according to TCE-SP: most of it is staff salaries, council members' pay and social security. The payments to individuals listed further down are only a small part, outside payroll.",
    "Subsídio dos vereadores": "Council members' pay",
    "INSS (contribuição patronal)": "Social security (employer contribution)",
    "Salários, 13º, férias e gratificações dos servidores": "Staff salaries, 13th salary, vacation and bonuses",
    "Auxílio-alimentação": "Meal allowance",
    "Serviços contratados (empresas, assessoria, manutenção, contas de consumo)": "Contracted services (companies, consulting, maintenance, utilities)",
    "Materiais de consumo": "Supplies",
    "Equipamentos e mobiliário": "Equipment and furniture",
    "Categoria": "Category",
    "Ver por elemento de despesa ({n})": "See by spending element ({n})",
    "A Lei municipal 619/2011 manda gastar o adiantamento em até 30 dias e prestar contas em até 5 dias úteis, sob multa de 1% ao dia. A Mesa da Câmara nomeia por portaria o servidor que pede e presta contas dos adiantamentos.":
      "Municipal Law 619/2011 requires each advance to be spent within 30 days and accounted for within 5 business days, with a fine of 1% per day. The Council's board appoints, by ordinance, the staff member who requests advances and accounts for them.",
    "Lei 619/2011": "Law 619/2011",
    "Portaria 7/2026": "Ordinance 7/2026",
    "Nos dados do TCE-SP, o saldo não usado volta para a Câmara todo mês (os valores negativos da lista acima), o que indica que a prestação de contas é feita internamente. Mas as notas fiscais e os recibos não são publicados: não estão no portal de transparência (CECAM) nem no site da Câmara.":
      "In the TCE-SP data, the unused balance goes back to the Council every month (the negative amounts in the list above), which indicates the advances are accounted for internally. But the invoices and receipts are not published: they are not on the transparency portal (CECAM) or on the Council's website.",
    "Para ver os comprovantes, peça pela Lei de Acesso à Informação (e-SIC da Câmara), informando o mês e o valor do adiantamento.":
      "To see the receipts, file a Freedom of Information request (the Council's e-SIC), giving the month and amount of the advance.",
    "Portal de transparência da Câmara": "Council transparency portal",
    "Ver os {n} lançamentos": "See the {n} entries",
    "Nenhum pagamento a pessoa física fora da folha.": "No payments to individuals outside payroll.",
    "Adiantamento é o caixa para despesas miúdas que um servidor recebe todo mês (regime de adiantamento, Lei municipal 619/2011); os valores negativos são o saldo devolvido no fim do mês. Diárias são pagas por viagem.":
      "A cash advance is the petty-cash fund one staff member receives every month (advance regime, municipal Law 619/2011); negative amounts are the balance returned at month end. Per diems are paid per trip.",
  };
  if (typeof I18N_EN === "object") Object.assign(I18N_EN, EN);

  const URL_TIPO = urlDados("contas_tipo_cotia.json");
  const GRUPOS = {
    "31": "Pessoal e encargos", "32": "Juros e encargos da dívida", "33": "Outras despesas correntes",
    "44": "Investimentos", "45": "Inversões financeiras", "46": "Amortização da dívida",
  };
  const CORES_GRUPO = ["#4fc3f7", "#e94560", "#81c784", "#ffb74d", "#ba68c8", "#9e9e9e", "#4db6ac"];
  const TOP_ELEMENTOS = 15;
  const tp = { ano: "", orgao: "", todos: false };
  let TIPO = null;

  const grupoDe = (el) => GRUPOS[(el.match(/^(\d{2})/) || [])[1]] || "Outros";
  /** "33903999 - OUTROS SERVIÇOS…" → ["33903999", "Outros serviços…"] */
  function partesElemento(el) {
    const m = el.match(/^(\d+)\s*-\s*(.*)$/);
    const nome = (m ? m[2] : el).replace(/\s+/g, " ").trim().toLowerCase();
    return [m ? m[1] : "", nome.charAt(0).toUpperCase() + nome.slice(1)];
  }
  const anosTipo = () => Object.keys(TIPO.anos).sort();

  /** {elemento: pago} somando os órgãos escolhidos. */
  function elementosAno(ano, orgao = tp.orgao) {
    const out = {};
    const els = (TIPO.anos[ano] || {}).elementos || {};
    for (const [o, mapa] of Object.entries(els)) {
      if (orgao && o !== orgao) continue;
      for (const [e, v] of Object.entries(mapa)) out[e] = (out[e] || 0) + v[0];
    }
    return out;
  }

  function funcoesAno(ano) {
    const out = {};
    for (const [o, mapa] of Object.entries((TIPO.anos[ano] || {}).funcoes || {})) {
      if (tp.orgao && o !== tp.orgao) continue;
      for (const [f, v] of Object.entries(mapa)) out[f] = (out[f] || 0) + v;
    }
    return out;
  }

  async function carregar() {
    if (TIPO) return TIPO;
    const r = await fetch(URL_TIPO);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    TIPO = await r.json();
    if (!Object.keys(TIPO.anos || {}).length) throw new Error("vazio");
    return TIPO;
  }

  // ---------------------------------------------------------------------
  // Aba Por tipo
  // ---------------------------------------------------------------------

  function initTipo() {
    const as = anosTipo();
    tp.ano = as.at(-1);
    const orgaos = [...new Set(as.flatMap((a) => Object.keys(TIPO.anos[a].elementos || {})))].sort();
    tp.orgao = orgaos.find((o) => /PREFEITURA/i.test(o)) || "";
    $("tipo-orgao").innerHTML = `<option value="">${t("Todos os órgãos")}</option>` +
      orgaos.map((o) => `<option value="${esc(o)}">${esc(nomeOrgaoCurto(o))}</option>`).join("");
    $("tipo-orgao").value = tp.orgao;
    $("tipo-orgao").addEventListener("change", (e) => { tp.orgao = e.target.value; renderTipo(); });
    $("tipo-anos").innerHTML = as.map((a) => `<button type="button" role="tab" data-ano="${a}">${a}</button>`).join("");
    $("tipo-anos").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-ano]");
      if (!b) return;
      tp.ano = b.dataset.ano;
      renderTipo();
    });
    $("tipo-mais").addEventListener("click", () => { tp.todos = !tp.todos; renderTabelaTipo(); });
    $("tipo-nota").textContent = t("Fonte: {fonte}, valores pagos no ano (inclui restos a pagar), atualizado em {data}. Elemento é a classificação da despesa usada na contabilidade pública.",
      { fonte: TIPO.meta.fonte, data: fmtData(TIPO.meta.gerado_em.slice(0, 10)) });
    $("tipo").hidden = false;
    $("tipo-vazio").hidden = true;
    renderTipo();
  }

  function renderTipo() {
    $("tipo-anos").querySelectorAll("button").forEach((b) => {
      const ativa = b.dataset.ano === tp.ano;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa);
    });
    const els = elementosAno(tp.ano);
    const total = Object.values(els).reduce((a, b) => a + b, 0);
    const grupos = {};
    for (const [e, v] of Object.entries(els)) grupos[grupoDe(e)] = (grupos[grupoDe(e)] || 0) + v;
    const ordemG = Object.entries(grupos).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const quem = tp.orgao ? nomeOrgaoCurto(tp.orgao) : t("Todos os órgãos");
    let resumo = t("{quem} pagou {valor} em {ano}.", { quem: `<b>${esc(quem)}</b>`, valor: `<b>${fmtBRL.format(total)}</b>`, ano: tp.ano });
    if (ordemG.length && total > 0) {
      resumo += " " + t("{g} foi {pct}% do total.", { g: t(ordemG[0][0]), pct: fmtVar1.format((ordemG[0][1] / total) * 100) });
    }
    $("tipo-resumo").innerHTML = resumo;

    grafico("g-tipo-grupo", {
      type: "doughnut",
      data: {
        labels: ordemG.map(([g]) => t(g)),
        datasets: [{ data: ordemG.map(([, v]) => v), backgroundColor: ordemG.map((_, k) => CORES_GRUPO[k % CORES_GRUPO.length]), borderWidth: 0 }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: (c) => `${c.label}: ${fmtBRL.format(c.parsed)} (${fmtVar1.format((c.parsed / (total || 1)) * 100)}%)` } },
        },
      },
    });

    const funcs = Object.entries(funcoesAno(tp.ano)).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 12);
    grafico("g-tipo-funcao", {
      type: "bar",
      data: {
        labels: funcs.map(([f]) => f),
        datasets: [{ data: funcs.map(([, v]) => v), backgroundColor: COR, borderRadius: 4 }],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtBRL.format(c.parsed.x) } } },
        scales: {
          x: { ticks: { callback: (v) => "R$ " + fmtCompacto.format(v) }, beginAtZero: true },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
    renderTabelaTipo();
  }

  function renderTabelaTipo() {
    const els = elementosAno(tp.ano);
    const as = anosTipo();
    const anterior = as[as.indexOf(tp.ano) - 1];
    const ant = anterior ? elementosAno(anterior) : null;
    const total = Object.values(els).reduce((a, b) => a + b, 0) || 1;
    const linhas = Object.entries(els).filter(([, v]) => Math.abs(v) >= 0.01).sort((a, b) => b[1] - a[1]);
    const mostrar = tp.todos ? linhas : linhas.slice(0, TOP_ELEMENTOS);
    $("tipo-tabela").innerHTML = `
      <thead><tr><th>#</th><th>${t("Elemento")}</th><th>${t("Grupo")}</th><th class="num">${t("Valor pago")}</th>
        <th class="num">${t("% do ano")}</th>${ant ? `<th class="num">${t("vs ano anterior")}</th>` : ""}</tr></thead>
      <tbody>${mostrar.map(([e, v], k) => {
        const [cod, nome] = partesElemento(e);
        return `<tr><td>${k + 1}</td><td title="${esc(cod)}">${esc(nome)}</td><td>${esc(t(grupoDe(e)))}</td>
          <td class="num">${fmtBRL.format(v)}</td><td class="num">${fmtPct.format((v / total) * 100)}%</td>
          ${ant ? `<td class="num">${fmtVar(v, ant[e] || 0) || "—"}</td>` : ""}</tr>`;
      }).join("")}</tbody>`;
    const btn = $("tipo-mais");
    btn.hidden = linhas.length <= TOP_ELEMENTOS;
    btn.textContent = tp.todos ? t("Mostrar menos") : t("Mostrar todos ({n})", { n: linhas.length });
  }

  // ---------------------------------------------------------------------
  // Aba Câmara (cidades sem verba de gabinete)
  // ---------------------------------------------------------------------

  function tipoLancamento(hist) {
    const h = (hist || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    if (/DIARIA/.test(h)) return "Diária";
    if (/ADIANTAMENTO/.test(h)) return "Adiantamento";
    if (/RESSARC|REEMBOLS|INDENIZ/.test(h)) return "Ressarcimento";
    return "Outro";
  }

  /** Anos marcados no filtro da aba Câmara (vários ao mesmo tempo). */
  const camaraAnos = new Set();

  /** "2020–2025" para anos seguidos; senão "2020, 2023, 2025". */
  function rotuloAnos(lista) {
    const seguidos = lista.every((a, i) => i === 0 || +a === +lista[i - 1] + 1);
    if (lista.length > 1 && seguidos) return `${lista[0]}–${lista.at(-1)}`;
    return lista.join(", ");
  }

  function initCamara() {
    const as = anosTipo();
    as.forEach((a) => camaraAnos.add(a));
    const pills = $("camara-anos");
    pills.innerHTML = `<button type="button" data-ano="">${t("Todos")}</button>` +
      as.map((a) => `<button type="button" data-ano="${a}">${a}</button>`).join("");
    pills.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-ano]");
      if (!b) return;
      const a = b.dataset.ano;
      const todosMarcados = camaraAnos.size === as.length;
      if (!a) {
        as.forEach((x) => camaraAnos.add(x));
      } else if (todosMarcados) {
        // Com todos marcados, o primeiro clique escolhe só aquele ano
        camaraAnos.clear();
        camaraAnos.add(a);
      } else if (camaraAnos.has(a)) {
        camaraAnos.delete(a);
        if (!camaraAnos.size) as.forEach((x) => camaraAnos.add(x));
      } else {
        camaraAnos.add(a);
      }
      renderCamara();
    });
    $("camara").hidden = false;
    $("camara-vazio").hidden = true;
    renderCamara();
  }

  function renderCamara() {
    const as = anosTipo().filter((a) => camaraAnos.has(a));
    const todosMarcados = as.length === anosTipo().length;
    $("camara-anos").querySelectorAll("button").forEach((b) => {
      const ativa = b.dataset.ano ? !todosMarcados && camaraAnos.has(b.dataset.ano) : todosMarcados;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-pressed", ativa);
    });
    const camara = (o) => /C[AÂ]MARA/i.test(o);
    let pago = 0, folha = 0, diarias = 0, adiant = 0;
    const porElemento = new Map();
    const grupos = new Map();
    const todos = [];
    for (const a of as) {
      const ano = TIPO.anos[a];
      for (const [o, mapa] of Object.entries(ano.elementos || {})) {
        if (!camara(o)) continue;
        for (const [e, v] of Object.entries(mapa)) {
          pago += v[0];
          if (/^319[01]/.test(e)) folha += v[0];
          porElemento.set(e, (porElemento.get(e) || 0) + v[0]);
        }
      }
      for (const l of ano.camara_pf || []) {
        const tipo = tipoLancamento(l[4]);
        if (tipo === "Diária") diarias += l[1];
        if (tipo === "Adiantamento") adiant += l[1];
        const chave = `${a}|${tipo}|${l[2]}`;
        const g = grupos.get(chave) || { ano: a, tipo, nome: l[2], n: 0, valor: 0 };
        g.n++;
        g.valor += l[1];
        grupos.set(chave, g);
        todos.push(l);
      }
    }
    renderComposicao(porElemento, pago);
    const periodo = rotuloAnos(as);
    $("ck-pago").textContent = fmtBRL.format(pago);
    $("ck-pago-lbl").textContent = `${t("Pago pela Câmara")} · ${periodo}`;
    $("ck-folha").textContent = fmtBRL.format(folha);
    $("ck-diarias").textContent = fmtBRL.format(diarias);
    $("ck-adiant").textContent = fmtBRL.format(adiant);

    const linhas = [...grupos.values()].sort((a, b) => b.ano.localeCompare(a.ano) || b.valor - a.valor);
    $("camara-tabela").innerHTML = linhas.length ? `
      <thead><tr><th>${t("Ano")}</th><th>${t("Tipo")}</th><th>${t("Favorecido")}</th>
        <th class="num">${t("Lançamentos")}</th><th class="num">${t("Valor líquido")}</th></tr></thead>
      <tbody>${linhas.map((g) => `<tr><td>${g.ano}</td><td>${esc(t(g.tipo))}</td><td>${esc(g.nome)}</td>
        <td class="num">${fmtInt.format(g.n)}</td><td class="num">${fmtBRL.format(g.valor)}</td></tr>`).join("")}</tbody>`
      : `<tbody><tr><td class="vazio">${t("Nenhum pagamento a pessoa física fora da folha.")}</td></tr></tbody>`;

    todos.sort((a, b) => b[0].localeCompare(a[0]));
    const det = $("camara-detalhe");
    det.hidden = !todos.length;
    det.querySelector("summary").textContent = t("Ver os {n} lançamentos", { n: todos.length });
    $("camara-lanc").innerHTML = `
      <thead><tr><th>${t("Data")}</th><th>${t("Favorecido")}</th><th>${t("Tipo")}</th><th>${t("Histórico")}</th><th class="num">${t("Valor")}</th></tr></thead>
      <tbody>${todos.map((l) => `<tr><td>${fmtData(l[0])}</td><td>${esc(l[2])}</td><td>${esc(t(tipoLancamento(l[4])))}</td>
        <td>${esc(l[4])}</td><td class="num">${fmtBRL.format(l[1])}</td></tr>`).join("")}</tbody>`;
    $("camara-nota-anos").textContent = t("Anos: {anos}. Clique em um ou mais anos para filtrar; Todos volta ao período inteiro.", { anos: periodo });
  }

  // Agrupa os elementos de despesa da Câmara em categorias fáceis de ler.
  const CATEGORIAS_CAMARA = [
    ["Subsídio dos vereadores", (e) => e.startsWith("31901175")],
    ["INSS (contribuição patronal)", (e) => e.startsWith("319013")],
    ["Salários, 13º, férias e gratificações dos servidores", (e) => e.startsWith("3190")],
    ["Auxílio-alimentação", (e) => e.startsWith("33903942")],
    ["Serviços contratados (empresas, assessoria, manutenção, contas de consumo)", (e) => /^33903[59]/.test(e)],
    ["Materiais de consumo", (e) => e.startsWith("339030")],
    ["Equipamentos e mobiliário", (e) => e.startsWith("4490")],
    ["Outros", () => true],
  ];

  function renderComposicao(porElemento, pago) {
    const pct = (v) => (pago ? (100 * v / pago).toLocaleString(LOCALE, { maximumFractionDigits: 1 }) : "0") + "%";
    const cats = new Map();
    for (const [e, v] of porElemento) {
      const [nome] = CATEGORIAS_CAMARA.find(([, f]) => f(e));
      cats.set(nome, (cats.get(nome) || 0) + v);
    }
    const linhas = [...cats].filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    $("camara-composicao").innerHTML = `
      <thead><tr><th>${t("Categoria")}</th><th class="num">${t("Valor pago")}</th><th class="num">%</th></tr></thead>
      <tbody>${linhas.map(([n, v]) => `<tr><td>${esc(t(n))}</td><td class="num">${fmtBRL.format(v)}</td><td class="num">${pct(v)}</td></tr>`).join("")}
        <tr class="total"><td>${t("Total")}</td><td class="num">${fmtBRL.format(pago)}</td><td class="num">100%</td></tr></tbody>`;
    const elems = [...porElemento].filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    $("camara-elementos").querySelector("summary").textContent = t("Ver por elemento de despesa ({n})", { n: elems.length });
    $("camara-elem").innerHTML = `
      <thead><tr><th>${t("Elemento")}</th><th class="num">${t("Valor pago")}</th><th class="num">%</th></tr></thead>
      <tbody>${elems.map(([e, v]) => `<tr><td>${esc(e)}</td><td class="num">${fmtBRL.format(v)}</td><td class="num">${pct(v)}</td></tr>`).join("")}</tbody>`;
  }

  function semDados(err) {
    console.warn("Despesas por tipo indisponíveis:", err);
    for (const id of ["tipo-vazio", "camara-vazio"]) {
      if ($(id)) $(id).textContent = t("As despesas por tipo ainda não foram geradas para esta cidade.");
    }
  }

  carregar().then(() => {
    if ($("tipo")) initTipo();
    if ($("camara")) initCamara();
  }).catch(semDados);
})();
