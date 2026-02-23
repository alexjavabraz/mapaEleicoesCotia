# Mapa Eleitoral de Cotia 2024

Aplicação web interativa que exibe os resultados eleitorais de 2024 (Prefeito e Vereadores) para o município de Cotia/SP, organizados por zona eleitoral e bairro.

## Funcionalidades

- Mapa interativo da cidade de Cotia com bairros coloridos por zona eleitoral
- Dados de votação por zona eleitoral (Prefeito e Vereadores — 1º e 2º turno)
- Hover e clique em bairros para ver resultados eleitorais da zona
- Barra de votos proporcional com indicação de eleitos/suplentes
- Fonte: [TSE Dados Abertos — Eleições 2024](https://dadosabertos.tse.jus.br/dataset/resultados-2024)
- Limites geográficos: [OpenStreetMap / Overpass API](https://overpass-api.de)

## Como usar

### 1. Baixar dados do TSE

```bash
cd scripts
pip install -r requirements.txt
python download_tse.py
```

O script irá:
- Baixar `votacao_candidato_munzona_2024_SP.zip` do TSE (~300MB)
- Filtrar apenas os dados de Cotia
- Salvar em `data/tse_cotia_2024.json`

### 2. Iniciar servidor local

> ⚠️ **Importante:** Abrir `index.html` diretamente como `file://` causa erros de CORS.
> Use um servidor HTTP local:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# ou qualquer outro servidor HTTP
```

### 3. Acessar

Abra [http://localhost:8080](http://localhost:8080) no navegador.

## Estrutura

```
mapaEleicoesCotia/
├── index.html              # Aplicação principal
├── css/
│   └── style.css           # Estilos (tema escuro)
├── js/
│   ├── app.js              # Lógica principal
│   ├── map.js              # Mapa Leaflet + Overpass API
│   └── tse.js              # Carregamento e renderização dos dados TSE
├── scripts/
│   ├── download_tse.py     # Script de download dos dados TSE
│   └── requirements.txt    # Dependências Python
├── data/
│   └── tse_cotia_2024.json # Gerado pelo script (não versionado)
└── README.md
```

## Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript puro (sem framework)
- **Mapa:** [Leaflet.js](https://leafletjs.com) com tiles CartoDB Dark Matter
- **Geodados:** [Overpass API](https://overpass-api.de) (OpenStreetMap)
- **Conversão OSM→GeoJSON:** [osmtogeojson](https://github.com/tyrasd/osmtogeojson)
- **Dados eleitorais:** [TSE Dados Abertos](https://dadosabertos.tse.jus.br)

## Zonas Eleitorais de Cotia — Eleições 2024

| Zona | Área | Eleitores aprox. |
|------|------|-----------------|
| 227  | Cotia sede (Centro) + Granja Viana + bairros urbanos/suburbanos | ~78k votos (prefeito) |
| 286  | Caucaia do Alto + região rural periférica | ~46k votos (prefeito) |

**Prefeito eleito:** WELINGTON FORMIGA (PDT)
Fonte: TSE Dados Abertos — Eleições Municipais 2024

## Dados utilizados

- **Arquivo TSE:** `votacao_candidato_munzona_2024_SP.csv`
- **Filtro:** `NM_MUNICIPIO = 'COTIA'`
- **Eleição:** Municipal 2024 (1º turno: 06/10/2024, 2º turno: 27/10/2024)
