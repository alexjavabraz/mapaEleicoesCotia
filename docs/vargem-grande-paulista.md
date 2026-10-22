# Vargem Grande Paulista: levantamento de dados (2026-10-22)

Pesquisa feita antes de implementar: para cada dado que o site de Cotia
mostra, procuramos o equivalente para Vargem Grande Paulista (VGP). Tudo foi
conferido com downloads de verdade, rodando no GitHub Actions (workflow
`sondar-vgp.yml` e script `scripts/sondar_vgp.py`, na branch
`claude/project-thread-3h6zh7`), porque TSE, IBGE e TCE-SP são bloqueados
nas sessões em nuvem.

## Chaves do município

| Fonte | Cotia | Vargem Grande Paulista |
|---|---|---|
| TSE (`SG_UE` / `CD_MUNICIPIO`) | 63614 | **72737** |
| Zona eleitoral | 227 e 286 | **286** (a mesma zona de Caucaia do Alto) |
| IBGE (`CD_MUN`) | 3513009 | **3556453** |
| TCE-SP (slug da API) | `cotia` | **`vargem-grande-paulista`** |
| Câmara | cotia.sp.leg.br | **camaravgp.sp.gov.br** (transparência no sistema CECAM) |
| Prefeitura | — | vargemgrandepaulista.sp.gov.br (transparência em `sistemas.vargemgrandepaulista.sp.gov.br/portal/transparencia`) |

Como VGP e Cotia dividem a zona 286, os scripts que hoje filtram por zona
precisam filtrar por `CD_MUNICIPIO` (os de seção já fazem isso).

## Disponibilidade, dado a dado

| Dado (como em Cotia) | Disponível para VGP? | O que a sondagem encontrou | Fonte | Como obter |
|---|---|---|---|---|
| Votação 2024 por zona (Prefeito, Vereador) | **Sim** | 105 linhas: 3 candidatos a prefeito e 102 a vereador. Só houve 1º turno (Piter Santos, PODE, eleito). | TSE `votacao_candidato_munzona_2024.zip` | `download_tse.py` com `MUNICIPIO_ALVO = "VARGEM GRANDE PAULISTA"` |
| Votação 2024 por seção → bairro e escola | **Sim** | 128 seções em 21 locais de votação | TSE `votacao_secao_2024_SP.zip` (476 MB) | `download_secoes.py` com `CD_MUNICIPIO = "72737"` |
| Locais de votação com lat/lng e bairro | **Sim** | 128 seções, todas com coordenadas, 21 locais, 15 bairros no campo `NM_BAIRRO` do TSE (Parque do Agreste, Tijuco Preto, Jardim Floresta, Portão Vermelho, Jardim Olímpia, São Judas Tadeu, …) | TSE `eleitorado_local_votacao_2024.zip` | gerar `vgp_locais_votacao.json` com o mesmo formato de `cotia_locais_votacao.json` |
| Eleições 2026 por zona e por bairro | **Sim** | munzona 2026: 12 linhas de Presidente (arquivo `_BR`) e 2.409 de Governador, Senador, Dep. Federal e Dep. Estadual (`_SP`); seção 2026: 22.825 linhas, 128 seções, 21 locais | TSE `votacao_candidato_munzona_2026.zip`, `votacao_secao_2026_SP.zip` + `_BR.zip` | `download_tse_geral.py` / `download_secoes_geral.py` parametrizados |
| Custo por voto 2024 | **Sim** | 1.487 despesas contratadas de 110 candidatos, R$ 1,11 mi no total. Receitas: 199 linhas, R$ 1,17 mi. O arquivo de despesas *pagas* de SP veio vazio para VGP; o site de Cotia usa as contratadas, então não afeta. | TSE `prestacao_de_contas_eleitorais_candidatos_2024.zip` (1,36 GB) | `download_gastos_campanha.py` com `SG_UE = 72737` |
| Patrimônio declarado 2024 | **Sim** | 113 candidatos (107 a vereador, 3 a prefeito e 3 a vice); 79 declararam bens: 236 itens, R$ 42,6 mi | TSE `consulta_cand_2024.zip` + `bem_candidato_2024.zip` | `download_patrimonio.py` com `SG_UE = 72737`; link DivulgaCandContas com `.../SP/2045202024/{sq}/2024/72737` |
| Bairros no mapa | **Parcial, como em Cotia** | IBGE não tem bairros para VGP (`NM_BAIRRO` vazio nos 134 setores da malha 2022, um só distrito). Os bairros vêm do TSE (15 nomes) e o desenho é por proximidade aos locais de votação (Voronoi), como em Cotia. | TSE + Overpass (contorno) | `download_bairros_osm.py` parametrizado; contorno salvo em `vgp_municipio.geojson` |
| Renda (Censo 2022, o censo mais recente; o de 2020 foi adiado para 2022) por setor | **Sim** | 130 setores no arquivo de renda (127 com renda), 134 na malha; renda média ponderada dos responsáveis R$ 3.835,50; 17.645 domicílios | IBGE `Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip` (V06004, V06001, V06006) + `SP_setores_CD2022.gpkg` | `download_censo.py` com `CD_MUN = "3556453"` |
| Despesas do município (prefeitura e Câmara) | **Sim** | API com dados de jan/2020 a 2026, dois órgãos: Prefeitura e Câmara Municipal de VGP. Receitas também respondem. | `https://transparencia.tce.sp.gov.br/api/json/despesas/vargem-grande-paulista/{ano}/{mes}` | `download_contas.py` com o slug trocado |
| **Despesas por tipo** (novo; Cotia também não tem) | **Sim, pelo CSV anual do TCE** | A API JSON não traz o tipo. O CSV anual do TCE traz `ds_elemento` (ex.: `33903999 - OUTROS SERVIÇOS DE TERCEIROS - PJ`), além de função, subfunção, programa, ação, fonte de recurso, modalidade de licitação e histórico. | `https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados/despesas-{ano}.zip` (2008–2025; ~2,1 GB cada, o estado todo) | novo script: baixar com retomada (a conexão cai perto de 1 GB), ler em **latin-1**, filtrar `ds_municipio`, agregar por `ds_elemento` e evento. O mesmo serve para Cotia. |
| Viagens / reembolsos da Câmara | **Não há verba de gabinete** | 2020–2025: só subsídio, um caixa de adiantamento com um servidor e 2 diárias de R$ 1.200 (ver abaixo) | TCE-SP CSV + SISCAM + Lei Orgânica | CSV anual do TCE |

