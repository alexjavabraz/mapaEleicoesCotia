/**
 * fontes.js — Rodapé com as fontes dos dados, igual em todas as páginas.
 *
 * Cria o <footer id="rodape"> no fim do <body> e o modal "Fontes e
 * metodologia" (um <dialog>: foco preso no modal, Esc fecha, o foco volta
 * para o botão). O conteúdo do modal fica em FONTES_SECOES: cada seção tem
 * parágrafos em português (traduzidos por t() com FONTES_EN) e links.
 *
 * Nas páginas do mapa o rodapé fica fixo embaixo e o #main termina acima
 * dele (css/style.css, --footer-height); em Contas ele segue o conteúdo.
 */

const FONTES_EN = {
  "Dados públicos:": "Public data:",
  "Câmara de Cotia": "Cotia City Council",
  "Fontes e metodologia": "Sources and methodology",
  "Sobre o projeto": "About the project",
  "Metodologia": "Methodology",
  "Sobre": "About",
  "Metodologia completa e avisos legais →": "Full methodology and legal notices →",
  "Apoie a iniciativa": "Support the project",
  "Apoie": "Support",
  "Fontes": "Sources",
  "Este site é feito de forma independente, sem patrocínio de partido ou candidato. Se ele é útil para você, considere apoiar com um PIX de qualquer valor: isso ajuda a manter os dados atualizados e a trazer novas informações de Cotia.":
    "This site is built independently, with no sponsorship from any party or candidate. If you find it useful, consider supporting it with a PIX of any amount: it helps keep the data up to date and bring new information about Cotia.",
  "No app do seu banco, escolha Pix → Pagar com QR Code e aponte a câmera para o código.":
    "In your bank app, choose Pix → Pay with QR Code and point the camera at the code.",
  "QR Code do PIX para apoiar o projeto": "PIX QR Code to support the project",
  "Obrigado pelo apoio!": "Thank you for your support!",
  "De onde vêm os dados": "Where the data comes from",
  "Fechar": "Close",
  "Todos os números do site vêm de dados públicos oficiais. Os arquivos são baixados por scripts automáticos e guardados no próprio site; ao abrir uma página nenhum dado é consultado em tempo real.":
    "Every number on this site comes from official public data. The files are downloaded by automated scripts and stored on the site itself; opening a page does not query any source live.",
  "Limitação:": "Limitation:",
  "Fontes:": "Sources:",

  "Eleições 2024 (Prefeito e Vereadores)": "2024 Elections (Mayor and City Council)",
  "Os resultados vêm do Tribunal Superior Eleitoral (TSE): o total de votos de cada candidato por zona eleitoral e a votação de cada seção. Somamos as seções de cada local de votação (escola) e de cada bairro.":
    "Results come from the Superior Electoral Court (TSE): each candidate's total votes per electoral zone and the vote count of every polling section. We add up the sections of each polling place (school) and of each neighborhood.",
  "O endereço, o bairro e as coordenadas de cada escola são os do cadastro de locais de votação do TSE.":
    "Each school's address, neighborhood and coordinates come from the TSE register of polling places.",
  "O eleitor vota onde está inscrito, que nem sempre é perto de onde mora. O resultado de um bairro é o das escolas daquele bairro, não necessariamente o de quem mora nele.":
    "Voters cast their ballot where they are registered, which is not always near where they live. A neighborhood's result is that of the schools in it, not necessarily that of its residents.",
  "TSE — Resultados 2024": "TSE — 2024 results",
  "TSE — Portal de Dados Abertos": "TSE — Open Data Portal",

  "Eleições 2022 e 2026 (Presidente a Deputado)": "2022 and 2026 Elections (President to Representatives)",
  "Mesma fonte: votação por seção do TSE (arquivo de São Paulo para Governador, Senador e Deputados; arquivo nacional para Presidente), filtrada para Cotia e somada por bairro.":
    "Same source: TSE votes per polling section (São Paulo file for Governor, Senator and Representatives; national file for President), filtered to Cotia and added up by neighborhood.",
  "O TSE só publica os arquivos depois que a apuração termina. O 2º turno de 2026 aparece aqui quando o TSE divulgar a votação por seção.":
    "TSE only publishes the files after counting ends. The 2026 runoff shows up here once TSE releases the per-section results.",
  "TSE — Resultados 2022": "TSE — 2022 results",
  "TSE — Resultados 2026": "TSE — 2026 results",

  "Gastos de campanha e patrimônio (2024)": "Campaign spending and assets (2024)",
  "Gasto de campanha é a soma das despesas contratadas que o candidato declarou na prestação de contas final ao TSE. O custo por voto é esse gasto dividido pelos votos que ele teve no 1º turno.":
    "Campaign spending is the sum of contracted expenses the candidate declared in their final financial report to TSE. Cost per vote is that spending divided by the votes they got in the 1st round.",
  "Patrimônio é a soma dos bens que o candidato declarou ao registrar a candidatura. O link \"TSE ↗\" abre a página do candidato no DivulgaCandContas.":
    "Assets are the sum of the property the candidate declared when registering. The \"TSE ↗\" link opens the candidate's page on DivulgaCandContas.",
  "São valores declarados pelo próprio candidato. Bens costumam ser informados pelo valor de compra, não pelo valor de mercado.":
    "These are amounts declared by the candidates themselves. Assets are usually reported at purchase price, not market value.",
  "TSE — Prestação de contas 2024": "TSE — 2024 campaign finance",
  "TSE — Candidatos e bens 2024": "TSE — 2024 candidates and assets",

  "Bairros do mapa": "Neighborhoods on the map",
  "Não existe um mapa oficial de bairros de Cotia em formato aberto: o OpenStreetMap não tem os bairros da cidade e o IBGE não divulga bairros para Cotia. Por isso as áreas são desenhadas por proximidade: cada ponto do município fica com o bairro cujo centro (a média das coordenadas dos seus locais de votação, segundo o cadastro do TSE) está mais perto, recortado pelo contorno do município do OpenStreetMap.":
    "There is no official open map of Cotia's neighborhoods: OpenStreetMap does not have them and IBGE does not publish neighborhoods for Cotia. So the areas are drawn by proximity: each point of the city is assigned the neighborhood whose center (the average coordinates of its polling places, per the TSE register) is closest, clipped by the city boundary from OpenStreetMap.",
  "As fronteiras são aproximadas e não são os limites oficiais dos bairros.":
    "The borders are approximate and are not the official neighborhood limits.",
  "OpenStreetMap — contorno de Cotia": "OpenStreetMap — Cotia boundary",

  "Renda (Censo 2022 do IBGE)": "Income (IBGE 2022 Census)",
  "Usamos o rendimento nominal médio mensal dos responsáveis pelos domicílios (variável V06004) de cada setor censitário de Cotia. Com \"Renda (Censo)\" ligado, cada setor é pintado pela sua própria renda e os bairros ficam só no contorno tracejado. A renda que aparece ao passar sobre um bairro é a média dos setores dentro dele, ponderada pelo número de domicílios.":
    "We use the average monthly nominal income of household heads (variable V06004) in each census tract of Cotia. With \"Income (Census)\" on, each tract is colored by its own income and neighborhoods are shown only as a dashed outline. The income shown when hovering a neighborhood is the average of the tracts inside it, weighted by the number of households.",
  "As cores separam três faixas em salários mínimos de 2022 (R$ 1.212): até 2,5 SM (R$ 3.030), de 2,5 a 5 SM e acima de 5 SM (R$ 6.060).":
    "The colors split three brackets in 2022 minimum wages (R$ 1,212): up to 2.5 MW (R$ 3,030), 2.5 to 5 MW and above 5 MW (R$ 6,060).",
  "É a renda da pessoa responsável pelo domicílio, não a renda per capita nem a renda total da família. Os dados são de 2022, e a média de um bairro grande pode esconder setores muito diferentes.":
    "This is the income of the household head, not per capita or total family income. The data is from 2022, and a large neighborhood's average can hide very different tracts.",
  "IBGE — Censo 2022, renda por setor": "IBGE — 2022 Census, income by tract",
  "IBGE — Malha de setores censitários": "IBGE — Census tract boundaries",

  "Contas do Município": "Municipal Spending",
  "As despesas da Prefeitura e da Câmara de Cotia vêm do Portal da Transparência Municipal do Tribunal de Contas do Estado (TCE-SP), que recebe os dados enviados pela própria Prefeitura e pela Câmara. Pegamos todos os meses desde 2020; os valores pagos contam no mês do pagamento.":
    "Spending by Cotia's City Hall and City Council comes from the Municipal Transparency Portal of the São Paulo State Audit Court (TCE-SP), which receives the data sent by City Hall and the Council themselves. We take every month since 2020; paid amounts count in the month of payment.",
  "Os dados são atualizados todo dia 10. O TCE publica cada mês com cerca de seis semanas de atraso, então os meses mais recentes ainda não aparecem. O CPF de pessoas físicas não é mostrado.":
    "The data is refreshed on the 10th of every month. TCE publishes each month about six weeks late, so the latest months do not show yet. Individuals' CPF numbers are not shown.",
  "TCE-SP — Transparência Municipal": "TCE-SP — Municipal Transparency",

  "Viagens da Câmara": "City Council trips",
  "Os relatórios de viagem de vereadores e servidores são PDFs publicados pela Câmara Municipal de Cotia, um por viagem. Lemos cada PDF automaticamente (com reconhecimento de texto nos escaneados) para tirar destino, período e valores.":
    "Trip reports of council members and staff are PDFs published by Cotia City Council, one per trip. We read each PDF automatically (with text recognition on scanned ones) to extract destination, dates and amounts.",
  "A leitura automática pode errar em PDFs escaneados. Alguns arquivos de 2017 estão privados e não há relatórios publicados para 2020 e 2022.":
    "Automatic reading can make mistakes on scanned PDFs. Some 2017 files are private and there are no published reports for 2020 and 2022.",
  "Câmara de Cotia — Relatório de viagens": "Cotia City Council — Trip reports",

  "Mapa e código": "Map and code",
  "O fundo do mapa é da Esri e do OpenStreetMap. Os scripts que baixam e montam cada arquivo estão no código aberto do site, no GitHub.":
    "Map tiles are from Esri and OpenStreetMap. The scripts that download and build each file are in the site's open source code on GitHub.",
  "Código do site (GitHub)": "Site source code (GitHub)",
};
if (typeof I18N_EN === "object") Object.assign(I18N_EN, FONTES_EN);

