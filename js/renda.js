/**
 * renda.js — Renda do Censo IBGE 2022 nos bairros (mapas de 2024 e 2022/2026).
 *
 * Lê data/censo_renda_setores.json (gerado por scripts/download_censo.py):
 * um ponto por setor censitário com a renda média do responsável pelo
 * domicílio e o número de domicílios. A renda de cada polígono de bairro
 * (OSM ou Voronoi) é a média dos setores que caem dentro dele, ponderada
 * pelos domicílios. Polígono sem setor dentro usa o setor mais próximo do
 * centro dele.
 *
 * Com o modo ligado, o mapa pinta cada SETOR pela sua renda
 * (data/censo_renda_setores.geojson, carregado no primeiro clique) e os
 * bairros ficam só no contorno: os bairros do mapa são aproximados (local de
 * votação mais próximo) e juntam setores muito diferentes — ex.: Jardim do
 * Engenho somava setores de R$ 2 mil com condomínios de R$ 15 mil. A renda
 * agregada do bairro continua no tooltip. Sem o geojson, pinta o bairro.
 *
 * O botão "Renda (Censo)" (topleft do mapa) liga/desliga a coloração e a
 * legenda (bottomright). map.js chama estiloRendaBairro() em getFeatureStyle,
 * então resets e o destaque de vereador preservam as cores da renda.
 * 2024: addBotaoRenda() entra nos botões já existentes (Votos por seção /
 * Limpar). 2022/2026: addAcoesRenda() cria "Renda (Censo)" + "Limpar"; a
 * página passa como repintar (cores de renda ou de candidatos).
 */

// Do mais claro (renda baixa) ao mais escuro (renda alta)
const RENDA_CORES = ["#c7e9c0", "#74c476", "#1f7a3a"];
const RENDA_ROTULOS = ["Renda baixa", "Renda média", "Renda alta"];

let rendaDados = null;   // conteúdo do JSON
let rendaAtiva = false;  // botão ligado
let _legendaRendaCtrl = null;
let _aoMudarRenda = null; // repinta os bairros; padrão: reaplicarEstiloBairros (2024)
let _geoSetores = null;    // FeatureCollection dos setores (props r, m, d)
let _carregandoSetores = null;
let _camadaSetores = null;

/** Carrega (uma vez) os contornos dos setores com renda. */
function carregarSetoresRenda() {
  if (_geoSetores) return Promise.resolve(_geoSetores);
  if (!_carregandoSetores) {
    _carregandoSetores = fetch(urlSite("data/censo_renda_setores.geojson"))
      .then((r) => (r.ok ? r.json() : null))
      .then((g) => (_geoSetores = g?.features?.length ? g : null))
      .catch(() => null);
  }
  return _carregandoSetores;
}

/** Mostra/esconde a camada de setores (abaixo dos bairros, sem interação). */
function atualizarCamadaSetores() {
  if (!rendaAtiva || !_geoSetores) {
    if (_camadaSetores) { map.removeLayer(_camadaSetores); }
    return;
  }
  if (!_camadaSetores) {
    if (!map.getPane("setoresRenda")) {
      const pane = map.createPane("setoresRenda");
      pane.style.zIndex = 350; // abaixo dos bairros (overlayPane = 400)
      pane.style.pointerEvents = "none";
    }
    _camadaSetores = L.geoJSON(_geoSetores, {
      pane: "setoresRenda",
      interactive: false,
      style: (f) => {
        const cor = RENDA_CORES[faixaRenda(f.properties.r)];
        return { fillColor: cor, fillOpacity: 0.6, color: cor, weight: 0.5, opacity: 0.9 };
      },
    });
  }
  _camadaSetores.addTo(map);
}

async function loadRendaCenso() {
  try {
    const resp = await fetch(urlSite("data/censo_renda_setores.json"));
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

/** Estilo do bairro no modo renda; null quando o modo está desligado ou
 *  quando a camada de setores já mostra a renda (bairro só no contorno). */
function estiloRendaBairro(feature) {
  if (!rendaAtiva || _geoSetores) return null;
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
  return `<div class="tooltip-zona" style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(var(--tinta),0.15)">
    <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cor};margin-right:5px"></span>${t(RENDA_ROTULOS[faixaRenda(r.renda)])}:
    <strong>${_fmtReais(r.renda)}</strong> ${t("por mês")}
    ${_geoSetores ? `<div style="font-size:0.66rem;color:var(--text-muted)">${t("média dos setores do bairro")}</div>` : ""}</div>`;
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
      ${_geoSetores ? `<div class="legenda-renda-fonte">${t("Cada mancha é um setor censitário; a linha tracejada é o bairro.")}</div>` : ""}
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

/** Liga/desliga o modo renda e repinta os bairros. */
function setRenda(ativa) {
  if (!rendaDados) return;
  rendaAtiva = !!ativa;
  const btn = document.getElementById("btn-renda");
  if (btn) {
    btn.classList.toggle("active", rendaAtiva);
    btn.setAttribute("aria-pressed", String(rendaAtiva));
  }
  const repintar = () => {
    atualizarCamadaSetores();
    (_aoMudarRenda || reaplicarEstiloBairros)();
    atualizarLegendaRenda();
  };
  repintar();
  // Primeiro clique: os setores chegam depois; repinta quando carregarem
  if (rendaAtiva && !_geoSetores) carregarSetoresRenda().then((g) => { if (g && rendaAtiva) repintar(); });
}

function toggleRenda() {
  setRenda(!rendaAtiva);
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

/**
 * Botões "Renda (Censo)" e "Limpar" no topleft do mapa (página 2022/2026).
 * aoMudar repinta os bairros conforme rendaAtiva; onLimpar volta às cores
 * dos candidatos.
 */
function addAcoesRenda({ aoMudar, onLimpar }) {
  _aoMudarRenda = aoMudar;
  const ctrl = L.control({ position: "topleft" });
  ctrl.onAdd = function () {
    const div = L.DomUtil.create("div", "map-actions");
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    div.innerHTML = `
      <button type="button" class="map-action-btn" id="btn-renda" aria-pressed="false"
              title="${t("Pinta os bairros pela renda média do Censo IBGE, sem as cores dos candidatos")}">${t("Renda (Censo)")}</button>
      <button type="button" class="map-action-btn" id="btn-limpar"
              title="${t("Volta às cores dos candidatos")}">${t("Limpar")}</button>`;
    div.querySelector("#btn-renda").addEventListener("click", toggleRenda);
    div.querySelector("#btn-limpar").addEventListener("click", onLimpar);
    return div;
  };
  ctrl.addTo(map);
}
