/**
 * virada.js — "Virada (1º → 2º turno)" no mapa das eleições gerais (geral.js).
 *
 * Duas partes:
 *  - Mapa: cada bairro com a cor do finalista que avançou na margem entre os
 *    turnos (mais forte onde mudou mais) e contorno grosso onde o vencedor
 *    mudou. Contas exatas, com os votos por bairro dos dois turnos.
 *  - Painel: "Para onde foram os votos", um diagrama de fluxo ESTIMADO
 *    (inferência ecológica sobre as seções, scripts/estimar_virada.py) para a
 *    cidade ou para o bairro clicado. O voto é secreto: é o padrão médio das
 *    urnas, não a troca de cada eleitor.
 *
 * Só Presidente teve 2º turno em 2026 (Governador foi decidido no 1º).
 */

let viradaAtiva = false;
let viradaDados = null;           // cotia_virada_<ano>.json
let _legendaViradaCtrl = null;
const CARGO_VIRADA = "presidente";

async function loadVirada(year) {
  viradaDados = null;
  const arq = ELECTION_YEARS[year]?.viradaFile;
  if (!arq) return { error: "no_file" };
  try {
    const r = await fetch(arq);
    if (!r.ok) return { error: r.status };
    viradaDados = await r.json();
    return { ok: true };
  } catch (e) {
    return { error: e.message };
  }
}

/** Os dois finalistas (nome completo, como nos votos por bairro). */
function finalistasVirada() {
  return (viradaDados?.cats2 || []).filter(c => !c.startsWith("_")).slice(0, 2);
}

/** Nome de urna para exibir (LULA, FLAVIO BOLSONARO...). */
function nomeCurtoVirada(full) {
  if (full === "_OUTROS") return t("Outros");
  if (full === "_BRANCO_NULO") return t("Branco/nulo");
  if (full === "_ABSTENCAO") return t("Abstenção");
  return _fullToUrnaGeral[CARGO_VIRADA]?.[full] || full;
}

const CORES_OUTROS_VIRADA = ["#f9a825", "#7b1fa2", "#00897b", "#fb8c00"];
function corVirada(full, i = 0) {
  if (full === "_BRANCO_NULO") return "var(--text-muted)";
  if (full === "_ABSTENCAO") return "rgba(var(--tinta), 0.22)";
  if (full === "_OUTROS") return "#8d6e63";
  return getCorCandidatoConhecido(nomeCurtoVirada(full)) || CORES_OUTROS_VIRADA[i % CORES_OUTROS_VIRADA.length];
}

/** Fatias dos dois finalistas nos votos válidos de um turno (lista do bairro). */
function _fatias(lista, finalistas) {
  const validos = (lista || []).reduce((s, c) => s + c.votos, 0);
  if (!validos) return null;
  return finalistas.map(f => (lista.find(c => c.nome === f)?.votos || 0) / validos);
}

/**
 * Mudança no bairro: fatias dos finalistas nos dois turnos, a margem
 * (finalista 0 − finalista 1) e se o vencedor mudou. null sem dados.
 */
function mudancaBairro(bairroKey) {
  const fin = finalistasVirada();
  if (!bairroKey || fin.length < 2) return null;
  const s1 = _fatias(bairrosDoTurno("1")[bairroKey]?.[CARGO_VIRADA], fin);
  const s2 = _fatias(bairrosDoTurno("2")[bairroKey]?.[CARGO_VIRADA], fin);
  if (!s1 || !s2) return null;
  const m1 = s1[0] - s1[1], m2 = s2[0] - s2[1];
  return { s1, s2, m1, m2, delta: m2 - m1, virou: Math.sign(m1) !== Math.sign(m2) && m1 !== 0 };
}

function _chaveDoLayer(layer) {
  const nome = layer.feature?.properties?.name || layer.feature?.properties?.nome || "";
  return resolveBairroKey(nome);
}

