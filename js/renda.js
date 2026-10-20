/**
 * renda.js — Renda do Censo IBGE 2022 nos bairros (só no mapa de 2024).
 *
 * Lê data/censo_renda_setores.json (gerado por scripts/download_censo.py):
 * um ponto por setor censitário com a renda média do responsável pelo
 * domicílio e o número de domicílios. A renda de cada polígono de bairro
 * (OSM ou Voronoi) é a média dos setores que caem dentro dele, ponderada
 * pelos domicílios. Polígono sem setor dentro usa o setor mais próximo do
 * centro dele.
 *
 * O botão "Renda (Censo)" (topleft do mapa) liga/desliga a coloração e a
 * legenda (bottomright). map.js chama estiloRendaBairro() em getFeatureStyle,
 * então resets e o destaque de vereador preservam as cores da renda.
 */

// Do mais claro (renda baixa) ao mais escuro (renda alta)
const RENDA_CORES = ["#c7e9c0", "#74c476", "#1f7a3a"];
const RENDA_ROTULOS = ["Renda baixa", "Renda média", "Renda alta"];

let rendaDados = null;   // conteúdo do JSON
let rendaAtiva = false;  // botão ligado
let _legendaRendaCtrl = null;

async function loadRendaCenso() {
  try {
    const resp = await fetch("data/censo_renda_setores.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    rendaDados = await resp.json();
    return { ok: true, count: rendaDados.setores?.length || 0 };
  } catch (err) {
    rendaDados = null;
    return { ok: false, error: err.message };
  }
}

/** Limites das faixas em reais (ex.: [3030, 6060]). */
function limitesRenda() {
  const meta = rendaDados?._meta || {};
  const sm = meta.salario_minimo || 1212;
  return (meta.faixas_sm || [2.5, 5]).map((x) => x * sm);
}

/** 0, 1 ou 2 conforme a renda. */
function faixaRenda(renda) {
  const lim = limitesRenda();
  let i = 0;
  while (i < lim.length && renda > lim[i]) i++;
  return i;
}

/** Renda média ponderada do polígono; guardada em feature.properties._renda. */
function rendaDoBairro(feature) {
  if (!rendaDados?.setores?.length || typeof turf === "undefined") return null;
  if (feature.properties._renda !== undefined) return feature.properties._renda;

  let soma = 0, doms = 0, n = 0;
  try {
    for (const [lat, lng, renda, dom] of rendaDados.setores) {
      if (turf.booleanPointInPolygon([lng, lat], feature)) {
        soma += renda * dom;
        doms += dom;
        n++;
      }
    }
  } catch (e) { /* geometria inválida: cai no setor mais próximo */ }

  let resultado = null;
  if (doms > 0) {
    resultado = { renda: soma / doms, domicilios: doms, setores: n };
  } else {
    try {
      const [cx, cy] = turf.centroid(feature).geometry.coordinates;
      let melhor = null, dist = Infinity;
      for (const s of rendaDados.setores) {
        const d = (s[0] - cy) ** 2 + (s[1] - cx) ** 2;
        if (d < dist) { dist = d; melhor = s; }
      }
      if (melhor) resultado = { renda: melhor[2], domicilios: melhor[3], setores: 0 };
    } catch (e) { /* sem centróide */ }
  }
  feature.properties._renda = resultado;
  return resultado;
}

/** Estilo do bairro no modo renda; null quando o modo está desligado. */
function estiloRendaBairro(feature) {
  if (!rendaAtiva) return null;
  const r = rendaDoBairro(feature);
  if (!r) return null;
  const cor = RENDA_CORES[faixaRenda(r.renda)];
  return {
    fillColor: cor,
    fillOpacity: 0.55,
    color: cor,
    weight: 1,
    opacity: 0.9,
    dashArray: null,
  };
}

const _fmtReais = (v) => "R$ " + Math.round(v).toLocaleString(LOCALE);

/** Linha extra do tooltip do bairro (vazia com o modo desligado). */
function tooltipRendaBairro(feature) {
  if (!rendaAtiva) return "";
  const r = rendaDoBairro(feature);
  if (!r) return "";
  const cor = RENDA_CORES[faixaRenda(r.renda)];
  return `<div class="tooltip-zona" style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15)">
    <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cor};margin-right:5px"></span>${t(RENDA_ROTULOS[faixaRenda(r.renda)])}:
    <strong>${_fmtReais(r.renda)}</strong> ${t("por mês")}</div>`;
}

function atualizarLegendaRenda() {
  if (_legendaRendaCtrl) {
    _legendaRendaCtrl.remove();
    _legendaRendaCtrl = null;
  }
  if (!rendaAtiva || !rendaDados) return;

  const [l1, l2] = limitesRenda();
  const faixas = [
    t("até {v}", { v: _fmtReais(l1) }),
    t("{a} a {b}", { a: _fmtReais(l1), b: _fmtReais(l2) }),
    t("acima de {v}", { v: _fmtReais(l2) }),
  ];
  const ano = rendaDados._meta?.ano || 2022;

  _legendaRendaCtrl = L.control({ position: "bottomright" });
  _legendaRendaCtrl.onAdd = () => {
    const div = L.DomUtil.create("div", "");
    div.id = "map-legend-renda";
    div.innerHTML = `
      <h4>${t("Renda média do responsável pelo domicílio")}</h4>
      ${RENDA_CORES.map((cor, i) => `
        <div class="legend-item">
          <div class="legend-color" style="background:${cor};opacity:0.85"></div>
          <span><strong>${t(RENDA_ROTULOS[i])}</strong> · ${faixas[i]}</span>
        </div>`).join("")}
      <div class="legenda-renda-fonte">${t("Fonte: IBGE, Censo {ano}", { ano })}</div>`;
    return div;
  };
  _legendaRendaCtrl.addTo(map);
}

/** Reaplica o estilo dos bairros mantendo o destaque de vereador, se houver. */
function reaplicarEstiloBairros() {
  if (typeof currentVereadorFiltro !== "undefined" && currentVereadorFiltro) {
    highlightVereadorOnMap(currentVereadorFiltro);
  } else {
    resetBairrosStyle();
  }
}

function toggleRenda() {
  if (!rendaDados) return;
  rendaAtiva = !rendaAtiva;
  const btn = document.getElementById("btn-renda");
  if (btn) {
    btn.classList.toggle("active", rendaAtiva);
    btn.setAttribute("aria-pressed", String(rendaAtiva));
  }
  reaplicarEstiloBairros();
  atualizarLegendaRenda();
}

/** Acrescenta o botão "Renda (Censo)" aos botões do mapa (Votos por seção / Limpar). */
function addBotaoRenda() {
  const acoes = document.querySelector(".map-actions");
  if (!acoes || document.getElementById("btn-renda")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "map-action-btn";
  btn.id = "btn-renda";
  btn.setAttribute("aria-pressed", "false");
  btn.title = t("Pinta os bairros pela renda média do Censo IBGE");
  btn.textContent = t("Renda (Censo)");
  btn.addEventListener("click", toggleRenda);
  const limpar = document.getElementById("btn-limpar");
  acoes.insertBefore(btn, limpar);
}