## Vereadores de VGP recebem reembolsos ou verba de gabinete?

**Não.** Os vereadores de VGP não têm verba indenizatória nem verba de
gabinete com prestação de contas por nota fiscal. O que aparece de 2020 a
2025 é:

1. **Subsídio** (salário dos vereadores), elemento `31901175 - SUBSÍDIOS -
   AGENTES POLÍTICOS`: R$ 0,82 mi (2020), R$ 1,34 mi/ano (2021–2024) e
   R$ 1,74 mi (2025).
2. **Regime de adiantamento** (Lei municipal nº 619/2011, citada nas
   portarias como "Lei 028/11"): um caixa pequeno, de R$ 500 a R$ 2.500 por
   vez (em geral R$ 900 por mês), entregue a **um servidor** designado
   todo ano por portaria da Mesa. O servidor presta contas e devolve a
   sobra. Total líquido de R$ 2,8 mil a R$ 7,1 mil por ano. Não é por
   vereador. Servidores: Marcos Henrique de Oliveira (2020, 2023, 2024),
   Vinicius Muniz Aci (2021, 2022) e Elcio Pereira da Silva Filho (2025).
   Portarias no SISCAM: nº 14/2021, 9/2023, 18/2025 e 7/2026.
3. **Diárias de viagem pagas a vereador: dois casos em seis anos**, os dois
   de R$ 1.200, para Brasília:
   - 09/03/2020, Djalma Lima de Oliveira: "DIARIAS PARA VIAGEM A BRASILIA";
   - 13/10/2025, Roberta Macieira de Oliveira (vereadora que tomou posse em
     11/02/2025): "DIARIAS PARA VIAGEM A BRASILIA CONF PROC 360/25".