/** Pinta o mapa da virada (ou, com a renda ligada, só o contorno de quem virou). */
function pintarVirada() {
  if (!neighborhoodLayer || !viradaDados) return;
  limparLegendaTop3();
  const fin = finalistasVirada();
  const mudancas = [];
  neighborhoodLayer.eachLayer(layer => {
    layer._virada = layer.feature ? mudancaBairro(_chaveDoLayer(layer)) : null;
    if (layer._virada) mudancas.push(Math.abs(layer._virada.delta));
  });
  const maxD = Math.max(...mudancas, 0.01);
  const cores = fin.map((f, i) => corVirada(f, i));
  const contornoVirou = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#111";

  let viradas = 0;
  const ganhou = [0, 0];
  neighborhoodLayer.eachLayer(layer => {
    if (!layer.feature) return;
    const v = layer._virada;
    const base = getFeatureStyle(layer.feature, layer.feature.properties._zona);
    if (!v) { layer.setStyle(base); return; }
    if (v.virou) viradas++;
    ganhou[v.delta >= 0 ? 0 : 1]++;
    const estilo = rendaAtiva
      ? { ...base }
      : { fillColor: cores[v.delta >= 0 ? 0 : 1], fillOpacity: 0.12 + (Math.abs(v.delta) / maxD) * 0.73,
          color: "rgba(128, 128, 128, 0.6)", weight: 1, opacity: 1, dashArray: null };
    if (v.virou) Object.assign(estilo, { color: contornoVirou, weight: 3.2, opacity: 1, dashArray: null });
    layer.setStyle(estilo);
    if (v.virou) layer.bringToFront();
  });
  atualizarLegendaVirada(fin, cores, ganhou, maxD, viradas);
}

function limparLegendaVirada() {
  if (_legendaViradaCtrl) { _legendaViradaCtrl.remove(); _legendaViradaCtrl = null; }
}

function atualizarLegendaVirada(fin, cores, ganhou, maxD, viradas) {
  limparLegendaVirada();
  _legendaViradaCtrl = L.control({ position: "bottomleft" });
  _legendaViradaCtrl.onAdd = () => {
    const div = L.DomUtil.create("div", "");
    div.id = "map-legend-partidos";
    const pt = (x) => Math.round(x * 100);
    const itens = fin.map((f, i) => ganhou[i] ? `
      <div class="legend-item">
        <div class="legend-color legenda-virada-grad" style="--cor:${cores[i]}"></div>
        <span>${t("{nome} avançou ({n} bairros)", { nome: nomeCurtoVirada(f), n: ganhou[i] })}</span>
      </div>` : "").join("");
    div.innerHTML = `
      <h4>${t("Presidente — virada do 1º para o 2º turno")}</h4>
      ${rendaAtiva ? "" : itens}
      <div class="legend-item">
        <div class="legend-color legenda-virada-contorno"></div>
        <span>${t("Mudou de vencedor ({n} bairros)", { n: viradas })}</span>
      </div>
      <div class="legenda-virada-nota">${rendaAtiva
        ? t("Com a renda ligada, só o contorno de quem virou.")
        : t("Cor mais forte = margem mudou mais (até {n} pontos). Margem = diferença entre os dois finalistas, em % dos votos válidos.", { n: pt(maxD) })}</div>`;
    return div;
  };
  _legendaViradaCtrl.addTo(map);
}

/** Linhas do tooltip do bairro com o modo virada ligado. */
function tooltipViradaBairro(feature) {
  if (!viradaAtiva || !viradaDados) return "";
  const nome = feature.properties.name || feature.properties.nome || "";
  const v = mudancaBairro(resolveBairroKey(nome));
  if (!v) return "";
  const fin = finalistasVirada();
  const pct = (x) => (x * 100).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  const linhas = fin.map((f, i) => `<div>${nomeCurtoVirada(f)}: ${pct(v.s1[i])} → <strong>${pct(v.s2[i])}</strong></div>`).join("");
  const venc = (m) => nomeCurtoVirada(fin[m >= 0 ? 0 : 1]);
  return `<div class="tooltip-zona" style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(var(--tinta),0.15);color:var(--text)">
    <div style="font-size:0.68rem;color:var(--text-muted)">${t("1º turno → 2º turno (votos válidos)")}</div>
    ${linhas}
    ${v.virou ? `<div style="margin-top:2px"><strong>${t("Virou: {a} → {b}", { a: venc(v.m1), b: venc(v.m2) })}</strong></div>` : ""}
  </div>`;
}

