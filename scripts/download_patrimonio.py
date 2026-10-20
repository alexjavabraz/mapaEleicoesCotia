#!/usr/bin/env python3
"""
Patrimônio declarado (bens) dos candidatos de Cotia/SP em 2024 (prefeito e
vereadores), com o link de cada um no DivulgaCandContas do TSE.

Fontes: TSE — Dados Abertos — Candidatos 2024
https://dadosabertos.tse.jus.br/dataset/candidatos-2024
  - consulta_cand_2024.zip  (SQ_CANDIDATO, número, cargo, município)
  - bem_candidato_2024.zip  (bens declarados por SQ_CANDIDATO)

Uso:
    python scripts/download_patrimonio.py
    CAND_ZIP=... BENS_ZIP=... python scripts/download_patrimonio.py   # zips já baixados

Saída: data/patrimonio_candidatos_2024.json
"""

import json
import os
import sys
import tempfile
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

import requests

from download_gastos_campanha import UF, MUNICIPIO, CARGOS, norm, valor, achar_csv, ler_linhas

CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2024.zip"
BENS_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2024.zip"
FONTE_URL = "https://dadosabertos.tse.jus.br/dataset/candidatos-2024"
# Página do candidato: /candidato/{região}/{UF}/{eleição}/{SQ_CANDIDATO}/{ano}/{código do município}
# O código da eleição no DivulgaCandContas (2045202024 = municipais 2024) não é o CD_ELEICAO dos dados abertos (619).
DIVULGA_URL = "https://divulgacandcontas.tse.jus.br/divulga/#/candidato/SUDESTE/{uf}/2045202024/{sq}/2024/{ue}"

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TSE_FILE = os.path.join(BASE, "data", "tse_cotia_2024.json")
OUTPUT_FILE = os.path.join(BASE, "data", "patrimonio_candidatos_2024.json")


def baixar(url: str, env: str) -> str:
    local = os.environ.get(env)
    if local:
        print(f"Usando zip local: {local}")
        return local
    destino = os.path.join(tempfile.gettempdir(), os.path.basename(url))
    print(f"Baixando {url}")
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    print(f"  ok: {os.path.getsize(destino) >> 20} MB")
    return destino


def main():
    with open(TSE_FILE, encoding="utf-8") as f:
        totais = json.load(f)["totais"]

    # (cargo, número) -> dados do candidato em Cotia
    cands = {}
    with zipfile.ZipFile(baixar(CAND_URL, "CAND_ZIP")) as z:
        nome = achar_csv(z, "consulta_cand")
        print(f"Candidatos: {nome}")
        for row in ler_linhas(z, nome):
            if row.get("SG_UF") != UF or norm(row.get("NM_UE", "")) != MUNICIPIO:
                continue
            cargo = CARGOS.get(norm(row.get("DS_CARGO", "")))
            if not cargo:
                continue
            cands[(cargo, row["NR_CANDIDATO"].strip())] = {
                "sq": row["SQ_CANDIDATO"].strip(),
                "ue": row.get("SG_UE", "").strip(),
                "nome_completo": row.get("NM_CANDIDATO", "").strip(),
            }
    print(f"  {len(cands)} candidatos de Cotia")

    sqs = {c["sq"] for c in cands.values()}
    bens = defaultdict(lambda: {"total": 0.0, "n": 0})
    with zipfile.ZipFile(baixar(BENS_URL, "BENS_ZIP")) as z:
        nome = achar_csv(z, "bem_candidato")
        print(f"Bens: {nome}")
        for row in ler_linhas(z, nome):
            sq = row.get("SQ_CANDIDATO", "").strip()
            if sq not in sqs:
                continue
            bens[sq]["total"] += valor(row.get("VR_BEM_CANDIDATO"))
            bens[sq]["n"] += 1

    candidatos = []
    for cargo in ("prefeito", "vereadores"):
        for c in totais.get(cargo, {}).get("1", []):
            numero = str(c["numero"])
            info = cands.get((cargo, numero))
            if not info:
                continue
            b = bens.get(info["sq"])
            candidatos.append({
                "cargo": cargo,
                "numero": numero,
                "nome": c["nome"],
                "nome_completo": info["nome_completo"],
                "sq_candidato": info["sq"],
                "patrimonio": round(b["total"], 2) if b else 0.0,
                "bens": b["n"] if b else 0,
                "url_tse": DIVULGA_URL.format(uf=UF, sq=info["sq"], ue=info["ue"]),
            })

    print(f"Candidatos com dados: {len(candidatos)}; com bens declarados: {sum(1 for c in candidatos if c['bens'])}")
    if not candidatos:
        print("ERRO: nenhum candidato de Cotia encontrado — arquivo não gravado.")
        sys.exit(1)

    saida = {
        "fonte": "TSE — Dados Abertos — Candidatos 2024 (bens declarados)",
        "fonte_url": FONTE_URL,
        "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "municipio": MUNICIPIO,
        "uf": UF,
        "candidatos": candidatos,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
    print(f"Gravado: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
