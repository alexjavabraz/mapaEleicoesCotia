# Sessão — 2026-10-27 (3) · Mapa 2026: caixa "Votos por bairro" só com candidato escolhido

**Status:** iniciada 2026-10-27 19:13 UTC · finalizada 2026-10-27 19:20 UTC
(commit direto no `main`).

Alex não lembrava para que servia a caixa "Votos por bairro" que aparecia com
"Nenhum candidato selecionado" ao trocar de turno/cargo. Ela é o ranking de
bairros do candidato escolhido em "Ver votos por bairro de um candidato".
Agora, em `js/geral.js`, a caixa só aparece com um candidato escolhido
(`fecharRankingBoxGeral()`); o mapa de 2024 não mudou. sw.js v45.

---

# Sessão — 2026-10-27 (2) · Eleições 2026: visão da virada entre turnos

**Status:** iniciada 2026-10-27 17:25 UTC · finalizada 2026-10-27 18:00 UTC
(commit direto no `main`).

Alex escolheu as duas opções da prévia (mapa da virada + fluxo no painel).

- Botão "Virada (1º → 2º turno)" no mapa de 2026 (Cotia e VGP), `js/virada.js`:
  bairro pintado pela cor do finalista que avançou na margem (mais forte =
  mudou mais) e contorno grosso onde o vencedor mudou; tooltip com % nos dois
  turnos. Com Renda (Censo) ligada, fica só o contorno de quem virou.
- Painel lateral "Para onde foram os votos" (Sankey) para a cidade ou o bairro
  clicado, marcado como estimativa. `scripts/estimar_virada.py` (inferência
  ecológica: regressão de Goodman com restrição, abstenção incluída; bairro
  puxado para a matriz da cidade) gera `cotia_virada_2026.json` e
  `data/vgp/virada_2026.json`; roda no workflow `segundo-turno-2026.yml`.
- Metodologia (seção 2) explica as contas e a limitação. PT/EN. sw.js v44.

---

# Sessão — 2026-10-27 · Eleições 2026: 2º turno (Cotia e VGP) e comparação entre turnos

**Status:** iniciada 2026-10-27 14:05 UTC · 1º/2º turno no ar 14:20 UTC; visão da virada aguardando escolha do Alex.

Pedido do Alex: dados consolidados das eleições 2026 com visão 1º turno e
2º turno, em Cotia e VGP, mantendo renda do Censo e demais camadas; sugerir
uma visão para a "virada de votos" entre os turnos.

- `scripts/download_secoes_geral.py` separa por `NR_TURNO` (antes somava os
  turnos): 1º turno no nível de cima do JSON por bairro, 2º em `turnos."2"`;
  novo `cotia_votos_por_secao_2026.json` (Presidente/Governador por seção,
  dois turnos, brancos/nulos).
- Workflow `segundo-turno-2026.yml` (Cotia + VGP) baixa do TSE via Actions
  (diário às 9h UTC até o arquivo por zona trazer o 2º turno). O
  `votacao_candidato_munzona` ainda está só com o 1º turno: o
  `completar_turno2.py` soma as seções e preenche o 2º turno do
  `tse_*_2026.json` (situação ELEITO/NÃO ELEITO vazia até o TSE atualizar).
  Aptos/comparecimento vêm do `detalhe_votacao_secao`.
- Mapa 2026: abas 1º/2º Turno valem para mapa, tooltip, bairro, filtro de
  candidato e ranking (`turnoEfetivo()`/`bairrosDoTurno()` em js/geral.js).
  Governador foi decidido no 1º turno (Tarcísio). sw.js v43.
- Resultado: Cotia virou (1º: Flávio 65.331 × Lula 59.084; 2º: Lula 76.363 ×
  Flávio 72.794; 20 bairros mudaram de vencedor). VGP: Flávio 17.930 × Lula
  15.032.
- Virada: prévia com 2 opções (mapa da virada / Sankey estimado por
  inferência ecológica) enviada ao Alex; aguardando escolha.

---

# Sessão — 2026-10-22 (22) · Mapa 2026: selo "2º TURNO" virou "VAI AO 2º TURNO"

**Status:** iniciada 2026-10-22 19:20 UTC · finalizada 2026-10-22 19:30 UTC
(commit direto no `main`).

Alex achou que o mapa de 2026 mostrava o 2º turno. Os dados são só do 1º
turno; o selo vinha da situação do TSE ("2º TURNO" = foi ao 2º turno) em
Presidente e Governador, nas duas cidades. `tSituacao` (js/i18n.js) agora
mostra "VAI AO 2º TURNO" / "TO RUNOFF".

---