4. Dois ressarcimentos em 2020 a pessoas físicas por processo
   administrativo (R$ 920 e R$ 300; "RESSARCIMENTO DE VALOR CONF PROC ADM
   002/2020" e "003/2020"). O histórico não diz se eram vereadores.

Em nenhum ano a Câmara usou os elementos de diárias (`339014`), passagens
(`339033`) ou indenizações e restituições (`339093`). Os dois pagamentos de
diárias foram lançados como "outros serviços de terceiros". Combustível:
R$ 1,8 mil a R$ 2,9 mil por ano. Auxílio-alimentação (cartão, para
servidores): de R$ 166 mil em 2022 a R$ 549 mil em 2025.

Como foi verificado:

- **TCE-SP**: o CSV de despesas de cada ano, de 2020 a 2025 (todas as
  linhas "Valor Pago" da Câmara), agrupado por elemento. Todos os pagamentos
  a pessoa física que não são folha foram listados com o histórico
  (`scripts/analisar_camara_vgp.py`).
- **Legislação (SISCAM)**, em `vargemgrandepaulista.siscam.com.br`, com a
  busca "Home/Consulta": "verba de gabinete" só tem um requerimento antigo
  sobre adiantamentos de uma chefe de gabinete da prefeitura. "Reembolso"
  só tem leis de 1985 sobre a saúde de um ex-prefeito. "Ressarcimento" não
  tem nenhuma norma de verba para vereadores. "Diárias" e "viagem" não têm
  resolução.
- **Lei Orgânica** (até a Emenda 23): só prevê o subsídio dos vereadores e
  a verba de representação do Prefeito, do Vice e do Presidente da Câmara.
- **Portal de transparência da Câmara** (CECAM): não tem página de diárias,
  viagens ou verba.

Conclusão para o site: para VGP não há uma aba "Viagens/Verbas" como a de
Cotia. Dá para mostrar, a partir do mesmo CSV do TCE, uma linha "Diárias e
adiantamentos da Câmara" com os poucos lançamentos acima, e uma nota
explicando que a Câmara não tem verba de gabinete.

## Gastos por tipo: o que dá para calcular

Com `ds_elemento` dá para montar, por ano e por órgão:

- total pago por elemento (como a tabela acima);
- agrupamento em categorias legíveis pelos dois primeiros dígitos do
  código: `31` pessoal e encargos, `33` custeio (serviços, material),
  `44` investimentos (obras, equipamentos), `46` amortização da dívida,
  `32` juros;
- por função de governo (saúde, educação, …) com `ds_funcao_governo`.

Prefeitura de VGP em 2025 (Valor Pago, maiores): vencimentos R$ 69,2 mi;
contrato de gestão R$ 25,1 mi; locação de bens móveis e intangíveis
R$ 17,3 mi; limpeza e conservação R$ 16,4 mi; INSS R$ 15,4 mi; outros
serviços de PJ R$ 15,1 mi.

Detalhe técnico: o CSV tem ~2 GB por ano para o estado inteiro. Rodar no
Actions leva ~30 min por ano (download com retomada + leitura). O workflow
deve gerar só o JSON agregado de VGP (e de Cotia, se quisermos o mesmo
recurso lá) e guardar o recorte filtrado como artefato.

## Plano de implementação (quando o Alex pedir)

O site já está organizado por cidade: `cotia/{eleicoes2024,eleicoes2026,contas}.html`
e `vgp/` com as mesmas três páginas como "Em breve" (`body.breve-page`).
O início (`index.html`) já liga o card de VGP a `vgp/contas.html`.

1. **Parametrizar os scripts por cidade** (um dicionário `CIDADES` com nome
   TSE, `SG_UE`, código IBGE e slug do TCE) e gravar com prefixo:
   `data/vgp_*.json` (Cotia continua com os nomes atuais).
2. **Workflows**: rodar os mesmos (`secoes`, `gastos-campanha`, `patrimonio`,
   `censo`, `contas`) com uma matriz de cidades ou um input `cidade`.
3. **Páginas**: substituir `vgp/*.html` pelas versões reais, reaproveitando
   os JS de Cotia com a cidade como configuração. Caminhos de dados sempre
   com `urlSite("data/…")` (de `js/i18n.js`), nunca relativos à página.
4. **Contas por tipo**: novo script com o CSV anual do TCE para VGP (e
   Cotia), e uma aba "Por tipo de despesa" em `contas.html`.
5. **Câmara**: sem verba de gabinete. Mostrar só a nota e os poucos
   lançamentos de diárias e adiantamentos, tirados do CSV do TCE.

Ordem sugerida: contas (API + por tipo), depois eleições 2024 e 2026, depois
renda do Censo.
