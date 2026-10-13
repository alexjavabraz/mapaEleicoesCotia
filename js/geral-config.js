/**
 * geral-config.js — Configuração das Eleições Gerais (Presidente, Governador,
 * Senador, Deputado Federal, Deputado Estadual) exibidas no seletor de ano.
 *
 * Diferente da eleição municipal (Prefeito/Vereador, arquivo tse_cotia_2024.json),
 * cada ano aqui aponta para seu próprio arquivo gerado por
 * scripts/download_tse_geral.py <ano>.
 */

const ELECTION_YEARS = {
  "2022": {
    label: "2022",
    dataFile: "./data/tse_cotia_2022.json",
    bairroFile: null,  // dados por bairro não disponíveis para 2022
    datasetUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2022",
  },
  "2026": {
    label: "2026 — 1º Turno",
    dataFile: "./data/tse_cotia_2026.json",
    bairroFile: "./data/cotia_votos_por_bairro_2026.json",
    datasetUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2026",
    aviso: "Dados do 1º turno (04/10/2026). O 2º turno ocorre em 25/10/2026.",
  },
};

// Ordem de exibição das abas de cargo. "turnos: true" = pode ter 2º turno
// (Presidente/Governador); os demais são decididos em turno único.
const CARGOS_GERAL = [
  { key: "presidente",   label: "Presidente",    turnos: true  },
  { key: "governador",   label: "Governador",    turnos: true  },
  { key: "senador",      label: "Senador",       turnos: false },
  { key: "dep_federal",  label: "Dep. Federal",  turnos: false },
  { key: "dep_estadual", label: "Dep. Estadual", turnos: false },
];
