#!/usr/bin/env python3
"""
Locais de votação (escolas) da cidade escolhida em CIDADE, um registro por
seção, com bairro e coordenadas: o mesmo formato de data/cotia_locais_votacao.json
(linhas do eleitorado_local_votacao do TSE, sem alteração).

Uso:
    CIDADE=vgp python download_locais.py      # grava data/vgp/locais_votacao.json

Fonte: https://dadosabertos.tse.jus.br/dataset/eleitorado-2024
(cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/).
"""

import csv
import io
import json
import os
import sys
import tempfile
import zipfile

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cidades import C, arq  # noqa: E402

ANO = os.environ.get("ANO_LOCAIS", "2024")
URL = ("https://cdn.tse.jus.br/estatistica/sead/odsele/eleitorado_locais_votacao/"
       f"eleitorado_local_votacao_{ANO}.zip")
SAIDA = arq("cotia_locais_votacao.json")


def main():
    destino = os.path.join(tempfile.gettempdir(), os.path.basename(URL))
    print(f"Baixando {URL}")
    with requests.get(URL, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for parte in r.iter_content(1 << 20):
                f.write(parte)

    linhas = []
    with zipfile.ZipFile(destino) as z:
        csvs = [n for n in z.namelist() if n.lower().endswith(".csv")]
        nome = next((n for n in csvs if n.upper().endswith("_SP.CSV")), None) or csvs[0]
        print(f"Lendo {nome}")
        with z.open(nome) as f:
            for row in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";"):
                if row.get("CD_MUNICIPIO", "").strip() != C["tse"]:
                    continue
                # Uma linha por seção: só o 1º turno (o 2º repete as mesmas seções)
                if row.get("NR_TURNO", "1").strip() not in ("", "1"):
                    continue
                linhas.append({k: (v or "").strip() for k, v in row.items()})
    os.remove(destino)
    if not linhas:
        raise SystemExit(f"Nenhuma seção com CD_MUNICIPIO {C['tse']} — nada gravado.")

    linhas.sort(key=lambda l: (int(l["NR_ZONA"] or 0), int(l["NR_SECAO"] or 0)))
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(linhas, f, ensure_ascii=False, indent=2)
    locais = {l["NR_LOCAL_VOTACAO"] for l in linhas}
    bairros = {l["NM_BAIRRO"] for l in linhas}
    print(f"Gravado {SAIDA}: {len(linhas)} seções, {len(locais)} locais, {len(bairros)} bairros")


if __name__ == "__main__":
    main()