// ---- Painel: "Para onde foram os votos" (diagrama de fluxo estimado) ----

function painelViradaHtml(bairroKey, displayName) {
  if (!viradaAtiva || !viradaDados || currentCargo !== CARGO_VIRADA) return "";
  const bloco = bairroKey ? viradaDados.bairros?.[bairroKey] : viradaDados.cidade;
  const titulo = bairroKey ? displayName : tc("Cotia");
  if (!bloco) {
    return `<div class="virada-painel"><div class="section-title"><div class="dot" style="background:#e94560"></div>${t("Para onde foram os votos")}</div>
      <p class="virada-nota">${t("Sem estimativa para este bairro.")}</p></div>`;
  }
  return `<div class="virada-painel">
    <div class="section-title"><div class="dot" style="background:#e94560"></div>${t("Para onde foram os votos")} — ${titulo}</div>
    <div class="virada-cols"><span>${t("1º turno")}</span><span>${t("2º turno")}</span></div>
    <div class="virada-sankey">${sankeyVirada(bloco)}</div>
    <p class="virada-nota">⚠️ ${t("Estimativa estatística a partir de {n} seções (urnas), não uma contagem. O voto é secreto: o diagrama mostra o padrão médio das urnas e não vê, por exemplo, quem trocou um finalista pelo outro.", { n: bloco.secoes })}
      <a href="${urlSite("metodologia.html#eleicoes")}">${t("Como é calculado")}</a></p>
  </div>`;
}

function sankeyVirada(bloco) {
  const cats1 = viradaDados.cats1, cats2 = viradaDados.cats2;
  const W = 340, H = 300, pad = 4, gap = 5, nodeW = 9, xL = 92, xR = W - 92;
  const fmt = (n) => Math.round(n).toLocaleString(LOCALE);
  const tot1 = bloco.tot1;
  const tot2 = cats2.map((_, j) => bloco.fluxo.reduce((s, r) => s + r[j], 0));
  const soma = tot1.reduce((a, b) => a + b, 0) || 1;
  const esc1 = (H - pad * 2 - gap * (cats1.length - 1)) / soma;
  const esc2 = (H - pad * 2 - gap * (cats2.length - 1)) / soma;
  let y = pad;
  const L1 = cats1.map((c, i) => { const n = { c, i, y, h: tot1[i] * esc1, off: 0 }; y += n.h + gap; return n; });
  y = pad;
  const R2 = cats2.map((c, j) => { const n = { c, j, y, h: tot2[j] * esc2, off: 0 }; y += n.h + gap; return n; });
  const cor1 = cats1.map((c, i) => corVirada(c, i));
  const cor2 = cats2.map((c, j) => corVirada(c, j));
  const mx = (xL + nodeW + xR) / 2;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtmlAttr(t("Fluxo estimado de eleitores do 1º para o 2º turno"))}">`;
  bloco.fluxo.forEach((linha, i) => linha.forEach((v, j) => {
    if (v <= 0) return;
    const a = L1[i], b = R2[j], h1 = v * esc1, h2 = v * esc2;
    const y0 = a.y + a.off + h1 / 2, y1 = b.y + b.off + h2 / 2;
    a.off += h1; b.off += h2;
    if (v < soma * 0.003) return; // fio fino demais para ler
    s += `<path d="M${xL + nodeW},${y0.toFixed(1)} C${mx},${y0.toFixed(1)} ${mx},${y1.toFixed(1)} ${xR},${y1.toFixed(1)}"
      style="stroke:${cor1[i]}" stroke-opacity="0.4" stroke-width="${Math.max((h1 + h2) / 2, 0.7).toFixed(1)}" fill="none">
      <title>${escapeHtmlAttr(`${nomeCurtoVirada(cats1[i])} → ${nomeCurtoVirada(cats2[j])}: ~${fmt(v)}`)}</title></path>`;
  }));
  const rotulo = (x, n, total, ancora) => {
    if (n.h < 7) return "";
    const nome = nomeCurtoVirada(n.c);
    const curto = nome.length > 14 ? nome.split(" ").pop() : nome; // ESCRITOR AUGUSTO CURY → CURY
    return `<text x="${x}" y="${(n.y + n.h / 2 + 3).toFixed(1)}" text-anchor="${ancora}" class="virada-rotulo">${escapeHtmlAttr(curto)}
      <tspan class="virada-num" x="${x}" dy="10">${n.h >= 16 ? fmt(total) : ""}</tspan></text>`;
  };
  L1.forEach(n => {
    s += `<rect x="${xL}" y="${n.y.toFixed(1)}" width="${nodeW}" height="${Math.max(n.h, 1).toFixed(1)}" style="fill:${cor1[n.i]}"><title>${escapeHtmlAttr(`${nomeCurtoVirada(n.c)}: ${fmt(tot1[n.i])}`)}</title></rect>`;
    s += rotulo(xL - 5, n, tot1[n.i], "end");
  });
  R2.forEach(n => {
    s += `<rect x="${xR}" y="${n.y.toFixed(1)}" width="${nodeW}" height="${Math.max(n.h, 1).toFixed(1)}" style="fill:${cor2[n.j]}"><title>${escapeHtmlAttr(`${nomeCurtoVirada(n.c)}: ${fmt(tot2[n.j])}`)}</title></rect>`;
    s += rotulo(xR + nodeW + 5, n, bloco.tot2[n.j], "start");
  });
  return s + "</svg>";
}

