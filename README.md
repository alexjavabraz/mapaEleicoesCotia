# Mapa Eleitoral de Cotia

Aplicação web interativa com os resultados eleitorais de Cotia/SP, visualizados sobre um mapa geográfico do município com dados por bairro.

**Acesse online:** [alexjavabraz.github.io/mapaEleicoesCotia](https://alexjavabraz.github.io/mapaEleicoesCotia)

---

## Páginas

| Página | URL | Conteúdo |
|--------|-----|----------|
| Eleição Municipal | `/index.html` | Prefeito e Vereadores — Cotia 2024 |
| Eleições Gerais | `/eleicao-geral.html` | Presidente, Governador, Senador, Dep. Federal, Dep. Estadual — 2022 e 2026 |

---

## Funcionalidades

### Mapa
- Polígonos interativos dos bairros de Cotia (via [Overpass API / OpenStreetMap](https://overpass-api.de))
- Fallback automático para diagrama de Voronoi gerado a partir dos locais de votação do TSE quando o OSM não retorna polígonos suficientes
- Máscara externa que destaca apenas o território de Cotia — contorno buscado via Overpass API, com fallback para `data/cotia_municipio.geojson` (salvo localmente) quando a API está fora do ar ou instável
- Troca de basemap: Escuro (padrão), Claro, OSM, Satélite (tiles Esri)
- Geolocalização do usuário com marcador pulsante "Você está aqui"

### Eleição Municipal 2024
- Resultados por bairro (59 bairros) para Prefeito e Vereadores
- Resultados por zona eleitoral como fallback quando dados por bairro não estão disponíveis
- Abas Prefeito / Vereadores no sidebar
- 1º e 2º turno do Prefeito
- Filtro de vereador: coloração do mapa proporcional à votação em cada bairro
- Ranking de votos por bairro para o vereador selecionado
- Marcadores de locais de votação coloridos por taxa de abstenção (verde < 18%, âmbar 18–24%, vermelho > 24%)

### Eleições Gerais 2022 / 2026
- Seletor de ano (2022 ou 2026 — 1º Turno)
- 5 abas de cargo: Presidente · Governador · Senador · Dep. Federal · Dep. Estadual
- Clique no bairro exibe os dados reais **daquele bairro** (badge verde "dados por bairro")
- Fallback automático para dados da zona quando o bairro não está mapeado
- Coloração do mapa pelos **3 candidatos mais votados do cargo** (município inteiro): cada bairro fica com a cor de quem, entre os 3, teve mais votos ali — 🔴 1º colocado · 🔵 2º colocado · 🟡 3º colocado
- Legenda com os 3 nomes e cores no canto inferior esquerdo (mesmo lugar onde antes ficava a legenda de zonas eleitorais)
- A cor muda ao trocar de cargo — cada cargo tem seus próprios 3 primeiros colocados e vencedores por bairro
- Combobox "Ver votos por bairro de um candidato" (qualquer cargo, qualquer candidato) — colore o mapa por intensidade de votos e mostra ranking de bairros, igual ao filtro de vereador da página municipal
- Destaque de candidato por ícone no mapa (🔵 Presidente/Governador) — mostra onde aquele candidato venceu, bairro a bairro
- Botão "Ver dados gerais" no header do sidebar para voltar à visão de Cotia inteira
- Tooltip com candidato vencedor, partido e total de votos

### PWA (Progressive Web App)
- Instalável em dispositivos móveis e desktop
- Service Worker network-first para os arquivos do site e para os dados JSON (o cache só responde offline), então um deploy chega na hora sem precisar subir a versão em `sw.js`
- Auto-reload ao detectar nova versão disponível

---

## Como usar localmente

### Pré-requisitos

```bash
cd scripts
pip install -r requirements.txt
```

### 1. Eleição Municipal 2024

**Dados por zona (obrigatório):**
```bash
python scripts/download_tse.py
# Baixa ~300MB do TSE, gera data/tse_cotia_2024.json
```

**Dados por bairro (opcional — habilita resultados granulares):**
```bash
python scripts/download_secoes.py
# Baixa ~475MB do TSE, gera:
#   data/cotia_votos_por_bairro.json   (59 bairros × Prefeito + Vereadores)
#   data/cotia_votos_por_escola.json   (abstenção por local de votação)
```

### 2. Eleições Gerais

**Dados por zona:**
```bash
python scripts/download_tse_geral.py 2026
python scripts/download_tse_geral.py 2022
# Gera data/tse_cotia_2026.json e data/tse_cotia_2022.json
```

**Dados por bairro (opcional — habilita resultados granulares):**
```bash
python scripts/download_secoes_geral.py 2026
# Baixa ~767MB (SP) + ~154MB (BR) do TSE, gera:
#   data/cotia_votos_por_bairro_2026.json  (59 bairros × 5 cargos)
```

> ⚠️ Os arquivos ZIP do TSE são grandes (150MB–800MB). Os JSONs gerados ficam entre 200KB e 2.5MB e são os únicos arquivos versionados no repositório.

### 3. Iniciar servidor local

> Abrir `index.html` como `file://` causa erros de CORS. Use sempre um servidor HTTP:

```bash
python3 -m http.server 8080
# ou: npx serve .
```

Acesse [http://localhost:8080](http://localhost:8080).

---

## Estrutura de arquivos

```
mapaEleicoesCotia/
│
├── index.html                        # Eleição Municipal 2024
├── eleicao-geral.html                # Eleições Gerais 2022/2026
│
├── css/
│   └── style.css                     # Tema escuro, layout, componentes
│
├── js/
│   ├── tse.js                        # Carregamento de dados + renderização de cards
│   ├── map.js                        # Leaflet, Overpass API, Voronoi, escolas
│   ├── app.js                        # Orquestrador da página municipal
│   ├── geral-config.js               # Configuração de anos e cargos gerais
│   └── geral.js                      # Orquestrador da página de eleições gerais
│
├── data/
│   ├── tse_cotia_2024.json           # Resultados municipais por zona (200KB)
│   ├── tse_cotia_2022.json           # Resultados gerais 2022 por zona (2.1MB)
│   ├── tse_cotia_2026.json           # Resultados gerais 2026 por zona (1.5MB)
│   ├── cotia_locais_votacao.json     # 553 seções com lat/lng e bairro (788KB)
│   ├── cotia_votos_por_bairro.json   # Votos municipais por bairro (780KB)
│   ├── cotia_votos_por_bairro_2026.json  # Votos gerais 2026 por bairro (2.4MB)
│   ├── cotia_votos_por_escola.json   # Abstenção por local de votação (16KB)
│   ├── cotia_nome_map.json           # Mapeamento nome urna ↔ nome completo (13KB)
│   └── cotia_municipio.geojson       # Contorno de Cotia (fallback do Overpass, 40KB)
│
├── scripts/
│   ├── download_tse.py               # Baixa dados municipais 2024 por zona
│   ├── download_tse_geral.py         # Baixa dados gerais (2022/2026) por zona
│   ├── download_secoes.py            # Baixa dados municipais 2024 por seção→bairro
│   ├── download_secoes_geral.py      # Baixa dados gerais 2026 por seção→bairro
│   ├── gen_icons.py                  # Gera ícones PWA
│   └── requirements.txt             # requests, tqdm
│
├── icons/                            # Ícones PWA (favicon, apple-touch, 192, 512)
├── sw.js                             # Service Worker (PWA)
├── manifest.json                     # Manifest PWA
└── .gitignore
```

---

## Arquitetura técnica

### Frontend
JavaScript puro sem framework, sem build step. Dependências via CDN:

| Biblioteca | Versão | Uso |
|-----------|--------|-----|
| [Leaflet.js](https://leafletjs.com) | 1.9.4 | Mapa interativo |
| [Turf.js](https://turfjs.org) | 6.5.0 | Voronoi, interseções, geolocalização |
| [osmtogeojson](https://github.com/tyrasd/osmtogeojson) | 3.0.0-beta.4 | Conversão OSM → GeoJSON |

### Dados geográficos
Os polígonos dos bairros são buscados em runtime via [Overpass API](https://overpass-api.de) (OpenStreetMap). Se a API retornar menos de 5 polígonos, o mapa gera automaticamente células de Voronoi a partir dos centroides dos locais de votação — garantindo que o mapa sempre funcione mesmo com a API fora do ar.

### Pipeline de dados

```
TSE Dados Abertos (CDN)
    │
    ├── votacao_candidato_munzona_2024.zip (~300MB)
    │       └─ download_tse.py ──────────→ tse_cotia_2024.json
    │
    ├── votacao_candidato_munzona_2026.zip (~443MB)
    │       └─ download_tse_geral.py 2026 → tse_cotia_2026.json
    │
    ├── votacao_candidato_munzona_2022.zip (~280MB)
    │       └─ download_tse_geral.py 2022 → tse_cotia_2022.json
    │
    ├── votacao_secao_2024_SP.zip (~475MB)
    │       └─ download_secoes.py ────────→ cotia_votos_por_bairro.json
    │                                        cotia_votos_por_escola.json
    │
    ├── votacao_secao_2026_SP.zip (~767MB)  ┐
    ├── votacao_secao_2026_BR.zip (~154MB)  ┘
    │       └─ download_secoes_geral.py 2026 → cotia_votos_por_bairro_2026.json
    │
    └── eleitorado_local_votacao_2024_SP.csv
            └─ (manual) ─────────────────→ cotia_locais_votacao.json
```

### Mapeamento seção → bairro
O arquivo `cotia_locais_votacao.json` contém 553 seções eleitorais de Cotia, cada uma com `NR_ZONA`, `NR_SECAO`, `NM_BAIRRO`, `NR_LATITUDE` e `NR_LONGITUDE`. Os scripts de seção cruzam `(NR_ZONA, NR_SECAO)` desse arquivo com o CSV de votação para agregar votos por bairro. Cobertura: ~99% das seções.

---

## Dados eleitorais

### Zonas eleitorais de Cotia

| Zona | Região | Bairros principais |
|------|--------|--------------------|
| 227 | Cotia sede + Granja Viana + zona urbana | Centro, Granja Viana, Jardim Nomura, Portão, Vila São Francisco... |
| 286 | Caucaia do Alto + zona rural/periférica | Caucaia do Alto, Morro Grande, Apache, Atalaia, Lavapé... |

### Eleição Municipal 2024

- **Prefeito eleito:** WELINGTON FORMIGA (PDT)
- Turno 1: 06/10/2024 · Turno 2: 27/10/2024
- 59 bairros mapeados com dados por seção eleitoral

### Eleições Gerais 2026 (1º turno — 04/10/2026)

| Cargo | Vencedor em Cotia | Partido | Votos |
|-------|------------------|---------|-------|
| Presidente | Flávio Bolsonaro | PL | 65.331 |
| Governador | Tarcísio de Freitas | REPUBLICANOS | 73.526 (eleito) |
| Senador | Guilherme Derrite | PP | 67.786 (eleito) |
| Senador | André do Prado | PL | 63.937 (eleito) |
| Dep. Federal | Lucas Pavanato | PL | 16.410 |
| Dep. Estadual | Rogério Franco | PL | 14.130 |

> O 2º turno do Presidente (Lula × Flávio Bolsonaro) ocorre em 25/10/2026.
> Para atualizar os dados após a apuração: `python scripts/download_secoes_geral.py 2026`

### Eleições Gerais 2022

| Cargo | Vencedor em Cotia (total) | Partido |
|-------|--------------------------|---------|
| Presidente (T1) | Lula | PT |
| Presidente (T2) | Lula | PT |
| Governador (T1) | Tarcísio de Freitas | REPUBLICANOS |

---

## Fontes de dados

| Fonte | URL |
|-------|-----|
| TSE Dados Abertos | [dadosabertos.tse.jus.br](https://dadosabertos.tse.jus.br) |
| Resultados 2026 | [dataset/resultados-2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026) |
| Resultados 2024 | [dataset/resultados-2024](https://dadosabertos.tse.jus.br/dataset/resultados-2024) |
| Resultados 2022 | [dataset/resultados-2022](https://dadosabertos.tse.jus.br/dataset/resultados-2022) |
| OpenStreetMap | [openstreetmap.org](https://www.openstreetmap.org) |
| Overpass API | [overpass-api.de](https://overpass-api.de) |

---

## Desenvolvimento

### Atualizar dados após o 2º turno de 2026

```bash
# 1. Atualizar dados por zona (sidebar + coloração)
python scripts/download_tse_geral.py 2026

# 2. Atualizar dados por bairro (resolução granular)
python scripts/download_secoes_geral.py 2026

# 3. Commit e push
git add data/tse_cotia_2026.json data/cotia_votos_por_bairro_2026.json
git commit -m "data: atualiza resultados 2026 com 2º turno"
git push
```

### Adicionar um novo ano de eleição geral

1. Execute `python scripts/download_tse_geral.py <ano>` e `download_secoes_geral.py <ano>`
2. Adicione o ano em `js/geral-config.js`:
```js
"2030": {
  label: "2030",
  dataFile: "./data/tse_cotia_2030.json",
  bairroFile: "./data/cotia_votos_por_bairro_2030.json",
  datasetUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2030",
}
```
3. Adicione `<option value="2030">2030</option>` no `<select>` de `eleicao-geral.html`