# Sessão — 2026-10-22 (21) · VGP, aba Câmara: de que é feito o "Pago pela Câmara"

**Status:** iniciada 2026-10-22 19:03 UTC · finalizada 2026-10-22 19:15 UTC
(commit direto no `main`).

Pergunta do Alex: o total "Pago pela Câmara" é muito maior que os pagamentos a
pessoas físicas. É todo o gasto da Câmara no TCE-SP (2025: R$ 10,58 mi, 57%
salários de servidores, 16,5% subsídio de vereadores, 9% INSS, 10,7% serviços).
Nova tabela "De que é feito o valor pago pela Câmara" (categorias por elemento,
`CATEGORIAS_CAMARA` em `js/contas-tipo.js`) + detalhes por elemento, seguindo
os anos marcados. PT/EN.

---

# Sessão — 2026-10-22 (20) · VGP, aba Câmara: comprovantes dos adiantamentos

**Status:** iniciada 2026-10-22 17:00 UTC · finalizada 2026-10-22 17:30 UTC
(commit direto no `main`).

Pedido do Alex: pôr na página de contas o que foi achado sobre comprovantes
dos adiantamentos. Novo quadro "Os adiantamentos têm comprovante?" na aba
Câmara de `vgp/contas.html` (PT/EN em `js/contas-tipo.js`): regra da Lei
619/2011 (30 dias para gastar, 5 dias úteis para prestar contas, multa 1%/dia),
servidor nomeado por portaria (Portaria 7/2026), saldo devolvido visível no
TCE, notas e recibos não publicados (CECAM nem site), pedido via e-SIC/LAI.

---

# Sessão — 2026-10-22 (3) · Início: "Apoie a iniciativa" em destaque e carrossel "Na imprensa"

**Status:** iniciada 2026-10-22 16:57 UTC · finalizada 2026-10-22 17:15 UTC
(commit direto no `main`).

## Pedido

Na index, uma seção que evidencie o apoio (estava discreto só no rodapé) e
as fotos do Alex num carrossel com os links das matérias da Revista Circuito.

## O que foi feito

- `index.html`: botão "Apoie a iniciativa" na abertura (âncora `#apoie`) e
  seção `#apoie` antes de "Idealização e desenvolvimento", com texto, lista do
  que o apoio financia e o QR Code do PIX visível na página
  (`icons/pix-qrcode.png`; a chave nunca aparece em texto).
- "Na imprensa" virou carrossel (`#imprensa`): rolagem com scroll-snap,
  botões ‹ ›, pontos e setas do teclado (`initCarrossel` em `js/sobre.js`);
  sem botões/pontos quando tudo cabe na tela. Slide 1 = foto do Alex (a do
  GitHub) → Issuu ed. 274; slide 2 = capa desenhada em CSS → appg/2014.
  Trocar pelas fotos que o Alex mandar (não chegaram; Issuu e o site da
  revista estão bloqueados na sessão, sem capas).
- Complemento (17:12 UTC): imagens da própria revista enviadas pelo Alex no
  carrossel — `icons/imprensa-2023-a-seguir.png` (recorte "A seguir", 228×115,
  mostrado inteiro sobre fundo branco) e
  `icons/imprensa-2014-guia-granja-viana.jpg` (Alex com o app no tablet).
- `js/i18n.js`: `data-i18n-alt` traduz o atributo alt.
- Conferido claro/escuro, desktop/celular, EN.
# Sessão — 2026-10-22 (19) · Mapa 2024: vereadores eleitos ao clicar no bairro

**Status:** iniciada 2026-10-22 17:00 UTC · finalizada 2026-10-22 17:20 UTC
(commit direto no `main`).

Pedido do Alex: em VGP, ao clicar num bairro, "Vereadores eleitos" ia a 0.
Acontecia também em Cotia. Causa: `votos_por_bairro` usa o nome completo e os
totais usam o nome de urna, então `getBairroCandidatos` não achava a
situação. Agora casa por número, nome de urna ou completo→urna
(`_fullToUrna`), e a linha "Vereadores eleitos" do bairro mostra sempre o
total da cidade (11 em VGP, 17 em Cotia). Testado com Playwright em 3 bairros
de cada cidade; os selos de eleito voltaram na lista do bairro.

---

# Sessão — 2026-10-22 (18) · VGP, aba Câmara: filtro de vários anos

**Status:** iniciada 2026-10-22 16:52 UTC · finalizada 2026-10-22 16:52 UTC
(commit direto no `main`).