// ---- Botão e estado ----

function setVirada(ativa) {
  if (!viradaDados) return;
  viradaAtiva = !!ativa;
  const btn = document.getElementById("btn-virada");
  if (btn) {
    btn.classList.toggle("active", viradaAtiva);
    btn.setAttribute("aria-pressed", String(viradaAtiva));
  }
  if (viradaAtiva) {
    candidatoDestaque = null;
    currentCandidatoFiltro = "";
    if (rankingControl) { rankingControl.remove(); rankingControl = null; } // caixa "Votos por bairro" (map.js)
    if (currentCargo !== CARGO_VIRADA) currentCargo = CARGO_VIRADA;
  } else {
    limparLegendaVirada();
  }
  renderSidebar();
  pintarBairrosGeral();
}

/** Desliga sem repintar (quem chama repinta). */
function desligarVirada() {
  if (!viradaAtiva) return;
  viradaAtiva = false;
  const btn = document.getElementById("btn-virada");
  if (btn) { btn.classList.remove("active"); btn.setAttribute("aria-pressed", "false"); }
  limparLegendaVirada();
}

/** Mostra/esconde o botão conforme o ano tem dados de virada. */
function atualizarBotaoVirada() {
  let btn = document.getElementById("btn-virada");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-action-btn";
    btn.id = "btn-virada";
    btn.setAttribute("aria-pressed", "false");
    btn.title = t("Mostra onde a votação para Presidente mudou entre o 1º e o 2º turno");
    btn.textContent = t("Virada (1º → 2º turno)");
    btn.addEventListener("click", () => setVirada(!viradaAtiva));
    let acoes = document.querySelector(".map-actions");
    if (!acoes) {
      const ctrl = L.control({ position: "topleft" });
      ctrl.onAdd = () => {
        const div = L.DomUtil.create("div", "map-actions");
        L.DomEvent.disableClickPropagation(div);
        return div;
      };
      ctrl.addTo(map);
      acoes = document.querySelector(".map-actions");
    }
    acoes.insertBefore(btn, document.getElementById("btn-limpar"));
  }
  btn.hidden = !viradaDados;
}
