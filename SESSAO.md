# Sessão — 2026-10-20 (7) · Tema claro/escuro e tabelas em cartões

**Status:** iniciada 2026-10-20 02:50 UTC · finalizada 2026-10-20 22:20 UTC
(branch `claude/contas-tema-g60600`, aprovado pelo Alex e enviado direto
para o `main`, sem PR, conforme a nova regra).

## Pedido

Tema claro/escuro (variáveis CSS em `:root` + `[data-theme="dark"]`, botão
Alternar tema no header, preferência no `localStorage`) em todas as páginas,
e tabelas financeiras responsivas (card view abaixo de 768px, `data-label`
em cada `<td>`) só nas Contas Municipais. Exemplo em arquivo único.

## O que foi feito

- `css/style.css`: `:root` = tema claro, `[data-theme="dark"]` = o visual
  escuro original. Sobreposições brancas viraram `rgba(var(--tinta), a)` e
  painéis sobre o mapa `rgba(var(--painel-rgb), a)`; sombras escalam com
  `--sombra-k`. Utilitários `.valor-positivo` / `.valor-negativo`.
- `js/tema.js` (todas as páginas, no `<head>`): escolhe o tema (salvo →
  sistema → claro) antes do primeiro desenho, cria o botão ☀️/🌙 ao lado do
  PT/EN, atualiza `theme-color`, recolore gráficos do Chart.js e dispara
  `temachange`. O mapa troca entre os tiles Escuro/Claro junto com o tema
  (se a pessoa escolheu OSM ou Satélite, fica como está).
- Contas: `rotularTabela()` em `js/contas.js` põe `data-label` e papéis ARIA
  em todas as tabelas (inclusive as redesenhadas, via MutationObserver);
  `css/contas.css` transforma linhas em cartões no celular.
- Exemplo isolado: `/mnt/project-files/contas-tema/tema-tabela-responsiva.html`;
  prévias em `/mnt/project-files/contas-tema/previews/`.