Pedido do Alex: filtro por ano na aba Câmara de VGP, com mais de um ano ao
mesmo tempo. Feito em `js/contas-tipo.js` (`initCamara`/`renderCamara`):
botões Todos + um por ano; com todos marcados, o primeiro clique escolhe só
aquele ano, os seguintes somam/tiram anos, e desmarcar o último volta a
Todos. Totais, tabela por favorecido e lista de lançamentos seguem os anos
marcados. Testado com Playwright (2020 → 2020+2025 → 2020+2023+2025 → Todos).

---

# Sessão — 2026-10-22 (17) · Vargem Grande Paulista: implementação

**Status:** iniciada 2026-10-22 16:07 UTC · finalizada 2026-10-22 16:37 UTC
(commit direto no `main`).

## Pedido

"comece a implementar, commite na main eu vou verificar depois do push":
trocar as páginas "Em breve" de `/vgp/` pelos dados de Vargem Grande
Paulista, seguindo `docs/vargem-grande-paulista.md`.

## O que foi feito

- **Scripts por cidade**: `scripts/cidades.py` (TSE 72737, IBGE 3556453,
  TCE `vargem-grande-paulista`) e a variável `CIDADE`; Cotia continua em
  `data/`, VGP em `data/vgp/` (nome sem "cotia"). Novos:
  `download_locais.py` (locais de votação do TSE) e
  `download_despesas_tipo.py` (CSV anual do TCE-SP, por elemento e função,
  para as duas cidades, + pagamentos da Câmara a pessoa física fora da folha).
  `download_censo.py` grava também o contorno do município (união dos setores).
- **Workflow** `dados-cidades.yml` (um job por ano para o CSV do TCE) gerou e
  commitou os dados (3fd8f25). `contas.yml` agora atualiza VGP todo mês.
- **Front-end**: `js/i18n.js` ganhou `CIDADE`, `CIDADE_INFO`, `urlDados()` e
  `tc()` (troca "Cotia" pelo nome da cidade; a tradução EN das frases com
  Cotia vale para VGP). Mapas de VGP usam sempre os bairros dos locais de
  votação (Voronoi). Fontes do rodapé por cidade.
- **Contas**: nova sub-aba **Por tipo** (Cotia e VGP: grupo de despesa,
  função de governo, tabela por elemento com variação anual,
  `js/contas-tipo.js`). Em VGP a aba **Câmara** substitui Viagens: aviso de
  que não há verba de gabinete, totais (folha, diárias R$ 2.400, adiantamentos
  líquidos) e a lista por favorecido/ano com os 135 lançamentos.
- `vgp/eleicoes2024.html` e `vgp/eleicoes2026.html` (mesmo app de Cotia);
  card de VGP no início deixou de ser "Em breve".
- Testado com Playwright: Cotia sem regressão; VGP 2024/2026/contas em
  escuro/claro, PT/EN e 390 px.

## Pendências

- Nomes de elementos vêm em minúsculas a partir do TCE ("inss").
- O CSV de 2026 do TCE só sai em 2027; rodar `dados-cidades.yml` de novo.

---

# Sessão — 2026-10-22 (2) · Site organizado por cidade (/cotia/, /vgp/)

**Status:** iniciada 2026-10-22 14:18 UTC · finalizada 2026-10-22 14:50 UTC
(commit direto no `main`).

## Pedido

O Sobre vira a página inicial (`/index.html`) com o mapa clicável das duas
cidades, sem dados. Cotia → `/cotia/…` com a bandeira de Cotia; VGP →
`/vgp/contas.html`, com Eleições 2024 / Eleições 2026 / Contas no menu.

## O que foi feito

- `git mv`: `index.html` → `cotia/eleicoes2024.html`, `eleicao-geral.html` →
  `cotia/eleicoes2026.html`, `contas.html` → `cotia/contas.html`,
  `sobre.html` → `index.html`. Nas páginas da cidade a bandeira + nome no
  header é link para o início ("Trocar de cidade").
- `vgp/eleicoes2024.html`, `vgp/eleicoes2026.html`, `vgp/contas.html`: mesma
  navegação, conteúdo "Em breve" (body `breve-page`, estilos em
  `css/sobre.css`). Ícone `icons/vgp-icon.svg` = contorno do município (não
  deu para baixar a bandeira oficial da sessão). Marca do portal na raiz:
  `icons/portal.svg` ("Dados Cívicos"), nav da raiz = Cotia | VGP.
- Clique nos mapas leva a `cotia/contas.html` e `vgp/contas.html`, como o
  Alex descreveu.
- `js/i18n.js`: `SITE_RAIZ` / `urlSite()` (raiz calculada a partir do
  próprio i18n.js). Todos os `fetch` de `data/`, o QR do PIX e os links do
  rodapé usam `urlSite`, então funcionam em qualquer subpasta.
