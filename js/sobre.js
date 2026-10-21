/**
 * sobre.js — Página "Sobre o projeto" (sobre.html).
 *
 * Os textos ficam no HTML com data-i18n; aqui só o inglês (SOBRE_EN,
 * registrado no I18N_EN antes do applyI18n do DOMContentLoaded) e o botão
 * que abre o modal "Fontes e metodologia" do rodapé (js/fontes.js).
 */

const SOBRE_EN = {
  "Sobre o projeto — Cotia": "About the project — Cotia",
  "Sobre o projeto": "About the project",
  "Portal de transparência de dados cívicos": "Civic data transparency portal",
  "Cotia em dados públicos, no mapa": "Cotia's public data, on the map",
  "Resultados eleitorais por bairro e por escola, gastos de campanha e as contas da Prefeitura e da Câmara, reunidos em mapas e tabelas a partir de dados públicos oficiais.":
    "Election results by neighborhood and by school, campaign spending and the accounts of City Hall and the City Council, brought together in maps and tables from official public data.",
  "Ver Eleições 2026": "See 2026 Elections",
  "Conhecer o portal": "Explore the portal",
  "Destaques": "Highlights",
  "áreas: eleições municipais, eleições gerais e contas públicas":
    "areas: municipal elections, general elections and public accounts",
  "dos números vêm de fontes oficiais (TSE, TCE-SP, IBGE, Câmara)":
    "of the numbers come from official sources (TSE, TCE-SP, IBGE, City Council)",
  "Aberto": "Open",
  "código e dados publicados no GitHub, para qualquer pessoa conferir":
    "code and data published on GitHub, for anyone to check",

  "O projeto": "The project",
  "Os dados públicos de Cotia existem, mas estão espalhados em arquivos enormes, planilhas e PDFs de órgãos diferentes. Este portal baixa esses arquivos, organiza e mostra o que eles dizem sobre a cidade, bairro por bairro.":
    "Cotia's public data exists, but it is scattered across huge files, spreadsheets and PDFs from different agencies. This portal downloads those files, organizes them and shows what they say about the city, neighborhood by neighborhood.",
  "A ideia é simples: qualquer morador deve conseguir ver como Cotia votou, quanto custou cada campanha e para onde vai o dinheiro do município, sem precisar saber programar nem cruzar tabelas.":
    "The idea is simple: any resident should be able to see how Cotia voted, how much each campaign cost and where the city's money goes, without having to code or cross-reference tables.",

  "O que você encontra": "What you will find",
  "Prefeito e vereadores: votos por bairro, por escola e por seção, com gasto de campanha, custo por voto e patrimônio declarado de cada candidato.":
    "Mayor and City Council: votes by neighborhood, school and polling section, with each candidate's campaign spending, cost per vote and declared assets.",
  "Presidente, Governador, Senador e Deputados: quem venceu em cada bairro de Cotia, comparado com 2022 e com a renda do Censo do IBGE.":
    "President, Governor, Senator and Representatives: who won in each Cotia neighborhood, compared with 2022 and with IBGE Census income.",
  "Pagamentos da Prefeitura desde 2020 por ano e por fornecedor, segundo o TCE-SP, e as viagens dos vereadores pagas pela Câmara.":
    "City Hall payments since 2020 by year and by supplier, according to TCE-SP, and council members' trips paid by the City Council.",
  "Abrir o mapa →": "Open the map →",
  "Ver as contas →": "See the accounts →",

  "Como trabalhamos": "How we work",
  "Só dados oficiais": "Official data only",
  "Cada número tem uma fonte pública: Tribunal Superior Eleitoral, Tribunal de Contas do Estado, IBGE e a própria Câmara de Cotia.":
    "Every number has a public source: the Superior Electoral Court, the State Audit Court, IBGE and the Cotia City Council itself.",
  "Metodologia à vista": "Methodology in plain sight",
  "O que foi somado, estimado ou aproximado está explicado, com as limitações de cada base.":
    "What was added up, estimated or approximated is explained, along with the limitations of each dataset.",
  "Atualização automática": "Automatic updates",
  "Scripts baixam os arquivos novos das fontes e publicam no site, sem digitação manual.":
    "Scripts download new files from the sources and publish them on the site, with no manual typing.",
  "Apartidário": "Nonpartisan",
  "O portal mostra resultados e gastos de todos os candidatos e partidos do mesmo jeito.":
    "The portal shows results and spending for every candidate and party the same way.",
  "Ver fontes e metodologia": "See sources and methodology",

  "Idealização e desenvolvimento": "Conception and development",
  "Engenheiro de Software há mais de 20 anos, Arquiteto Blockchain, Membro do grupo de trabalho técnico de Desenvolvimento do PIX. Especialista em Blockchain e membro do comitê ISO para assuntos relacionados ao tema.":
    "Software Engineer for over 20 years, Blockchain Architect, member of the technical working group for PIX development. Blockchain specialist and member of the ISO committee on matters related to the subject.",
  "Palestrante e instrutor de Blockchain e smart contracts, com passagens por empresas de Blockchain como NEM e Rootstock. Um dos pioneiros da tecnologia no Brasil.":
    "Speaker and instructor on Blockchain and smart contracts, with experience at Blockchain companies such as NEM and Rootstock. One of the pioneers of the technology in Brazil.",

  "Na imprensa": "In the press",
  "março de 2023": "March 2023",
  "entre os 50 profissionais de TI para seguir": "among the 50 IT professionals to follow",
  "12 de maio de 2014": "May 12, 2014",
  "o app Guia da Granja Viana, criado por ele": "the Guia da Granja Viana app he created",

  "Código aberto": "Open source",
  "Todo o código e os dados do portal estão no GitHub. Encontrou um erro ou tem uma sugestão? Abra uma issue no repositório.":
    "All of the portal's code and data are on GitHub. Found a mistake or have a suggestion? Open an issue in the repository.",
  "Ver no GitHub ↗": "View on GitHub ↗",
};

if (typeof I18N_EN === "object") Object.assign(I18N_EN, SOBRE_EN);

function initSobre() {
  const btn = document.getElementById("sobre-abrir-fontes");
  if (btn) {
    btn.addEventListener("click", () => {
      const rodape = document.querySelector("#rodape .rodape-info");
      if (rodape) rodape.click();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSobre);
} else {
  initSobre();
}