- Loading animado e analítico por fornecedor (PR #9) ajustados aos dois
  temas (verde do ✓ usa `--positivo`, bordas usam `--tinta`).
- Partes novas do main (legenda de renda do Censo, custo por voto, tooltips)
  ajustadas aos dois temas: legenda usa `--painel-rgb`/`--tinta`, bordas
  dos tooltips usam `--tinta`, o amarelo de votos virou `--amarelo`
  (âmbar escuro no claro). Os rótulos de votos por escola no mapa ficam
  sempre escuros.
- `sw.js` → v28 (cacheia `js/tema.js`).

---

# Sessão — 2026-10-20 (4) · Cache do mapa 2024

**Status:** iniciada 2026-10-20 17:25 UTC · finalizada 2026-10-20 17:50 UTC
(branch `claude/cache-mapa-2024-171431`, sobre `main`, label `agentic`).

## Pedido

O mapa da aba Eleições 2024 demora muito para carregar: cachear os arquivos
usados no processamento das eleições 2024.

## Diagnóstico

Os JSON do TSE de 2024 somam ~160 KB comprimidos (o GitHub Pages serve com
gzip) e carregam em menos de 1 s. O que travava eram duas consultas POST à
Overpass API (contorno e bairros), feitas em sequência a cada visita, sem
cache possível (POST) e que demoram de dezenas de segundos a minutos ou falham
(timeout de 90 s), caindo no Voronoi dos locais de votação.

## O que foi feito

- `scripts/download_bairros_osm.py` + workflow `bairros-osm.yml` (push no
  branch, manual e todo dia 1º): grava a resposta da Overpass em
  `data/osm_bairros_cotia.json` (JSON OSM bruto; a página segue convertendo com
  osmtogeojson, então o mapa mostra o mesmo que a consulta ao vivo).
- `js/map.js`: `fetchCotiaMunicipio` lê `data/cotia_municipio.geojson` primeiro
  e `fetchCotiaBairros` lê `data/osm_bairros_cotia.json` primeiro; a Overpass
  vira fallback com limite de 15 s. Vale também para a página de 2026.
- `js/app.js`: contorno e bairros começam a baixar junto com os dados do TSE,
  e `tse_cotia_2024.json` baixa em paralelo com bairros/locais.
- `sw.js` → v27 (main já estava em v26): os dados do mapa 2024 (inclui gastos de campanha e renda do Censo) são pré-carregados no install e
  servidos do cache na hora (stale-while-revalidate).
- Teste local (Playwright, Overpass bloqueada): mapa pronto em ~0,7 s, 59
  bairros por Voronoi, sem erros.
- O 1º run do workflow mostrou que a Overpass responde à query de bairros com
  lista vazia (ou cai): o site ao vivo sempre acabava no Voronoi depois de
  esperar. Lista vazia agora é salva como resposta válida e a página vai
  direto para o Voronoi.
- Branch atualizado com o `main` (custo por voto e renda do Censo): os
  loaders novos seguem no mesmo `Promise.all`.

---

# Sessão — 2026-10-20 (6) · Renda do Censo nos bairros (mapa 2024)

**Status:** iniciada 2026-10-20 17:20 UTC · finalizada 2026-10-20 17:40 UTC
(branch `claude/project-thread-20twi4`; a pedido do Alex entrou direto no `main`,
PR #12 fechado).

## Pedido

Com os dados do Censo IBGE, criar 3 faixas de renda, pintar os bairros pela
faixa e adicionar uma legenda no mapa, só na aba Eleições 2024 (`index.html`).
Plano em `/mnt/project-files/plano-censo/plano-renda-censo.md`.

## O que foi feito

- `scripts/download_censo.py` + `.github/workflows/censo.yml` (roda no Actions;
  o IBGE é bloqueado no sandbox). A renda por setor de 2022 saiu à parte, em
  `Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/` (maio/2026):
  `V06004` = rendimento nominal médio mensal dos responsáveis com rendimento,
  peso `V06001` = responsáveis (≈ domicílios). Malha `SP_setores_CD2022.gpkg`.
  Se a renda 2022 sumir, o script cai para o Censo 2010 (`V005`/`V001`).
- `data/censo_renda_setores.json` (29 KB): 720 setores de Cotia com ponto,
  renda e domicílios, mais um resumo por bairro do TSE (setor → local de
  votação mais próximo). Renda média de Cotia: R$ 4.087.
- 3 faixas: até 2,5 SM (R$ 3.030), 2,5 a 5 SM, acima de 5 SM (R$ 6.060);
  bairros do TSE ficam 24 / 27 / 7. Com 2 e 5 SM seriam 8 / 43 / 7.
- `js/renda.js`: botão "Renda (Censo)" nos botões do mapa, cor por faixa em
  cada polígono (média dos setores dentro dele, ponderada; serve para OSM ou
  Voronoi), legenda no canto inferior direito, linha de renda no tooltip.
  `getFeatureStyle` (map.js) usa o estilo de renda quando ligado, então Limpar
  e o destaque de vereador mantêm as cores. Só `index.html` carrega o arquivo.
- i18n (PT/EN), css, `sw.js` → v26 (o PR #11 usa v25).

---

# Sessão — 2026-10-20 (5) · Custo por voto em 2024

**Status:** iniciada 2026-10-20 17:13 UTC · finalizada 2026-10-20 17:40 UTC
(branch `claude/custo-por-voto-2024-2riugw`, PR #10 fechado; entrou direto no
`main` a pedido do Alex).

## Pedido

Obter os gastos de campanha de cada vereador e candidato a prefeito de 2024 no
TSE, dividir pelo total de votos e mostrar o custo/voto embaixo do nome do
candidato, com ou sem escola selecionada. Gerar um arquivo com isso e consultar
o arquivo.

## O que foi feito

- `scripts/download_gastos_campanha.py`: baixa
  `prestacao_de_contas_eleitorais_candidatos_2024.zip` (TSE Dados Abertos),
  filtra Cotia/SP, prefeito e vereador, e soma as despesas contratadas da
  prestação final mais recente de cada candidato (também as despesas pagas).
  Custo/voto = despesas contratadas ÷ votos nominais do 1º turno
  (`data/tse_cotia_2024.json`). `GASTOS_ZIP` aceita um zip já baixado.
- O CDN do TSE é bloqueado na rede da sessão, então o download roda no
  workflow `.github/workflows/gastos-campanha.yml` (manual ou push no branch),
  que comita `data/gastos_campanha_2024.json` (308 candidatos, todos com
  prestação de contas; 176, nenhum eleito, declararam R$ 0 de despesas
  contratadas e aparecem como "sem gastos declarados").
- `js/tse.js`: `loadGastosCampanha()` e `htmlCustoVoto()`; o card do candidato
  mostra "Custo/voto: R$ x" embaixo do nome (tooltip com gasto ÷ votos). O
  valor é sempre o da cidade inteira, com ou sem escola/bairro selecionado. Só
  a página 2024 carrega o arquivo; 2026 não muda.
- Textos em `js/i18n.js`, estilo `.candidate-custo` em `css/style.css`,
  `sw.js` → v24 (outros branches usam v21–v23) e o JSON novo no cache de dados.

---

# Sessão — 2026-10-20 (4) · Bandeira de Cotia no header

**Status:** iniciada 2026-10-20 16:47 UTC · finalizada 2026-10-20 17:25 UTC
(commit direto no `main`, a pedido do Alex).

- Bandeira (`icons/cotia-flag.svg`, 28 px) ao lado do nome "Cotia" no header
  das três páginas. No celular o nome some e a bandeira fica, ao lado das abas
  curtas. `sw.js` → v22 (o branch do tema já usa v21).

---

# Sessão — 2026-10-20 (3) · Loading animado nas Contas

**Status:** iniciada 2026-10-20 03:05 UTC · finalizada 2026-10-20 03:25 UTC
(branch `claude/project-thread-4vl91m`, sobre `claude/abas-header-tlksjp`, label `agentic`).

## Pedido

Loading com animação explicando que os dados do Tribunal de Contas estão sendo
baixados, mostrando as consultas (2020 semestre 1, 2020 semestre 2, …),
processamento, cálculo, interpretação, modelos estatísticos e "Tudo pronto".

## O que foi feito

- `contas.html` / `css/contas.css`: o spinner virou um cartão com folhas
  animadas, título "Baixando os dados do Tribunal de Contas", barra de
  progresso e uma lista de etapas que rola (✓ nas concluídas, spinner na atual).
- `js/contas.js`: `animarCarga()` narra Conectando ao TCE-SP → Consultando
  2020 semestre 1 … semestre atual → Processando → Calculando → Interpretando →
  Aplicando modelos estatísticos; `concluirCarga()` mostra "Tudo pronto!" e
  some com fade. O fetch do JSON corre em paralelo; "Processando" só avança
  depois que ele termina. Como os dados vêm num arquivo só, as consultas por
  semestre são narrativas (~4 s no total).
- Leitor de tela: só a etapa atual é anunciada (`role="status"`); respeita
  `prefers-reduced-motion`. Textos traduzidos em `js/i18n.js`.
- `sw.js` → v17.
- Pedido seguinte: no gráfico "Valor pago por ano" da aba Por fornecedor, a
  barra selecionada (clique/toque) mantém a legenda aberta, sem depender de
  hover (plugin `legendaFixa` em `renderGraficoAno`). `sw.js` → v18.
- Pedido seguinte: analítico dos totais do fornecedor. `download_contas.py`
  grava `data/contas_fornecedores/{índice}.json` com todos os lançamentos de
  cada fornecedor (2.391 arquivos, ~19 MB; a página baixa só o do fornecedor
  aberto) e aceita `CONTAS_CACHE` para reaproveitar as respostas da API. No
  cartão do fornecedor os totais (Pago, Liquidado…) são do ano filtrado e viram
  botões; abaixo, o analítico lista os lançamentos que somam aquele total
  (ordem por valor ou data, "Mostrar mais", linha de total). O Top 10 do
  fornecedor também passa a sair do analítico, valendo com ano filtrado.
  Workflow `contas.yml` comita a pasta nova. `sw.js` → v19.
- Pedido seguinte: mesmo header nas três páginas. As abas Eleições 2024 /
  Eleições 2026 / Contas Municipais já estavam no index e no eleicao-geral
  (PR #8); o título passou a ser "Cotia" nas três, igual a Contas. `sw.js` → v20.

---

# Sessão — 2026-10-20 (2) · Abas segmentadas no header e nas Contas

**Status:** iniciada 2026-10-20 02:45 UTC · finalizada 2026-10-20 03:15 UTC
(branch `claude/abas-header-tlksjp`, label `agentic`).

## Pedido

Abas mais visuais no header (Eleições 2024 / Eleições 2026 / Contas
Municipais) no estilo "Controle Segmentado", acessíveis (tablist/tab/tabpanel,
aria-selected, setas do teclado), com um exemplo em arquivo único; dentro de
Contas, abas para os pagamentos e para os valores pagos em viagens.

## O que foi feito

- `css/abas.css` + `js/abas.js`: controle segmentado (contêiner com fundo
  suave, aba ativa branca com texto indigo e sombra sutil, transição 0.2s,
  anel de foco por dentro). O estado visual sai dos atributos ARIA
  (`aria-selected` / `aria-current`). Setas ←/→ e Home/End movem o foco;
  Enter/Espaço ativam.
- Header das três páginas: "Eleições 2024 / Eleições 2026 / Contas
  Municipais" no lugar dos links soltos e dos badges. São links entre páginas
  (`<nav>` + `aria-current="page"`), não `role="tab"`, porque trocam de página.
  No celular o título some e os rótulos ficam curtos (2024 / 2026 / Contas).
- `contas.html`: abas Pagamentos | Viagens da Câmara; dentro de Pagamentos,
  Visão geral | Por fornecedor. URLs `#geral`, `#fornecedor`, `#viagens`
  continuam valendo; o clique em Pagamentos volta à última sub-aba. Painéis
  com `hidden` + `aria-hidden`.
- Exemplo isolado (arquivo único) em
  `/mnt/project-files/abas-header/abas-segmentadas.html` (fora do repo).
- `sw.js` → v16 (cacheia `css/abas.css` e `js/abas.js`).

---

# Sessão — 2026-10-20 (1) · Contas em três abas

**Status:** iniciada 2026-10-20 02:20 UTC · finalizada 2026-10-20 02:45 UTC
(branch `claude/contas-municipio-cak3b6`, label `agentic`).

## Pedido

"Aba inicial com dados fixos sem filtro do jeito que está hoje, aba onde se
pode selecionar o fornecedor e os dados são atualizados e aba de gastos com
viagens." Na aba de fornecedor, tirar o gráfico "Evolução dos pagamentos por
ano" e deixar só "Valor pago por ano — {fornecedor}".

## O que foi feito

- `contas.html` em três abas (`#geral`, `#fornecedor`, `#viagens` na URL; o
  botão Voltar do navegador troca de aba, setas ←/→ também):
  - **Visão geral** (inicial): valor pago de 2020 até o último mês, sem
    filtros: KPIs, evolução anual + top 10 de cada ano, por ano, por mês,
    maiores recebedores e por órgão. Clicar num recebedor abre a aba Por
    fornecedor com ele selecionado.
  - **Por fornecedor**: filtros (evento, ano, busca), Top 10, cartão do
    fornecedor, KPIs, só o gráfico "Valor pago por ano — {fornecedor}" e a
    tabela agrupada por recebedor. Com busca sem seleção, o gráfico soma os
    fornecedores encontrados.
  - **Viagens da Câmara**: a seção de viagens como estava.
- `js/contas.js`: funções de render recebem o estado (fixo ou filtrado);
  `js/viagens.js` mostra aviso se os dados não carregarem. `setLang()` em
  `js/i18n.js` recarrega a página quando a URL tem #aba (antes o botão PT/EN
  não fazia nada depois de trocar de aba). `sw.js` → v15.

---

# Sessão — 2026-10-19 (4) · Português como idioma padrão

**Status:** iniciada 2026-10-19 19:55 UTC · finalizada 2026-10-19 20:05 UTC
(branch `claude/i18n-english-tm8c3p`, label `agentic`).

## Pedido

"Garanta que o PT é o padrão de idioma."

## O que foi feito

- `js/i18n.js`: `idiomaDoNavegador()` só devolve inglês quando o navegador
  declara idiomas válidos e **nenhum** deles é português. Antes bastava o
  primeiro idioma não ser `pt` (ex.: `en-US, pt-BR` abria em inglês; agora
  abre em PT). Navegador sem idioma, com valor vazio ou estranho (`*`) → PT.
- Chave `INGLES_AUTOMATICO` no topo do arquivo: `false` faz o site abrir
  sempre em PT, com o inglês só pelo botão EN.
- O HTML continua `lang="pt-BR"` e com o texto em português (sem JS = PT).
- `sw.js` → v13.

---

# Sessão — 2026-10-19 (5) · Votos por escola no mapa 2024

**Status:** iniciada 2026-10-19 19:05 UTC · finalizada 2026-10-19 19:20 UTC (PR #5, label `agentic`).

## Pedido

No mapa de votos de 2024: botão "Limpar", botão "Votos por seção" e, ao
clicar numa escola (local de votação), os votos totalizados daquela escola,
para prefeito e para vereador.

## O que foi feito

- Clique numa escola: votos somados das seções dela, abas Prefeito/Vereadores
  (mesmos cards, ordenação e busca de vereador), escola destacada no mapa.
- Botões no canto superior esquerdo do mapa: "Votos por seção" (rótulo com o
  total de votos de cada escola, marcador na cor do vencedor para prefeito, ou
  votos do vereador filtrado) e "Limpar" (tira seleção, filtro, destaques,
  ranking e o modo; volta ao total geral e ao zoom inicial).
- `scripts/download_secoes.py` grava `data/cotia_votos_por_escola_detalhe.json`
  ({candidatos: {cargo: {nr: nome}}, escolas: {zona_nr: {cargo: {nr: votos}}}},
  ~145 kB, só 1º turno). Conferido: soma por candidato = totais do TSE (6
  prefeitos, 302 vereadores) e soma de prefeito por escola = escola.json.
- `.github/workflows/secoes.yml` roda o script (manual / push do script na
  branch) e commita só o detalhe. `sw.js` → v12. Textos novos via `t()` (PR #3).
- Badge de partido vazio ("??") some para brancos/nulos.
- Merge da main (PRs #3 e #4) em 2026-10-19 19:30 UTC: textos novos movidos
  para `I18N_EN` em `js/i18n.js` e chamados com `t()`; `sw.js` fica em v12.

## Armadilhas

- O CDN do TSE (`cdn.tse.jus.br`) é bloqueado na sessão cloud; o download
  (~475 MB) leva ~1 min no Actions.
- `votacao_secao` não tem QT_APTOS/QT_COMPARECIMENTO (estão em
  `detalhe_votacao_secao`); a abstenção da escola segue estimada por
  eleitores registrados × votos para prefeito.

---

# Sessão — 2026-10-19 (3) · Viagens da Câmara

**Status:** iniciada 2026-10-19 18:14 UTC · finalizada 2026-10-19 18:45 UTC (PR #4, label `agentic`).

## Pedido

Analisar os relatórios de viagens da Câmara
(https://www.cotia.sp.leg.br/relatorio-de-viagens) e adicionar os dados por
vereador e por ano na página de contas.

## O que foi feito

- A página da Câmara não tem uma tabela: é uma lista de links (Google Drive /
  Docs), um PDF por viagem, identificado pelo Ato da Mesa (vereadores) ou
  Portaria (servidores). O formulário é sempre o mesmo: período, nome,
  destino, motivo, passagens, hospedagem e observação sobre o adiantamento.
- `scripts/download_viagens.py` baixa os PDFs, extrai os campos (OCR com
  tesseract para os escaneados de 2018–2019), normaliza nomes e calcula o
  custo = passagens + hospedagem + adiantamento efetivamente gasto (lido da
  observação). Grava `data/viagens_camara.json`. Roda no workflow mensal das
  contas.
- `js/viagens.js` + seção "Viagens da Câmara" em `contas.html`: filtros de ano
  e de quem viajou (vereadores/servidores), KPIs, gráfico por ano, maiores
  gastos, tabela pessoa × ano e detalhe das viagens com link para o PDF.
  Textos passam por `t()` e registram as traduções EN quando `js/i18n.js`
  (PR #3) estiver na página.
- `sw.js` → v11.

## Armadilhas

- `cotia.sp.leg.br` também é bloqueado na sessão cloud: tudo roda no Actions.
- 11 PDFs de 2017 (links antigos `drive.google.com/open?id=0B…`) são
  privados e não podem ser baixados; ficam listados em `meta.nao_lidos`.
- Não há relatórios para 2020 e 2022 na página da Câmara.
- Valores lidos por OCR (14 relatórios) ficam marcados na página.

---

# Sessão — 2026-10-19 (3) · Versão em inglês (i18n)

**Status:** iniciada 2026-10-19 18:10 UTC · finalizada 2026-10-19 18:50 UTC
(branch `claude/i18n-english-tm8c3p`, label `agentic`).

## Pedido

Apresentar o mapa em inglês quando o navegador do usuário não estiver em
português.

## O que foi feito

- `js/i18n.js` (carregado no `<head>` das 3 páginas): idioma = escolha salva
  no botão PT/EN (`localStorage["lang"]`) ou, sem escolha, inglês quando
  `navigator.languages[0]` não começa com `pt`. `t("texto PT", {vars})`
  traduz pelo próprio texto em português (dicionário `I18N_EN`); HTML
  estático usa `data-i18n` / `data-i18n-placeholder` / `data-i18n-aria-label`.
- Todos os textos de `app.js`, `map.js`, `tse.js`, `geral.js`,
  `geral-config.js` e `contas.js` passam por `t()`. Números/moeda usam
  `LOCALE` (en-US no inglês: R$1,234.56); datas em mm/dd/aaaa no inglês.
- Traduzidos também rótulos que vêm dos dados mas são categorias: situação
  (ELEITO → ELECTED, 2º TURNO → RUNOFF…), VOTO NULO/BRANCO e os eventos da
  despesa (Pago → Paid, Liquidado → Accrued, Empenhado → Committed).
  Nomes de candidatos, bairros, fornecedores e órgãos ficam como estão.
- Botão PT/EN no canto do header (recarrega a página; se o localStorage
  estiver bloqueado, a escolha vai na URL como `?lang=en`). `sw.js` → v11.

## Armadilhas

- Texto novo na interface: escreva `t("…")` e adicione a chave em `I18N_EN`,
  senão aparece em português no modo inglês.
- Para testar o inglês no navegador em PT: clique em "EN" no header.

---

# Sessão — 2026-10-19 (2) · Evolução anual dos pagamentos

**Status:** iniciada 2026-10-19 17:22 UTC · finalizada 2026-10-19 17:35 UTC (PR #2, label `agentic`).

## Pedido

Gráfico de evolução dos pagamentos por ano (2020 até hoje), para ver quanto a
Prefeitura vem gastando ano a ano, e um top 10 dos pagamentos de cada ano.

## O que foi feito

- Nova seção "Evolução dos pagamentos por ano" em `contas.html`: gráfico de
  barras do valor pago por ano (2020 até o último mês publicado), com seletor
  de órgão (padrão: Prefeitura), resumo com a variação 2020 → último ano
  completo e do ano corrente contra o mesmo período do ano anterior; tooltip
  com a variação ano a ano. Ano parcial marcado com `*`.
- "Top 10 pagamentos do ano": botões por ano (ou clique na barra), tabela com
  recebedor, órgão, mês, empenho, valor e % do total do ano.
- Script: `por_orgao_mes` no JSON; maiores lançamentos guardados por
  (evento, ano, órgão); ano do lançamento = mês consultado na API (competência
  do pagamento), não a data de emissão do empenho.
- `sw.js` → v10.

---

# Sessão — 2026-10-19 · Contas do Município

**Status:** iniciada 2026-10-19 16:56 UTC · finalizada 2026-10-19 17:15 UTC.
PR #1 (rascunho, label `agentic`), branch `claude/contas-municipio-cak3b6`.

## Pedido

Nova aba com as despesas de Cotia da API do TCE-SP
(`transparencia.tce.sp.gov.br/api/json/despesas/cotia/{ano}/{mes}`), de 2020
até o último mês publicado: filtro por fornecedor, botão "Top 10 valores
pagos", gráficos por ano e agrupamento por recebedor.

## O que foi feito

- `contas.html` + `js/contas.js` + `css/contas.css`: busca por fornecedor
  (nome/CNPJ, autocomplete), filtros de evento e ano, KPIs, gráficos (por
  ano, por mês, maiores recebedores, por órgão) com Chart.js 4.4.1 (cdnjs),
  tabela agrupada por recebedor (ordenável, paginada) e modal Top 10
  (maiores pagamentos individuais / maiores recebedores). Links no header
  de `index.html` e `eleicao-geral.html`.
- `scripts/download_contas.py`: baixa mês a mês e grava só o agregado em
  `data/contas_cotia.json` (~239 mil registros → ~2,2 MB). CPF de pessoa
  física não é publicado.
- `.github/workflows/contas.yml`: roda o script no GitHub Actions (dia 10 de
  cada mês, manual, e a cada push do script na branch) e commita o JSON.
- `sw.js` → v9, com os novos assets.

## Armadilhas

- A sessão cloud do Claude não alcança `transparencia.tce.sp.gov.br` nem as
  CDNs (proxy bloqueia) — por isso o download roda no Actions.
- A API devolve eventos "Empenhado", "Valor Liquidado", "Valor Pago",
  "Anulação", "Reforço"; o script renomeia para Pago/Liquidado.
- O TCE publica com ~6 semanas de atraso (em 19/10/2026 o último mês era
  ago/2026); mês sem dado volta `[]`.

---

# Sessão — 2026-10-13

Resumo das tarefas realizadas nesta sessão, para referência futura.

## 1. Fundo do mapa sem máscara branca (bug intermitente)

**Sintoma:** às vezes o mapa carregava mostrando a região metropolitana
inteira (Barueri, Carapicuíba, Taboão da Serra...) em vez de só Cotia com
fundo branco ao redor. Sumia depois de 1-2 refreshes.

**Causa raiz:** `fetchCotiaMunicipio()` (js/map.js) busca o contorno do
município na Overpass API (overpass-api.de), que é instável (504/timeout
confirmados em produção). Quando falhava, a função retornava `null` sem
fallback, e tanto a máscara (`renderMascaraExterna`) quanto o marcador de
geolocalização (`localizarUsuario`) ficavam dentro do mesmo
`if (municipioGeoJSON)` — por isso os dois sumiam juntos (é por isso que a
máscara só funcionava quando o prompt de permissão de localização aparecia:
os dois dependem do mesmo fetch ter funcionado).

**Correção:**
- `data/cotia_municipio.geojson` — contorno de Cotia (relation OSM 298252,
  admin_level=8, mesmo filtro da query Overpass) salvo localmente.
- `fetchCotiaMunicipio()` cai automaticamente para esse arquivo quando a
  Overpass falha ou retorna vazio.
- Adicionado ao cache do Service Worker.

## 2. Bug `renderCargoSection is not defined`

Página de Eleições Gerais: clicar em qualquer bairro/zona disparava um
`ReferenceError` silencioso (função nunca existia, só `renderCargoSectionGeral`).
Corrigido renomeando as 3 chamadas quebradas.

## 3. Bug do nome de urna vs. nome completo

O TSE usa datasets diferentes para totais (nome de urna, ex: "LULA") e para
votação por seção/bairro (nome completo, ex: "LUIZ INÁCIO LULA DA SILVA").
Isso quebrava silenciosamente:
- o combobox "ver votos por bairro de um candidato" (não achava os votos)
- o partido exibido no card do bairro (aparecia "??")
- a coloração do mapa por vencedor (quase tudo caía em "outro partido")
- o tooltip do bairro (partido do vencedor sumia)

**Correção:** `buildNomeMappingGeral()` (js/geral.js) constrói, para cada
cargo, o mapeamento urna↔completo (soma de votos por nome completo +
desambiguação por interseção de palavras — estratégia testada contra os
dados reais de 2026, mapeou 12/12 presidente, 5/5 governador, 13/13 senador).
`resolveNomeFullGeral()` é usado em todos os pontos de lookup afetados.

## 4. Feature: combobox "ver votos por bairro de um candidato"

Adicionado na página de Eleições Gerais, para os 5 cargos (antes só existia
para Vereador na página municipal). Colore o mapa por intensidade de votos
e mostra ranking de bairros — reaproveita `renderRankingBoxItens` (extraído
de `renderRankingBox` em js/map.js para ser genérico).

## 5. Feature: coloração do mapa pelos 3 primeiros colocados

Antes: coloria só por partido vencedor (PT vermelho / PL azul / tudo o
resto cinza) — difícil de ler, e estava quebrado pelo bug #3 (quase tudo
caía em cinza).

Agora: pinta cada bairro com a cor de quem, ENTRE OS 3 MAIS VOTADOS DO
CARGO (município inteiro), teve mais votos ali. Legenda nova no canto
inferior esquerdo (mesmo lugar onde antes ficava a legenda de zonas
eleitorais, que não se aplica a essa página).

**Cores por identidade, não por posição no ranking:** Lula sempre vermelho,
Flávio Bolsonaro sempre azul (hardcoded por pedido explícito — ver
`CORES_HARDCODED` em js/geral.js — mais os demais via `CORES_CANDIDATO_PADRAO`
com correspondência por nome). Quem não tem cor conhecida (Senador, Dep.
Federal/Estadual) cai num fallback determinístico por posição, sem repetir
cor com quem já tem identidade própria no top-3 (`getCoresTop3`).

## Armadilha recorrente: cache do Service Worker

Toda alteração em `js/map.js`, `js/geral.js`, `js/app.js` ou `css/style.css`
exige bump de `CACHE_NAME`/`DATA_CACHE` em `sw.js` (atualmente v8) — sem
isso, quem já visitou o site antes continua vendo a versão antiga por
cache-first, mesmo depois do deploy. Para testar uma mudança nova sem
lutar com isso: usar aba anônima/privada (sem Service Worker instalado).

## Commits desta sessão

- `bb1d5cf` fix: contorno de Cotia com fallback local + coloração por top-3 candidatos
- `25d7a7b` fix: cores do top-3 por identidade do candidato, não por posição
- `e3224d3` fix: hardcode cor de Lula (vermelho) e Flávio Bolsonaro (azul)