- Redirecionamentos (GitHub Pages não tem redirect no servidor):
  `eleicao-geral.html`, `contas.html` e `sobre.html` viraram páginas de
  `location.replace` + meta refresh, mantendo `?lang=` e `#hash`. Quem tinha o
  link antigo de `/` (mapa 2024) agora cai no início.
- `sw.js` (v42, lista do shell com as páginas novas), `manifest.json`
  (nome "Dados Cívicos"), README e mensagens dos scripts.
- Complemento (14:35 UTC, pedido do Alex): header das páginas de cidade =
  [ícone] Dados Cívicos | [bandeira] Cidade, tudo um link para o início.
  Até 1100px some o texto "Dados Cívicos"; no celular ficam só os 2 ícones.
- Complemento (14:38 UTC): bandeira à esquerda de cada cidade nas abas
  "Cotia | Vargem Grande Paulista" do início e da metodologia.
- Complemento (14:39 UTC): foto do Alex (`icons/alex-braz.jpg`, a foto
  pública do perfil dele no GitHub, até ele mandar outra) e link do LinkedIn
  na bio.
- Conferido: todas as páginas sem erro de JS, dados carregando (com as libs
  de CDN servidas localmente no teste), nenhum link interno quebrado,
  redirecionamentos, claro/escuro, celular, EN.

---

# Sessão — 2026-10-22 · Página Sobre: mapas clicáveis de Cotia e Vargem Grande Paulista

**Status:** iniciada 2026-10-22 14:15 UTC · finalizada 2026-10-22 14:30 UTC
(commit direto no `main`).

## Pedido

Na página Sobre o projeto, incluir Vargem Grande Paulista e dois mapas
clicáveis para o usuário ver os dados de cada cidade.

## O que foi feito

- `sobre.html`: seção "Escolha a cidade" (`#cidades`) logo depois dos
  destaques, com dois cartões. Cada um desenha as duas cidades no mesmo
  enquadramento (SVG inline, sem chamada externa), com a cidade do cartão em
  destaque. Contornos: malha municipal do IBGE via geodata-br
  (`geojs-35-mun.json`, ids 3513009 e 3556453), simplificados; a API de
  malhas do IBGE está bloqueada na sessão.
- Cotia leva a `index.html`. Vargem Grande Paulista aparece como "Em breve"
  (contorno tracejado, não clicável) até existirem dados e página dela —
  quando existirem, trocar o `<div class="cidade-card cidade-card--breve">`
  por `<a class="cidade-card" href="…">`.
- `css/sobre.css` (só variáveis do tema) e textos EN em `js/sobre.js`.
- Conferido claro/escuro, desktop/celular e EN.

---

# Sessão — 2026-10-22 (16) · Levantamento de dados de Vargem Grande Paulista

**Status:** iniciada 2026-10-22 14:05 UTC · finalizada 2026-10-22 16:10 UTC
(só pesquisa; nada implementado no site).

## Pedido

Alex quer o mesmo site para Vargem Grande Paulista (SP). Antes de implementar:
inventariar tudo o que o site de Cotia usa e verificar se cada dado existe
para VGP (TSE resultados, prestação de contas e bens; despesas do TCE-SP;
Censo 2022 por setor; Câmara de VGP: se os vereadores recebem reembolsos,
diárias ou verba de gabinete e onde isso é publicado; despesas por tipo).

## O que foi feito

- Inventário de dados, fontes, scripts e workflows do site de Cotia no
  README ("Inventário completo: dados, fontes e como são gerados").
- Sondagem das fontes de VGP por GitHub Actions (os hosts são bloqueados na
  sessão em nuvem), na branch `claude/project-thread-3h6zh7`, sem tocar no main.
- Resultado e plano em `docs/vargem-grande-paulista.md`: tudo existe para
  VGP (TSE 2024/2026, custo/voto, patrimônio, Censo 2022, TCE-SP API com
  slug `vargem-grande-paulista`). Despesas por tipo vêm do CSV anual do TCE
  (`ds_elemento`), não da API. Câmara de VGP: sem verba de gabinete; de 2020
  a 2025, só subsídio, um caixa de adiantamento com um servidor e duas
  diárias de R$ 1.200.

## Pendente / para o Alex decidir

- Quando implementar VGP: ordem sugerida no doc (contas → eleições → Censo).
- Se o "por tipo de despesa" também deve entrar em Cotia (mesmo CSV).

# Sessão — 2026-10-21 (15) · Página de metodologia

**Status:** iniciada 2026-10-21 00:40 UTC · finalizada 2026-10-21 01:05 UTC
(commit direto no `main`).

