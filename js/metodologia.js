/**
 * metodologia.js — Página "Metodologia, fontes e avisos legais" (metodologia.html).
 *
 * Os textos ficam no HTML com data-i18n; aqui só o inglês (METODOLOGIA_EN,
 * registrado no I18N_EN antes do applyI18n do DOMContentLoaded).
 */

const METODOLOGIA_EN = {
  "Metodologia, fontes e avisos legais — Cotia": "Methodology, sources and legal notices — Cotia",
  "Transparência e reprodutibilidade": "Transparency and reproducibility",
  "Metodologia, fontes e avisos legais": "Methodology, sources and legal notices",
  "Como os dados públicos são coletados, tratados e apresentados, o que cada indicador significa e quais são as suas limitações.":
    "How public data is collected, processed and presented, what each indicator means and what its limitations are.",
  "Versão desta página:": "Version of this page:",
  "21 de outubro de 2026": "October 21, 2026",

  "Como ler o mapa eleitoral:": "How to read the election map:",
  "os votos de um bairro são os das seções instaladas nos locais de votação daquele bairro, segundo o cadastro do TSE. Não representam necessariamente a preferência de quem mora nele. Os contornos dos bairros no mapa são aproximações, não divisas oficiais.":
    "a neighborhood's votes are those of the polling sections at the polling places registered in that neighborhood by TSE. They do not necessarily reflect the preference of the people who live there. The neighborhood outlines on the map are approximations, not official borders.",

  "Índice da metodologia": "Methodology contents",
  "Nesta página": "On this page",
  "Natureza do portal": "About the portal",
  "Votos e cálculos eleitorais": "Votes and election math",
  "Bairros no mapa": "Neighborhoods on the map",
  "Campanhas e patrimônio": "Campaigns and assets",
  "Renda do Censo": "Census income",
  "Contas e viagens": "Spending and trips",
  "Atualização e limitações": "Updates and limitations",
  "Avisos legais e correções": "Legal notices and corrections",
  "Fontes e código": "Sources and code",

  "1. Natureza e finalidade": "1. Nature and purpose",
  "Este é um projeto independente de transparência e visualização de dados públicos, sem vínculo institucional, chancela ou representação do TSE, do IBGE, do TCE-SP, da Prefeitura ou da Câmara Municipal de Cotia. O objetivo é facilitar o acesso e a análise descritiva de informações públicas, sem recomendar candidatos, partidos ou posições políticas.":
    "This is an independent project for public data transparency and visualization, with no institutional link to, endorsement from or representation of TSE, IBGE, TCE-SP, Cotia City Hall or Cotia City Council. Its goal is to make public information easier to access and describe, without recommending candidates, parties or political positions.",
  "Os números exibidos são reproduções de bases oficiais ou indicadores derivados delas por processamento automatizado. Os mapas, agrupamentos, gráficos e textos explicativos são produtos do projeto e não devem ser confundidos com documentos oficiais.":
    "The numbers shown are reproductions of official datasets or indicators derived from them by automated processing. The maps, groupings, charts and explanatory texts are products of this project and must not be mistaken for official documents.",

  "2. Como são calculados os resultados eleitorais": "2. How election results are calculated",
  "Os scripts do projeto baixam os arquivos públicos de votação por seção eleitoral do Tribunal Superior Eleitoral (TSE), ficam só com as seções de Cotia e ligam cada seção (zona e número) ao seu local de votação pelo cadastro de locais de votação do TSE, que também informa o endereço, o bairro e as coordenadas de cada escola. Depois somam os votos por candidato e cargo.":
    "The project's scripts download the public per-section vote files from the Superior Electoral Court (TSE), keep only Cotia's sections and link each section (zone and number) to its polling place using the TSE register of polling places, which also gives each school's address, neighborhood and coordinates. They then add up the votes by candidate and office.",
  "Votos do candidato em uma escola = soma dos votos dele em todas as seções daquela escola.":
    "Candidate's votes at a school = sum of their votes in every section at that school.",
  "Votos do candidato em um bairro = soma dos votos dele nas seções de todos os locais de votação cadastrados naquele bairro.":
    "Candidate's votes in a neighborhood = sum of their votes in the sections of every polling place registered in that neighborhood.",
  "Em 2024 (Prefeito e Vereadores) o mapa também usa o total de votos de cada candidato por zona eleitoral. Em 2022 e 2026 (Presidente, Governador, Senador e Deputados) vale o mesmo cálculo por seção, com o arquivo de São Paulo para os cargos estaduais e o arquivo nacional para Presidente, filtrados para Cotia.":
    "In 2024 (Mayor and City Council) the map also uses each candidate's total votes per electoral zone. In 2022 and 2026 (President, Governor, Senator and Representatives) the same per-section calculation applies, using the São Paulo file for state offices and the national file for President, filtered to Cotia.",
  "Ao clicar em uma escola no mapa de 2024 aparece uma abstenção estimada, calculada com os eleitores registrados naquela escola (cadastro do TSE) e todos os votos para prefeito registrados nas seções dela:":
    "Clicking a school on the 2024 map shows an estimated abstention, calculated from the voters registered at that school (TSE register) and all mayoral votes recorded in its sections:",
  "Abstenção estimada da escola = (eleitores registrados − votos para prefeito) ÷ eleitores registrados.":
    "School's estimated abstention = (registered voters − mayoral votes) ÷ registered voters.",
  "Percentuais dependem do denominador de cada visualização e não devem ser lidos como percentual da população, do eleitorado residente ou de todos os eleitores aptos. Votos brancos, nulos e abstenções são categorias distintas e não devem ser presumidos incluídos no percentual de um candidato.":
    "Percentages depend on the denominator of each view and must not be read as a share of the population, of resident voters or of all eligible voters. Blank votes, null votes and abstentions are separate categories and must not be assumed to be included in a candidate's percentage.",
  "Os recortes de 2022, 2024 e 2026 devem ser lidos por eleição, turno e cargo. O TSE só publica a votação por seção depois que a apuração termina, então um turno ainda não publicado (como o 2º turno de 2026, até a divulgação) não aparece no mapa, e dado ausente não significa zero votos. Este portal não substitui a totalização e a consulta oficial do TSE.":
    "The 2022, 2024 and 2026 views must be read by election, round and office. TSE only publishes per-section votes after counting ends, so a round not yet published (such as the 2026 runoff, until its release) does not show on the map, and missing data does not mean zero votes. This portal does not replace TSE's official tally and lookup.",
  "Limitação fundamental:": "Key limitation:",
  "o eleitor vota onde está inscrito, que nem sempre é perto de onde mora. Os resultados são agrupados pela localização do local de votação, não pelo endereço, pela identidade ou pela preferência individual de cada eleitor.":
    "voters cast their ballot where they are registered, which is not always near where they live. Results are grouped by the location of the polling place, not by each voter's address, identity or individual preference.",

  "3. Como os bairros aparecem no mapa": "3. How neighborhoods appear on the map",
  "Não existe um mapa oficial de bairros de Cotia em formato aberto: o OpenStreetMap não tem os bairros da cidade e o IBGE não divulga bairros para Cotia. Por isso o mapa desenha os bairros por proximidade.":
    "There is no official open map of Cotia's neighborhoods: OpenStreetMap does not have them and IBGE does not publish neighborhoods for Cotia. So the map draws neighborhoods by proximity.",
  "Para cada bairro do cadastro do TSE, o ponto de referência é o centro (média das coordenadas) dos seus locais de votação. Cada ponto do município fica com o bairro cujo ponto de referência está mais perto (um diagrama de Voronoi), e o resultado é recortado pelo contorno de Cotia do OpenStreetMap. O desenho é calculado no próprio navegador, a partir de arquivos guardados no site.":
    "For each neighborhood in the TSE register, the reference point is the center (average of the coordinates) of its polling places. Every point of the city is assigned to the neighborhood whose reference point is closest (a Voronoi diagram), and the result is clipped by Cotia's boundary from OpenStreetMap. The drawing is computed in the browser itself, from files stored on the site.",
  "Ponto de referência do bairro = média das latitudes e longitudes dos locais de votação do bairro.":
    "Neighborhood reference point = average latitude and longitude of the neighborhood's polling places.",
  "Importante:": "Important:",
  "as áreas servem para organizar o mapa e não definem limites administrativos, postais, cadastrais ou legais. Uma escola perto de uma divisa pode receber eleitores de outras regiões, e a área ou a cor de um polígono não mostram onde moram os eleitores.":
    "the areas organize the map and do not define administrative, postal, cadastral or legal limits. A school near a border may receive voters from other areas, and a polygon's area or color does not show where voters live.",

  "4. Gastos de campanha e patrimônio declarado (2024)": "4. Campaign spending and declared assets (2024)",
  "O gasto de campanha é a soma das despesas contratadas que o candidato declarou na prestação de contas final ao TSE. O custo por voto, mostrado abaixo do nome de cada candidato de 2024, divide esse gasto pelos votos que ele teve no 1º turno em Cotia.":
    "Campaign spending is the sum of contracted expenses the candidate declared in their final financial report to TSE. Cost per vote, shown under each 2024 candidate's name, divides that spending by the votes they got in the 1st round in Cotia.",
  "Custo por voto = despesas contratadas declaradas ao TSE ÷ votos no 1º turno.":
    "Cost per vote = contracted expenses declared to TSE ÷ 1st-round votes.",
  "Esse quociente é um indicador aritmético. Não é o preço de um voto, não prova compra de votos, não mede eficiência eleitoral e não indica irregularidade.":
    "This ratio is an arithmetic indicator. It is not the price of a vote, does not prove vote buying, does not measure electoral efficiency and does not indicate wrongdoing.",
  "O patrimônio é a soma dos valores dos bens que o candidato declarou à Justiça Eleitoral ao registrar a candidatura (arquivo de bens de candidatos do TSE). O link “TSE ↗” ao lado abre a página do candidato no DivulgaCandContas.":
    "Assets are the sum of the values of the property the candidate declared to the Electoral Court when registering (TSE candidate assets file). The “TSE ↗” link next to it opens the candidate's page on DivulgaCandContas.",
  "Patrimônio = soma dos valores de todos os bens declarados pelo candidato.":
    "Assets = sum of the values of all property declared by the candidate.",
  "Limitação:": "Limitation:",
  "são valores declarados pelo próprio candidato. Bens costumam ser informados pelo valor de compra, não pelo valor de mercado, e as declarações podem ser retificadas depois.":
    "these are amounts declared by the candidates themselves. Assets are usually reported at purchase price, not market value, and declarations may be amended later.",

  "5. Indicadores de renda (Censo 2022)": "5. Income indicators (2022 Census)",
  "O botão “Renda (Censo)”, nos mapas de 2024 e de 2026, usa o rendimento nominal médio mensal dos responsáveis pelos domicílios (variável V06004 do IBGE) de cada um dos setores censitários de Cotia no Censo Demográfico de 2022. Com ele ligado, cada setor é pintado pela sua própria renda e os bairros ficam só no contorno tracejado.":
    "The “Income (Census)” button, on the 2024 and 2026 maps, uses the average monthly nominal income of household heads (IBGE variable V06004) of each of Cotia's census tracts in the 2022 Census. With it on, each tract is colored by its own income and neighborhoods are shown only as a dashed outline.",
  "A renda que aparece ao passar sobre um bairro é a média dos setores que caem dentro dele, ponderada pelo número de domicílios particulares permanentes ocupados de cada setor:":
    "The income shown when hovering a neighborhood is the average of the tracts inside it, weighted by each tract's number of occupied permanent private households:",
  "Renda média do bairro = Σ (renda média do setor × domicílios do setor) ÷ Σ (domicílios dos setores do bairro).":
    "Neighborhood average income = Σ (tract average income × tract households) ÷ Σ (households of the neighborhood's tracts).",
  "As cores separam três faixas em salários mínimos de 2022 (R$ 1.212): até 2,5 salários mínimos (R$ 3.030), de 2,5 a 5 (até R$ 6.060) e acima de 5. Os cortes foram escolhidos pelo projeto para separar bem os bairros de Cotia; não são uma classificação oficial do IBGE.":
    "The colors split three brackets in 2022 minimum wages (R$ 1,212): up to 2.5 minimum wages (R$ 3,030), 2.5 to 5 (up to R$ 6,060) and above 5. The cut-offs were chosen by the project to separate Cotia's neighborhoods well; they are not an official IBGE classification.",
  "é a renda da pessoa responsável pelo domicílio, não a renda per capita, a renda total da família nem a renda de todos os moradores. Os dados são de 2022, a média de um bairro grande pode esconder setores muito diferentes, e o IBGE não divulga renda por bairro em Cotia, só por setor, então não há número oficial por bairro para comparar.":
    "this is the income of the household head, not per capita income, total family income or the income of every resident. The data is from 2022, a large neighborhood's average can hide very different tracts, and IBGE does not publish income by neighborhood for Cotia, only by tract, so there is no official per-neighborhood figure to compare with.",

  "6. Contas municipais e viagens da Câmara": "6. Municipal spending and City Council trips",
  "As despesas da Prefeitura e da Câmara de Cotia vêm do Portal da Transparência Municipal do Tribunal de Contas do Estado (TCE-SP), que recebe os dados enviados pelos próprios órgãos. O projeto baixa todos os meses desde 2020. Os valores pagos são agrupados pelo mês de pagamento informado na fonte, não pelo mês do empenho, da liquidação ou da execução do serviço.":
    "Spending by Cotia's City Hall and City Council comes from the Municipal Transparency Portal of the São Paulo State Audit Court (TCE-SP), which receives the data sent by those bodies themselves. The project downloads every month since 2020. Paid amounts are grouped by the payment month given in the source, not by the month of commitment, settlement or delivery of the service.",
  "Total pago no período = soma dos pagamentos lançados no período e no filtro selecionados.":
    "Total paid in the period = sum of the payments recorded in the selected period and filter.",
  "Diferenças entre empenho, liquidação e pagamento, anulações, retificações e atrasos de publicação afetam comparações. O TCE publica cada mês com cerca de seis semanas de atraso, então os meses mais recentes ainda não aparecem. A ausência de um lançamento no portal não prova ausência de gasto ou de obrigação financeira.":
    "Differences between commitment, settlement and payment, cancellations, amendments and publication delays affect comparisons. TCE publishes each month about six weeks late, so the latest months do not show yet. The absence of an entry on the portal does not prove the absence of spending or of a financial obligation.",
  "Os relatórios de viagem de vereadores e servidores são PDFs publicados pela Câmara Municipal de Cotia, um por viagem. O projeto lê cada PDF automaticamente, com reconhecimento de texto (OCR) nos documentos escaneados, para extrair destino, período e valores.":
    "Trip reports of council members and staff are PDFs published by Cotia City Council, one per trip. The project reads each PDF automatically, with text recognition (OCR) on scanned documents, to extract destination, dates and amounts.",
  "a leitura automática pode errar textos, valores ou classificações, principalmente em PDFs escaneados. Alguns arquivos de 2017 estão privados e não há relatórios publicados para 2020 e 2022. Para comprovação, consulte sempre o documento original.":
    "automatic reading can get text, amounts or classifications wrong, especially in scanned PDFs. Some 2017 files are private and there are no published reports for 2020 and 2022. For proof, always check the original document.",

  "7. Atualização, qualidade e reprodutibilidade": "7. Updates, quality and reproducibility",
  "Os dados são baixados e transformados por scripts publicados no repositório do projeto, que rodam no GitHub Actions e guardam os arquivos no próprio site. Ao abrir uma página nenhuma fonte é consultada em tempo real. As contas municipais são atualizadas todo dia 10; os resultados eleitorais, depois de cada divulgação do TSE; as demais bases, quando a fonte publica uma nova versão. A data de uma página não significa que todas as bases foram atualizadas na mesma data.":
    "The data is downloaded and transformed by scripts published in the project's repository, which run on GitHub Actions and store the files on the site itself. Opening a page does not query any source live. Municipal spending is refreshed on the 10th of every month; election results, after each TSE release; the other datasets, when the source publishes a new version. A page's date does not mean every dataset was updated on that date.",
  "O site pode ser instalado como aplicativo e guarda uma cópia local (Service Worker) para funcionar sem internet. Com conexão, sempre carrega a versão publicada; sem conexão, mostra a última cópia guardada, que pode estar desatualizada. Em caso de divergência, prevalece a publicação oficial mais recente do órgão de origem.":
    "The site can be installed as an app and keeps a local copy (Service Worker) to work offline. Online, it always loads the published version; offline, it shows the last saved copy, which may be out of date. In case of discrepancy, the latest official publication from the source agency prevails.",
  "O código-fonte permite examinar cada transformação aplicada. A disponibilidade do código não é uma certificação independente de que os dados estejam completos ou livres de erro.":
    "The source code lets anyone examine every transformation applied. Its availability is not an independent certification that the data is complete or error-free.",

  "8. Avisos legais, responsabilidade e correções": "8. Legal notices, liability and corrections",
  "Uso informativo:": "Informational use:",
  "as informações destinam-se à consulta pública, à educação cívica e à análise descritiva. Não constituem certidão, laudo, auditoria, parecer jurídico, acusação de ilícito nem conclusão sobre a conduta, a idoneidade ou a responsabilidade de qualquer pessoa.":
    "the information is meant for public reference, civic education and descriptive analysis. It is not a certificate, expert report, audit, legal opinion, accusation of wrongdoing or conclusion about anyone's conduct, integrity or liability.",
  "Fontes primárias:": "Primary sources:",
  "a interpretação de registros oficiais deve considerar a base original, suas notas metodológicas, revisões e contexto. Se houver divergência entre este portal e a fonte pública, vale o documento oficial.":
    "interpreting official records must take into account the original dataset, its methodological notes, revisions and context. If this portal and the public source disagree, the official document prevails.",
  "Independência e neutralidade:": "Independence and neutrality:",
  "o projeto não é canal oficial de órgão público e não apoia nem se opõe a candidaturas ou partidos. A presença de pessoas, partidos, empresas e valores reflete os recortes disponíveis nas fontes e não implica juízo de valor.":
    "the project is not an official channel of any public body and neither supports nor opposes candidates or parties. The presence of people, parties, companies and amounts reflects what the sources make available and implies no value judgment.",
  "Dados pessoais:": "Personal data:",
  "o portal procura limitar a exposição de informações pessoais e não mostra o CPF de pessoas físicas nas contas municipais. Informações publicadas em fontes oficiais continuam exigindo cuidado com privacidade, finalidade e contexto. Pedidos de correção ou questionamentos são avaliados caso a caso, conforme a legislação aplicável.":
    "the portal tries to limit the exposure of personal information and does not show individuals' CPF numbers in municipal spending. Information published by official sources still calls for care with privacy, purpose and context. Correction requests and objections are reviewed case by case, under applicable law.",
  "Correções e contestação:": "Corrections and disputes:",
  "se encontrar um dado incorreto, desatualizado, sem contexto suficiente ou uma possível violação de direitos, informe a página, o registro, a fonte original e a correção pretendida pelo":
    "if you find data that is wrong, outdated, lacking context or a possible violation of rights, report the page, the record, the original source and the correction you propose through the",
  "canal público de issues do GitHub ↗": "public GitHub issues channel ↗",
  ".": ".",
  "Não publique dados pessoais sensíveis em issues públicas.": "Do not post sensitive personal data in public issues.",
  "Para assuntos que envolvam informações privadas, peça na issue um contato reservado, sem incluir os dados.":
    "For matters involving private information, ask for a private contact in the issue, without including the data.",
  "Limites deste aviso:": "Limits of this notice:",
  "estas explicações não afastam obrigações legais, não limitam direitos assegurados por lei e não substituem orientação jurídica profissional. O uso e a republicação dos dados devem respeitar as condições e licenças das respectivas fontes.":
    "these explanations do not waive legal obligations, do not limit rights guaranteed by law and do not replace professional legal advice. Using and republishing the data must respect the terms and licenses of the respective sources.",

  "9. Fontes primárias e documentação": "9. Primary sources and documentation",
  "TSE — Dados Abertos ↗": "TSE — Open Data ↗",
  "resultados por seção, locais de votação, candidaturas, bens e prestação de contas.":
    "per-section results, polling places, candidacies, assets and campaign finance.",
  "página de cada candidato, com bens e contas de campanha.": "each candidate's page, with assets and campaign finance.",
  "IBGE — Censo 2022, renda por setor ↗": "IBGE — 2022 Census, income by tract ↗",
  "rendimento dos responsáveis por setor censitário e a malha dos setores.":
    "household-head income per census tract and the tract boundaries.",
  "TCE-SP — Transparência Municipal ↗": "TCE-SP — Municipal Transparency ↗",
  "despesas da Prefeitura e da Câmara de Cotia.": "spending by Cotia's City Hall and City Council.",
  "Câmara de Cotia — Relatório de viagens ↗": "Cotia City Council — Trip reports ↗",
  "PDFs das viagens de vereadores e servidores.": "PDFs of council members' and staff trips.",
  "contorno do município e parte do fundo do mapa.": "city boundary and part of the map tiles.",
  "fundo do mapa (claro, escuro e satélite).": "map tiles (light, dark and satellite).",
  "Código do site (GitHub) ↗": "Site source code (GitHub) ↗",
  "scripts de download, processamento e visualização de cada arquivo.":
    "scripts that download, process and display each file.",

  "← Sobre o projeto": "← About the project",
  "Voltar ao mapa": "Back to the map",
};

if (typeof I18N_EN === "object") Object.assign(I18N_EN, METODOLOGIA_EN);