const FONTES_SECOES = [
  {
    titulo: "Eleições 2024 (Prefeito e Vereadores)",
    textos: [
      "Os resultados vêm do Tribunal Superior Eleitoral (TSE): o total de votos de cada candidato por zona eleitoral e a votação de cada seção. Somamos as seções de cada local de votação (escola) e de cada bairro.",
      "O endereço, o bairro e as coordenadas de cada escola são os do cadastro de locais de votação do TSE.",
    ],
    limite: "O eleitor vota onde está inscrito, que nem sempre é perto de onde mora. O resultado de um bairro é o das escolas daquele bairro, não necessariamente o de quem mora nele.",
    links: [
      ["TSE — Resultados 2024", "https://dadosabertos.tse.jus.br/dataset/resultados-2024"],
      ["TSE — Portal de Dados Abertos", "https://dadosabertos.tse.jus.br/"],
    ],
  },
  {
    titulo: "Eleições 2022 e 2026 (Presidente a Deputado)",
    textos: [
      "Mesma fonte: votação por seção do TSE (arquivo de São Paulo para Governador, Senador e Deputados; arquivo nacional para Presidente), filtrada para Cotia e somada por bairro.",
    ],
    limite: "O TSE só publica os arquivos depois que a apuração termina. O 2º turno de 2026 aparece aqui quando o TSE divulgar a votação por seção.",
    links: [
      ["TSE — Resultados 2022", "https://dadosabertos.tse.jus.br/dataset/resultados-2022"],
      ["TSE — Resultados 2026", "https://dadosabertos.tse.jus.br/dataset/resultados-2026"],
    ],
  },
  {
    titulo: "Gastos de campanha e patrimônio (2024)",
    textos: [
      "Gasto de campanha é a soma das despesas contratadas que o candidato declarou na prestação de contas final ao TSE. O custo por voto é esse gasto dividido pelos votos que ele teve no 1º turno.",
      "Patrimônio é a soma dos bens que o candidato declarou ao registrar a candidatura. O link \"TSE ↗\" abre a página do candidato no DivulgaCandContas.",
    ],
    limite: "São valores declarados pelo próprio candidato. Bens costumam ser informados pelo valor de compra, não pelo valor de mercado.",
    links: [
      ["TSE — Prestação de contas 2024", "https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024"],
      ["TSE — Candidatos e bens 2024", "https://dadosabertos.tse.jus.br/dataset/candidatos-2024"],
      ["DivulgaCandContas", "https://divulgacandcontas.tse.jus.br/divulga/"],
    ],
  },
  {
    titulo: "Bairros do mapa",
    textos: [
      "Não existe um mapa oficial de bairros de Cotia em formato aberto: o OpenStreetMap não tem os bairros da cidade e o IBGE não divulga bairros para Cotia. Por isso as áreas são desenhadas por proximidade: cada ponto do município fica com o bairro cujo centro (a média das coordenadas dos seus locais de votação, segundo o cadastro do TSE) está mais perto, recortado pelo contorno do município do OpenStreetMap.",
    ],
    limite: "As fronteiras são aproximadas e não são os limites oficiais dos bairros.",
    links: [
      ["OpenStreetMap — contorno de Cotia", "https://www.openstreetmap.org/relation/298252"],
    ],
  },
  {
    titulo: "Renda (Censo 2022 do IBGE)",
    textos: [
      "Usamos o rendimento nominal médio mensal dos responsáveis pelos domicílios (variável V06004) de cada setor censitário de Cotia. Com \"Renda (Censo)\" ligado, cada setor é pintado pela sua própria renda e os bairros ficam só no contorno tracejado. A renda que aparece ao passar sobre um bairro é a média dos setores dentro dele, ponderada pelo número de domicílios.",
      "As cores separam três faixas em salários mínimos de 2022 (R$ 1.212): até 2,5 SM (R$ 3.030), de 2,5 a 5 SM e acima de 5 SM (R$ 6.060).",
    ],
    limite: "É a renda da pessoa responsável pelo domicílio, não a renda per capita nem a renda total da família. Os dados são de 2022, e a média de um bairro grande pode esconder setores muito diferentes.",
    links: [
      ["IBGE — Censo 2022, renda por setor", "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/"],
      ["IBGE — Malha de setores censitários", "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html"],
    ],
  },
  {
    titulo: "Contas do Município",
    textos: [
      "As despesas da Prefeitura e da Câmara de Cotia vêm do Portal da Transparência Municipal do Tribunal de Contas do Estado (TCE-SP), que recebe os dados enviados pela própria Prefeitura e pela Câmara. Pegamos todos os meses desde 2020; os valores pagos contam no mês do pagamento.",
    ],
    limite: "Os dados são atualizados todo dia 10. O TCE publica cada mês com cerca de seis semanas de atraso, então os meses mais recentes ainda não aparecem. O CPF de pessoas físicas não é mostrado.",
    links: [
      ["TCE-SP — Transparência Municipal", "https://transparencia.tce.sp.gov.br/"],
    ],
  },
  {
    titulo: "Viagens da Câmara",
    textos: [
      "Os relatórios de viagem de vereadores e servidores são PDFs publicados pela Câmara Municipal de Cotia, um por viagem. Lemos cada PDF automaticamente (com reconhecimento de texto nos escaneados) para tirar destino, período e valores.",
    ],
    limite: "A leitura automática pode errar em PDFs escaneados. Alguns arquivos de 2017 estão privados e não há relatórios publicados para 2020 e 2022.",
    links: [
      ["Câmara de Cotia — Relatório de viagens", "https://www.cotia.sp.leg.br/relatorio-de-viagens"],
    ],
  },
  {
    titulo: "Mapa e código",
    textos: [
      "O fundo do mapa é da Esri e do OpenStreetMap. Os scripts que baixam e montam cada arquivo estão no código aberto do site, no GitHub.",
    ],
    links: [
      ["Esri", "https://www.esri.com/"],
      ["OpenStreetMap", "https://www.openstreetmap.org/copyright"],
      ["Código do site (GitHub)", "https://github.com/alexjavabraz/mapaEleicoesCotia"],
    ],
  },
];