## Pedido

Alex mandou um zip do site com uma página `metodologia.html` (fontes dos
dados, como os cálculos são feitos e avisos legais). Analisar o conteúdo,
conferir com o que o site faz hoje e colocar a página no ar, com link no
rodapé, tema claro/escuro e PT/EN.

## O que foi feito

- `metodologia.html` + `css/metodologia.css` + `js/metodologia.js`: texto do
  zip do Alex, conferido com o código e ajustado onde divergia. Só cores de
  tema (`var(--…)`, `--amarelo` nos quadros de limitação) e todo o texto com
  `data-i18n` + inglês em `METODOLOGIA_EN`.
- Correções em relação ao zip: custo/voto usa **despesas contratadas** da
  prestação de contas final (o zip dizia "despesas consideradas") e só existe
  para 2024; ponto de cada bairro no Voronoi é a média das coordenadas dos
  locais de votação do bairro; o trecho do Service Worker dizia que o usuário
  pode ver versão antiga (desde a v41 só offline); incluídos V06004, peso por
  domicílios, cortes de renda, abstenção estimada da escola, dia 10/atraso
  de ~6 semanas do TCE, lacunas das viagens (2017, 2020, 2022).
- O zip partia de um main antigo (sw.js v40 cache-first, links antigos da
  Revista Circuito em sobre.html): só as partes novas foram aproveitadas.
- `js/fontes.js`: link "Metodologia" no rodapé de todas as páginas (e "Sobre"
  agora também aparece na página de metodologia); no celular "Sobre o
  projeto" vira "Sobre" para caber em 320 px. Link "Metodologia completa e
  avisos legais →" no topo do modal de fontes. Texto dos bairros no modal
  corrigido (centro dos locais do bairro, não o local mais próximo).
- `sw.js`: página, css e js novos no shell (sem bump, network-first).

## Como foi testado

Playwright local: todas as chaves `data-i18n` têm inglês, sem erros no
console, sem rolagem horizontal em 320/360/390/1280 px, claro e escuro.

## Pendente / para o Alex decidir

- ~~Canal reservado para dados pessoais~~ 2026-10-22: Alex pediu o e-mail
  admin@courthub.space, que agora aparece em "Correções e contestação".

# Sessão — 2026-10-21 (14) · Fim do bump manual do cache do Service Worker

**Status:** iniciada 2026-10-21 00:36 UTC · finalizada 2026-10-21 00:50 UTC
(commit direto no `main`).

## Pedido

Acabar com a armadilha do cache preso: hoje toda mudança em js/css exige
subir `CACHE_NAME` à mão em `sw.js`. Tirar também o `.DS_Store` do git.

## O que foi feito

- `sw.js`: os arquivos do próprio site (HTML, JS, CSS, ícones) passaram de
  cache-first para network-first (`networkFirstShell`), com
  `fetch(..., { cache: "no-cache" })` para revalidar com o GitHub Pages em
  vez de aceitar os 10 minutos do cache HTTP. O cache só responde offline
  (com `ignoreSearch`, para `?lang=en` funcionar sem rede). CDN e dados
  continuam como estavam.
- **Não é mais preciso subir `CACHE_NAME`/`DATA_CACHE` a cada deploy.** Subi
  uma última vez (v41) só para quem já tem o SW instalado receber este novo
  `sw.js`. Daqui em diante, subir apenas para descartar caches antigos de vez.
- `.DS_Store` removido do git (já estava no `.gitignore`).
- README atualizado.

## Como foi testado

Playwright com o site servido localmente: com o SW já controlando a página,
alterei `js/tema.js` sem tocar no `sw.js` e recarreguei. Com o `sw.js` novo
a mudança apareceu na hora; com o antigo (v40) continuou a versão em cache.
Offline, a página (inclusive `?lang=en`) abriu pelo cache.

## Atenção

Cada visita agora faz uma requisição condicional por arquivo (respostas 304
quando nada mudou), um pouco mais lenta que servir direto do cache, em troca
de sempre mostrar a versão publicada.

# Sessão — 2026-10-21 (13) · Loading com microcopy animado

**Status:** iniciada 2026-10-21 00:13 UTC · finalizada 2026-10-21 00:45 UTC
(commit direto no `main`).

## Pedido

Trocar os carregamentos pelo padrão "microcopy animado" (texto informativo
minimalista com pulso sutil, referência atlasbrasil.org.br/ranking),
acessível (WCAG): `role="status"` + `aria-live="polite"`, texto para leitor
de tela separado do texto visual (`aria-hidden`), pulso de opacidade
0,4 → 1, erro em vermelho. Exemplo completo em arquivo único + aplicar em
Eleições 2024, Eleições 2026 e Contas Municipais.

