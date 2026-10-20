/**
 * tema.js — Tema claro / escuro em todas as páginas.
 *
 * Carregado no <head> (depois de i18n.js e antes do CSS ser aplicado ao
 * corpo) para definir data-theme no <html> já no primeiro desenho, sem
 * "piscar" o tema errado. Ordem da escolha:
 *   1. preferência salva no localStorage ("tema": "light" | "dark");
 *   2. preferência do sistema (prefers-color-scheme);
 *   3. claro.
 * O botão Alternar tema é criado no header ao lado do PT/EN. Cada troca
 * dispara o evento "temachange" no document (o mapa troca os tiles e as
 * páginas de Contas recolorem os gráficos).
 */

const TEMA_CHAVE = "tema";

const TEMA_EN = {
  "Ativar tema escuro": "Switch to dark theme",
  "Ativar tema claro": "Switch to light theme",
};
if (typeof I18N_EN === "object") Object.assign(I18N_EN, TEMA_EN);

function temaInicial() {
  try {
    const salvo = localStorage.getItem(TEMA_CHAVE);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch (e) { /* storage bloqueado: segue o sistema */ }
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark" : "light";
}

/** Tema atual ("light" ou "dark"). */
function temaAtual() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Aplica o tema no <html>, ajusta a cor da barra do navegador e o botão. */
function aplicarTema(tema) {
  document.documentElement.setAttribute("data-theme", tema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tema === "dark" ? "#16213e" : "#ffffff");
  atualizarBotaoTema();
  document.dispatchEvent(new CustomEvent("temachange", { detail: { tema } }));
}

/** Alterna claro/escuro e guarda a escolha. */
function alternarTema() {
  const novo = temaAtual() === "dark" ? "light" : "dark";
  try { localStorage.setItem(TEMA_CHAVE, novo); } catch (e) { /* sem storage: vale só nesta visita */ }
  aplicarTema(novo);
}

function atualizarBotaoTema() {
  const btn = document.getElementById("tema-toggle");
  if (!btn) return;
  const escuro = temaAtual() === "dark";
  // Mostra o tema para o qual o botão troca (☀️ no escuro, 🌙 no claro)
  btn.textContent = escuro ? "☀️" : "🌙";
  const rotulo = t(escuro ? "Ativar tema claro" : "Ativar tema escuro");
  btn.title = rotulo;
  btn.setAttribute("aria-label", rotulo);
  btn.setAttribute("aria-pressed", String(escuro));
}

function addTemaToggle() {
  const header = document.getElementById("header");
  if (!header || document.getElementById("tema-toggle")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "tema-toggle";
  btn.className = "tema-toggle";
  btn.addEventListener("click", alternarTema);
  // Agrupa com o PT/EN num só bloco à direita do header
  const acoes = document.createElement("div");
  acoes.className = "header-acoes";
  const lang = document.getElementById("lang-toggle");
  if (lang) header.insertBefore(acoes, lang);
  else header.appendChild(acoes);
  acoes.append(btn);
  if (lang) acoes.append(lang);
  atualizarBotaoTema();
}

/**
 * Cores do Chart.js (texto e grade) a partir das variáveis CSS do tema.
 * Ajusta os padrões para os próximos gráficos e recolore os já desenhados
 * (o Chart.js guarda as opções resolvidas, então só mudar os padrões não
 * basta para quem já existe).
 */
function coresGraficosTema() {
  if (typeof Chart === "undefined") return;
  const css = getComputedStyle(document.documentElement);
  const texto = css.getPropertyValue("--text-muted").trim();
  const grade = `rgba(${css.getPropertyValue("--tinta").trim()}, ${temaAtual() === "dark" ? 0.07 : 0.1})`;
  Chart.defaults.color = texto;
  Chart.defaults.borderColor = grade;
  Object.values(Chart.instances).forEach((c) => {
    Object.values(c.options.scales || {}).forEach((s) => {
      if (s.ticks) s.ticks.color = texto;
      if (s.grid) s.grid.color = grade;
      if (s.border) s.border.color = grade;
    });
    const legenda = c.options.plugins && c.options.plugins.legend;
    if (legenda && legenda.labels) legenda.labels.color = texto;
    c.update("none");
  });
}
document.addEventListener("temachange", coresGraficosTema);

// Já no carregamento: aplica antes do primeiro desenho
document.documentElement.setAttribute("data-theme", temaInicial());

if (document.readyState === "loading") {
  // Chart.js e o header já existem no DOMContentLoaded (scripts no fim do <body>)
  document.addEventListener("DOMContentLoaded", () => {
    addTemaToggle();
    aplicarTema(temaAtual());
  });
} else {
  addTemaToggle();
  aplicarTema(temaAtual());
}
