"""
Cidades do portal. Os scripts de download escolhem a cidade pela variável de
ambiente CIDADE (padrão "cotia"):

    CIDADE=vgp python scripts/download_contas.py

Os arquivos de Cotia ficam em data/ com os nomes de sempre; os das outras
cidades em data/<cidade>/, sem o "cotia" no nome (tse_cotia_2024.json →
data/vgp/tse_2024.json). A mesma regra está em urlDados() de js/i18n.js.
"""

import os
import re

CIDADES = {
    "cotia": {
        "nome": "COTIA",                    # NM_MUNICIPIO no TSE
        "titulo": "Cotia",
        "tse": "63614",                     # CD_MUNICIPIO / SG_UE no TSE
        "ibge": "3513009",
        "tce": "cotia",                     # slug na API do TCE-SP
        "osm": "Cotia",
    },
    "vgp": {
        "nome": "VARGEM GRANDE PAULISTA",
        "titulo": "Vargem Grande Paulista",
        "tse": "72737",
        "ibge": "3556453",
        "tce": "vargem-grande-paulista",
        "osm": "Vargem Grande Paulista",
    },
}

CIDADE = os.environ.get("CIDADE", "cotia").strip().lower() or "cotia"
if CIDADE not in CIDADES:
    raise SystemExit(f"CIDADE desconhecida: {CIDADE} (use {', '.join(CIDADES)})")
C = CIDADES[CIDADE]

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def nome_arquivo_de(cidade, nome):
    """Nome do arquivo de Cotia → caminho relativo a data/ na `cidade`."""
    if cidade == "cotia":
        return nome
    return cidade + "/" + re.sub(r"_cotia|cotia_", "", nome, count=1)


def nome_arquivo(nome):
    """Nome do arquivo de Cotia → caminho relativo a data/ na cidade atual."""
    return nome_arquivo_de(CIDADE, nome)


def arq(nome):
    """Caminho absoluto em data/ do arquivo `nome` (nome usado em Cotia)."""
    return os.path.join(DATA_DIR, nome_arquivo(nome))