## O que foi feito

- atlasbrasil.org.br responde 403 a partir da sessão; segui as diretrizes
  escritas.
- Exemplo completo em arquivo único (HTML+CSS+JS, mock de fetch com
  sucesso/falha e "Tentar novamente") em
  `/mnt/project-files/loading-microcopy/loading-microcopy.html` do projeto,
  com capturas na mesma pasta.
- `js/carregando.js` (novo): `Carregando.status(texto, leitor)`,
  `.mostrar(bool)`, `.erro(texto, detalhe)`. Texto visual curto
  (`aria-hidden`) + frase completa em `#loading-sr` (`.sr-only`) dentro de
  `role="status" aria-live="polite"`. Passos rápidos (semestres do TCE)
  passam `leitor = null` para não encher o leitor de tela.
- `css/style.css`: novo bloco do loading (pulso 0,4 → 1, reticências
  animadas, erro em `--negativo` parado, botão "Tentar novamente",
  `.sr-only`, `prefers-reduced-motion`); variável `--azul-suave` nos dois
  temas. Saiu o spinner. `css/contas.css`: saiu a animação de folhas e a
  lista de etapas; ficou a legenda e a barra fina (agora azul).
- Mensagens agora dizem o que acontece de verdade (bairros vêm de arquivo
  local, não da Overpass): "Preparando o mapa", "Carregando resultados do
  TSE", "Somando votos por local de votação", "Desenhando o contorno de
  Cotia", "Desenhando os bairros", "Calculando bairros pelos locais de
  votação", "Marcando os locais de votação". Contas mantém as etapas
  (Conectando ao TCE-SP, Consultando 2020 · semestre 1…, Tudo pronto!).
- Erro: `init()` dos dois mapas agora tem `catch` → mensagem vermelha;
  Contas usa o mesmo padrão no lugar do parágrafo antigo. PT/EN no
  `I18N_EN` (chaves antigas sem uso removidas).
- `sw.js` → v39 com `js/carregando.js` no shell.
- Testado claro/escuro, desktop/celular, EN, erro (HTTP 503) e movimento
  reduzido.

---

# Sessão — 2026-10-21 (12) · "Apoie a iniciativa" (PIX) no rodapé

**Status:** iniciada 2026-10-21 00:14 UTC · finalizada 2026-10-21 00:25 UTC
(commit direto no `main`).

## Pedido

Opção "Apoie a iniciativa" no rodapé que abre o QR Code do PIX do Alex
(foto enviada pelo celular).

## O que foi feito

- `js/fontes.js`: botão ♥ "Apoie a iniciativa" (no celular "Apoie") no
  rodapé de todas as páginas e o `<dialog id="modal-apoio">` com texto curto,
  o QR Code e "Obrigado pelo apoio!". A chave PIX não aparece em texto.
- `icons/pix-qrcode.png`: o conteúdo do QR foi lido da foto (BR Code do
  Nubank, CRC conferido) e o código foi gerado de novo, limpo, com o mesmo
  conteúdo; conferido com leitor de QR na imagem e nas capturas da página.
- No celular (≤ 520 px) o rodapé usa rótulos curtos ("Fontes", "Apoie") e
  esconde a lista de fontes (que continua no modal).
- `css/style.css`: estilos do modal; o QR fica sobre fundo branco também no
  tema escuro (contraste para leitura). `sw.js` → v38 com a imagem no shell.

---

# Sessão — 2026-10-20 (12) · Landing page "Sobre o projeto"

**Status:** iniciada 2026-10-20 23:50 UTC · finalizada 2026-10-21 00:15 UTC
(commit direto no `main`).

## Pedido

Ler a landing page https://www.labdage.net/ e criar uma semelhante para o
projeto, com a seção "Idealização e desenvolvimento" trazendo Alex Braz
(texto dele, só "comitê" acentuado). Descrever o projeto como "portal de
transparência de dados cívicos".

## O que foi feito

- O domínio labdage.net não resolve (DNS) a partir do ambiente da sessão, e
  a busca não achou cópia; a página segue uma estrutura típica de landing
  institucional: abertura com selo "Portal de transparência de dados
  cívicos" e CTAs, 3 destaques, "O projeto", "O que você encontra" (cards
  Eleições 2024 / 2026 / Contas), "Como trabalhamos" (botão abre o modal de
  fontes), "Idealização e desenvolvimento" (Alex Braz) e "Código aberto".
- `sobre.html` + `css/sobre.css` (só variáveis do tema) + `js/sobre.js`
  (inglês em `SOBRE_EN`, registrado no `I18N_EN`).
