/**
 * abas.js — teclado dos controles segmentados (.segmentado).
 *
 * Setas ←/→ e Home/End movem o foco entre as abas de um grupo; Enter/Espaço
 * ativam (são <button> ou <a>, então disparam "click" sozinhos). Quem decide
 * o que a aba mostra é a página: o header navega entre páginas (links com
 * aria-current) e contas.js troca os painéis pelo #hash da URL.
 */

/** Itens que pertencem diretamente a este grupo (ignora grupos aninhados). */
function abasDoGrupo(grupo) {
  return Array.from(grupo.querySelectorAll(".segmentado__aba"))
    .filter((a) => a.closest(".segmentado") === grupo);
}

function ligarTecladoAbas(grupo) {
  grupo.addEventListener("keydown", (e) => {
    const abas = abasDoGrupo(grupo);
    const atual = abas.indexOf(document.activeElement);
    if (atual < 0) return;
    let prox;
    switch (e.key) {
      case "ArrowRight": prox = (atual + 1) % abas.length; break;
      case "ArrowLeft":  prox = (atual - 1 + abas.length) % abas.length; break;
      case "Home":       prox = 0; break;
      case "End":        prox = abas.length - 1; break;
      default: return;
    }
    e.preventDefault();
    abas[prox].focus();
    abas[prox].scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

function initAbasSegmentadas() {
  document.querySelectorAll(".segmentado").forEach(ligarTecladoAbas);
  // No celular a aba da página atual fica à vista mesmo se o grupo rolar
  const atual = document.querySelector('.segmentado--site [aria-current="page"]');
  if (atual) atual.scrollIntoView({ block: "nearest", inline: "nearest" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAbasSegmentadas);
} else {
  initAbasSegmentadas();
}
