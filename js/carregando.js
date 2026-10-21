// =============================================
// Carregamento com microcopy animado (todas as páginas com dados)
// =============================================
//
// Marcação esperada (ver index.html):
//   #loading                → sobreposição (role="status", aria-live="polite")
//   #loading-sr             → frase completa, só para leitor de tela (.sr-only)
//   #loading-status         → texto curto visual (aria-hidden), pulsando
//   #loading-acoes          → botão "Tentar novamente", visível só no erro
//
// O texto visual não leva reticências: os três pontos animados vêm do CSS.

const Carregando = (() => {
  let timerSaida = null;
  const el = (id) => document.getElementById(id);
  const semPontos = (s) => String(s).replace(/\s*(\.\.\.|…)\s*$/, "");

  /**
   * Atualiza o que a página está fazendo.
   * `leitor` = frase para o leitor de tela; se omitido, usa o texto visual
   * + "aguarde"; `null` mantém a frase anterior (evita anunciar passos rápidos).
   */
  function status(texto, leitor) {
    const visual = semPontos(texto);
    if (el("loading-status")) el("loading-status").textContent = visual;
    // "Tudo pronto!": sem reticências nem pulso
    if (el("loading")) el("loading").classList.toggle("fim", /!$/.test(visual));
    if (leitor === null || !el("loading-sr")) return;
    el("loading-sr").textContent = leitor || `${visual}. ${t("Por favor, aguarde.")}`;
  }

  function mostrar(show, leitor) {
    const box = el("loading");
    if (!box) return;
    clearTimeout(timerSaida);
    if (show) {
      box.classList.remove("erro", "saindo", "fim");
      if (el("loading-acoes")) el("loading-acoes").hidden = true;
      box.style.display = "flex";
      return;
    }
    if (box.classList.contains("erro")) return; // o erro fica na tela
    if (el("loading-sr")) el("loading-sr").textContent = leitor || t("Conteúdo carregado.");
    box.classList.add("saindo");
    timerSaida = setTimeout(() => { box.style.display = "none"; }, 300);
  }

  /** Falha: mensagem em vermelho, sem pulso, e botão para recarregar. */
  function erro(texto, detalhe) {
    const box = el("loading");
    if (!box) return;
    clearTimeout(timerSaida);
    box.classList.remove("saindo");
    box.classList.add("erro");
    box.style.display = "flex";
    const visual = semPontos(texto);
    if (el("loading-status")) el("loading-status").textContent = visual;
    if (el("loading-sr")) {
      el("loading-sr").textContent = detalhe
        ? `${visual} (${detalhe}). ${t("Use o botão Tentar novamente.")}`
        : `${visual}. ${t("Use o botão Tentar novamente.")}`;
    }
    const acoes = el("loading-acoes");
    if (acoes) {
      acoes.hidden = false;
      const botao = acoes.querySelector("button");
      if (botao && !botao.dataset.ligado) {
        botao.dataset.ligado = "1";
        botao.addEventListener("click", () => location.reload());
      }
    }
  }

  return { status, mostrar, erro };
})();