- `js/fontes.js`: link "Sobre o projeto" no rodapé de todas as páginas
  (menos na própria); estilo `.rodape-sobre` em `css/style.css`.
- `sw.js` → v35 com sobre.html, css/sobre.css e js/sobre.js no shell.
- Conferido claro/escuro, desktop/celular (sem rolagem horizontal) e EN.
  Capturas em `/mnt/project-files/landing-page/` do projeto.
- Complemento (2026-10-21 00:02 UTC, pedido do Alex): segundo parágrafo na
  bio — palestrante e instrutor de Blockchain e smart contracts, passagens
  por NEM e Rootstock, um dos pioneiros no Brasil (PT/EN). `sw.js` → v36.
- Complemento (2026-10-21 00:06 UTC): "Na imprensa" na bio — Revista
  Circuito, março de 2023 (50 profissionais de TI para seguir) e 12/05/2014
  (app Guia da Granja Viana). As URLs das matérias não foram achadas (site
  inacessível da sessão, busca sem resultado): o link vai para a home da
  revista. `sw.js` → v37.
- 2026-10-21 00:33 UTC: Alex mandou os links; "Na imprensa" aponta para
  issuu (ed. 274, março de 2023) e revistacircuito.com/appg/ (2014).
  `sw.js` → v40.

---

# Sessão — 2026-10-20 (11) · Rodapé com as fontes dos dados

**Status:** iniciada 2026-10-20 23:29 UTC · finalizada 2026-10-20 23:50 UTC
(commit direto no `main`).

## Pedido

Criar um rodapé igual em todas as páginas com um ícone que abre um modal
explicando de onde vêm os dados (TSE, TCE-SP, IBGE, Câmara etc.) e como são
montados, com links para as fontes.

## O que foi feito

- `js/fontes.js` (carregado nas 3 páginas): cria o `<footer id="rodape">`
  ("Dados públicos: TSE · TCE-SP · IBGE · Câmara de Cotia" + botão ⓘ "Fontes
  e metodologia") e o `<dialog id="modal-fontes">` (foco preso, Esc e clique
  fora fecham, foco volta ao botão). O conteúdo fica em `FONTES_SECOES`:
  Eleições 2024; Eleições 2022/2026; gastos de campanha e patrimônio;
  bairros do mapa (aproximados por proximidade); renda do Censo 2022
  (V06004, setor pintado pela própria renda, renda do responsável e não per
  capita); Contas do Município (TCE-SP, dia 10, ~6 semanas de atraso);
  viagens da Câmara (PDFs + OCR); mapa base e código. Cada seção tem uma
  "Limitação" e links. Inglês em `FONTES_EN` (registrado no `I18N_EN`).
- `css/style.css`: rodapé fixo nas páginas de mapa (`--footer-height`, o
  `#main` termina acima dele; no celular mapa e painel dividem a altura por
  flex) e no fim do conteúdo em Contas; estilos do modal só com variáveis do
  tema (conferido claro/escuro, desktop/celular, PT/EN).
- `sw.js` → v34 com `js/fontes.js` no shell.

---

# Sessão — 2026-10-20 (8) · Renda por setor censitário (Jardim do Engenho)

**Status:** iniciada 2026-10-20 23:28 UTC · finalizada 2026-10-20 23:50 UTC
(direto no `main`).

## Pedido

Alex estranhou o Jardim do Engenho aparecer como renda alta (R$ 7.634) e
mandou uma análise que o coloca em renda média-baixa a média.

## O que foi feito

- Conferência: o IBGE não tem bairros para Cotia (só setores). O bairro do
  mapa (local de votação mais próximo) juntava setores de R$ 2–4 mil com um
  de R$ 9,9 mil colado na escola e três de R$ 12–16 mil a 1,2–1,3 km, já do
  lado da Granja Viana. Tabela em `/mnt/project-files/plano-censo/jardim-do-engenho-setores.md`.
- Correção: com "Renda (Censo)" ligado, o mapa pinta cada setor censitário
  pela sua renda (`data/censo_renda_setores.geojson`, 720 setores, 391 KB,
  76 KB gzip, carregado só no primeiro clique) e os bairros ficam só no
  contorno tracejado. O tooltip do bairro continua com a média dos setores.
  Vale nos mapas 2024 e 2022/2026.
- `download_censo.py` grava também código do setor, mediana (V06006), bairro
  do IBGE (vazio em Cotia) e os contornos simplificados (~10 m).
- `sw.js` → v33.

---

# Sessão — 2026-10-20 (10) · Patrimônio declarado dos candidatos 2024