// QR Code do PIX do Alex: lido da foto que ele enviou e gerado de novo, limpo
// (mesmo conteúdo, conferido com um leitor). A chave não aparece em texto.
const PIX_QRCODE = urlSite("icons/pix-qrcode.png");

const ICONE_APOIO =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

const ICONE_INFO =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';

/** Cria um elemento com classe e texto (texto sempre por textContent). */
function fontesEl(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

function fontesLink(rotulo, url) {
  const a = fontesEl("a", null, t(rotulo));
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function montarModalFontes() {
  const dlg = document.createElement("dialog");
  dlg.id = "modal-fontes";
  dlg.className = "fontes-modal";
  dlg.setAttribute("aria-labelledby", "fontes-titulo");

  const head = fontesEl("div", "fontes-modal__head");
  head.appendChild(fontesEl("h2", null, t("De onde vêm os dados"))).id = "fontes-titulo";
  const fechar = fontesEl("button", "fontes-modal__fechar", "×");
  fechar.type = "button";
  fechar.setAttribute("aria-label", t("Fechar"));
  fechar.addEventListener("click", () => dlg.close());
  head.appendChild(fechar);
  dlg.appendChild(head);

  const corpo = fontesEl("div", "fontes-modal__corpo");
  corpo.appendChild(fontesEl("p", "fontes-intro",
    t("Todos os números do site vêm de dados públicos oficiais. Os arquivos são baixados por scripts automáticos e guardados no próprio site; ao abrir uma página nenhum dado é consultado em tempo real.")));
  // Página completa (metodologia.html), com fórmulas e avisos legais
  if (!document.body.classList.contains("metodologia-page")) {
    const completa = fontesEl("a", "fontes-completa", t("Metodologia completa e avisos legais →"));
    completa.href = urlSite("metodologia.html");
    corpo.appendChild(fontesEl("p")).appendChild(completa);
  }

  for (const s of FONTES_SECOES) {
    const sec = fontesEl("section", "fontes-secao");
    sec.appendChild(fontesEl("h3", null, t(s.titulo)));
    for (const p of s.textos) sec.appendChild(fontesEl("p", null, t(p)));
    if (s.limite) {
      const lim = fontesEl("p", "fontes-limite");
      lim.appendChild(fontesEl("strong", null, t("Limitação:")));
      lim.append(" " + t(s.limite));
      sec.appendChild(lim);
    }
    const links = fontesEl("ul", "fontes-links");
    links.setAttribute("aria-label", t("Fontes:"));
    for (const [rotulo, url] of s.links) {
      const li = fontesEl("li");
      li.appendChild(fontesLink(rotulo, url));
      links.appendChild(li);
    }
    sec.appendChild(links);
    corpo.appendChild(sec);
  }
  dlg.appendChild(corpo);

  // Clique no fundo escurecido (fora da caixa) fecha
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return dlg;
}

/** Cabeçalho comum dos modais do rodapé (título + botão Fechar). */
function cabecalhoModal(dlg, id, titulo) {
  const head = fontesEl("div", "fontes-modal__head");
  head.appendChild(fontesEl("h2", null, titulo)).id = id;
  const fechar = fontesEl("button", "fontes-modal__fechar", "×");
  fechar.type = "button";
  fechar.setAttribute("aria-label", t("Fechar"));
  fechar.addEventListener("click", () => dlg.close());
  head.appendChild(fechar);
  return head;
}

/** Modal "Apoie a iniciativa": texto curto e o QR Code do PIX (sem a chave em texto). */
function montarModalApoio() {
  const dlg = document.createElement("dialog");
  dlg.id = "modal-apoio";
  dlg.className = "fontes-modal apoio-modal";
  dlg.setAttribute("aria-labelledby", "apoio-titulo");
  dlg.appendChild(cabecalhoModal(dlg, "apoio-titulo", t("Apoie a iniciativa")));

  const corpo = fontesEl("div", "fontes-modal__corpo apoio-corpo");
  corpo.appendChild(fontesEl("p", null,
    t("Este site é feito de forma independente, sem patrocínio de partido ou candidato. Se ele é útil para você, considere apoiar com um PIX de qualquer valor: isso ajuda a manter os dados atualizados e a trazer novas informações de Cotia.")));
  const img = document.createElement("img");
  img.className = "apoio-qrcode";
  img.src = PIX_QRCODE;
  img.alt = t("QR Code do PIX para apoiar o projeto");
  img.width = 240;
  img.height = 240;
  img.loading = "lazy";
  corpo.appendChild(img);
  corpo.appendChild(fontesEl("p", "fontes-intro",
    t("No app do seu banco, escolha Pix → Pagar com QR Code e aponte a câmera para o código.")));
  corpo.appendChild(fontesEl("p", "apoio-obrigado", t("Obrigado pelo apoio!")));
  dlg.appendChild(corpo);

  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return dlg;
}

function montarRodape() {
  if (document.getElementById("rodape")) return;
  const footer = fontesEl("footer");
  footer.id = "rodape";

  const fontes = fontesEl("p", "rodape-fontes");
  fontes.appendChild(fontesEl("span", "rodape-rotulo", t("Dados públicos:")));
  fontes.append(" TSE · TCE-SP · IBGE · " + t("Câmara de Cotia"));
  footer.appendChild(fontes);

  const btn = fontesEl("button", "rodape-info");
  btn.type = "button";
  btn.setAttribute("aria-haspopup", "dialog");
  btn.innerHTML = ICONE_INFO;
  btn.setAttribute("aria-label", t("Fontes e metodologia"));
  btn.appendChild(fontesEl("span", "rotulo-longo", t("Fontes e metodologia")));
  btn.appendChild(fontesEl("span", "rotulo-curto", t("Fontes")));
  footer.appendChild(btn);

  // Links para "Sobre o projeto" (sobre.html) e "Metodologia"
  // (metodologia.html), menos na própria página
  const classes = document.body.classList;
  if (!classes.contains("sobre-page") || classes.contains("metodologia-page")) {
    // No celular o rótulo encurta (css/style.css, .rotulo-curto), como nos botões
    const sobre = fontesEl("a", "rodape-sobre");
    sobre.appendChild(fontesEl("span", "rotulo-longo", t("Sobre o projeto")));
    sobre.appendChild(fontesEl("span", "rotulo-curto", t("Sobre")));
    sobre.href = urlSite("index.html");
    footer.insertBefore(sobre, btn);
  }
  if (!classes.contains("metodologia-page")) {
    const metodologia = fontesEl("a", "rodape-sobre", t("Metodologia"));
    metodologia.href = urlSite("metodologia.html");
    footer.insertBefore(metodologia, btn);
  }

  const dlg = montarModalFontes();
  btn.addEventListener("click", () => {
    dlg.showModal();
    dlg.querySelector(".fontes-modal__corpo").scrollTop = 0;
  });
  // O <dialog> já devolve o foco ao fechar; isto cobre navegadores antigos
  dlg.addEventListener("close", () => btn.focus());

  const apoio = fontesEl("button", "rodape-info rodape-apoio");
  apoio.type = "button";
  apoio.setAttribute("aria-haspopup", "dialog");
  apoio.setAttribute("aria-label", t("Apoie a iniciativa"));
  apoio.innerHTML = ICONE_APOIO;
  apoio.appendChild(fontesEl("span", "rotulo-longo", t("Apoie a iniciativa")));
  apoio.appendChild(fontesEl("span", "rotulo-curto", t("Apoie")));
  footer.appendChild(apoio);
  const dlgApoio = montarModalApoio();
  apoio.addEventListener("click", () => dlgApoio.showModal());
  dlgApoio.addEventListener("close", () => apoio.focus());

  document.body.appendChild(footer);
  document.body.appendChild(dlg);
  document.body.appendChild(dlgApoio);
  document.body.classList.add("com-rodape");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", montarRodape);
} else {
  montarRodape();
}