**Status:** iniciada 2026-10-20 23:05 UTC · finalizada 2026-10-20 23:20 UTC
(commit direto no `main`).

## Pedido

Mostrar o patrimônio declarado de cada candidato abaixo do nome, antes do
custo/voto, com link para esse dado no TSE.

## O que foi feito

- `scripts/download_patrimonio.py`: baixa `consulta_cand_2024.zip` e
  `bem_candidato_2024.zip` (TSE Dados Abertos), filtra prefeito e vereadores
  de Cotia/SP e soma `VR_BEM_CANDIDATO` por `SQ_CANDIDATO`. Grava
  `data/patrimonio_candidatos_2024.json` (308 candidatos, 226 com bens) com o
  link da página do candidato no DivulgaCandContas
  (`…/candidato/SUDESTE/SP/2045202024/{SQ_CANDIDATO}/2024/63614`).
- Workflow `.github/workflows/patrimonio.yml` (manual ou push no `main` que
  mexa no script) roda o script e comita o JSON, porque o CDN do TSE é
  bloqueado na rede da sessão.
- `js/tse.js`: `loadPatrimonio()` e `htmlPatrimonio()`; o card mostra
  "Patrimônio: R$ x  TSE ↗" acima do "Custo/voto" (ou "nenhum bem
  declarado"). Os dois arquivos usam o mesmo índice por número/nome
  (`carregarIndiceCandidatos`, `buscarNoIndice`). Só no mapa 2024.
- Textos em `js/i18n.js`, `.candidate-tse-link` em `css/style.css` (conferido
  nos temas claro e escuro), `sw.js` → v32 com o JSON novo no cache de dados.

---

# Sessão — 2026-10-20 (9) · Abas de cargo na página Eleições 2026

**Status:** iniciada 2026-10-20 22:08 UTC · finalizada 2026-10-20 22:35 UTC
(commit direto no `main`).

## Pedido

Reorganizar as abas Presidente / Governador / Senador / Dep. Federal /
Dep. Estadual da página Eleições 2026 (Dep. Federal não aparecia) e
adicionar um botão de rolagem para a direita.

## O que foi feito

- `js/geral.js`: `renderCargoTabs()` agora usa o controle segmentado do site
  (`segmentado segmentado--cargos`, `role="tablist"`, `aria-selected`) numa
  faixa com rolagem horizontal e setas ‹ › nas pontas. As setas só aparecem
  quando há abas escondidas daquele lado (`atualizarSetasCargo`, também no
  resize); cada clique rola ~70% da largura. Depois de redesenhar o sidebar,
  `iniciarAbasCargo()` deixa a aba ativa à vista (ex.: Dep. Estadual).
- `css/abas.css`: estilos `.cargo-abas`, `.segmentado--cargos`, `.cargo-rolar`.
- `js/i18n.js`: "Cargos", "Rolar abas para a esquerda/direita".
- Testado no Chromium em 390px e 1366px, temas claro e escuro. `sw.js` → v31.

---

# Sessão — 2026-10-20 (8) · Correções do tema claro na Eleição 2026

**Status:** iniciada 2026-10-20 22:10 UTC · finalizada 2026-10-20 22:20 UTC
(commit direto no `main`).

- Seletor "2026 — 1º Turno" do header e nome do candidato no tooltip do
  bairro tinham cores fixas brancas (sumiam no tema claro); agora usam
  `--text`, `--text-muted`, `--tinta` e `--positivo`.
- `sw.js` → v30.

---

# Sessão — 2026-10-20 (7) · Renda do Censo também no mapa 2026

**Status:** iniciada 2026-10-20 22:07 UTC · finalizada 2026-10-20 22:25 UTC
(direto no `main`, a pedido do Alex).

## Pedido

Levar a renda do Censo para a aba Eleições 2026, com um botão que pinta os
bairros pela renda ignorando as cores dos candidatos e um botão Limpar que
volta às cores dos candidatos.

## O que foi feito

- `eleicao-geral.html` carrega `js/renda.js`; `addAcoesRenda()` cria os botões
  "Renda (Censo)" e "Limpar" no topleft do mapa.
- `js/geral.js`: `pintarBairrosGeral()` pinta tudo pela renda (esconde a
  legenda do top-3, mostra a da renda) ou volta às cores de candidatos que
  valiam (destaque por ícone, combobox ou top-3). Trocar cargo/turno/ano com a
  renda ligada mantém a renda; escolher um candidato desliga a renda. Tooltip
  do bairro ganha a linha de renda.
- `js/renda.js`: `setRenda()` com callback por página (o 2024 segue igual).
- Testado no Chromium nos temas claro e escuro. `sw.js` → v29.

---

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
