#!/usr/bin/env python3
"""
Gastos de campanha 2024 dos candidatos de Cotia/SP (prefeito e vereadores)
e custo por voto de cada um.

Fonte: TSE — Dados Abertos — Prestação de Contas Eleitorais 2024
https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024

Gasto = soma das despesas contratadas declaradas na prestação de contas
final do candidato (VR_DESPESA_CONTRATADA). Também grava as despesas pagas.
Custo por voto = gasto ÷ votos nominais totais do candidato no 1º turno
(data/tse_cotia_2024.json).

Uso:
    python scripts/download_gastos_campanha.py
    GASTOS_ZIP=/caminho/prestacao.zip python scripts/download_gastos_campanha.py   # zip já baixado

Saída: data/gastos_campanha_2024.json
"""

import csv
import io
import json
import os
import sys
import tempfile
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

import requests

ZIP_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2024.zip"
FONTE_URL = "https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024"

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cidades import C, arq  # noqa: E402
TSE_FILE = arq("tse_cotia_2024.json")
DETALHE_FILE = arq("cotia_votos_por_escola_detalhe.json")
OUTPUT_FILE = arq("gastos_campanha_2024.json")

UF = "SP"
MUNICIPIO = C["nome"]
CARGOS = {"PREFEITO": "prefeito", "VEREADOR": "vereadores"}

csv.field_size_limit(10**9)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in s if unicodedata.category(c) != "Mn").upper().strip()


def valor(s: str) -> float:
    s = (s or "").strip()
    if not s:
        return 0.0
    # TSE usa vírgula decimal ("1234,56"); alguns anos trazem ponto de milhar
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def baixar_zip() -> str:
    local = os.environ.get("GASTOS_ZIP")
    if local:
        print(f"Usando zip local: {local}")
        return local
    destino = os.path.join(tempfile.gettempdir(), os.path.basename(ZIP_URL))
    print(f"Baixando {ZIP_URL}")
    with requests.get(ZIP_URL, stream=True, timeout=300) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        lido = 0
        with open(destino, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
                lido += len(chunk)
                if total and lido % (100 << 20) < (1 << 20):
                    print(f"  {lido >> 20} / {total >> 20} MB")
    print(f"  ok: {os.path.getsize(destino) >> 20} MB")
    return destino


def achar_csv(z: zipfile.ZipFile, prefixo: str) -> str | None:
    """Prefere o arquivo da UF; cai para o nacional se não houver."""
    nomes = [n for n in z.namelist() if os.path.basename(n).lower().startswith(prefixo) and n.lower().endswith(".csv")]
    for sufixo in (f"_{UF}.csv", "_BRASIL.csv"):
        for n in nomes:
            if n.upper().endswith(sufixo.upper()):
                return n
    return nomes[0] if nomes else None


def ler_linhas(z: zipfile.ZipFile, nome: str):
    with z.open(nome) as f:
        texto = io.TextIOWrapper(f, encoding="latin-1", newline="")
        yield from csv.DictReader(texto, delimiter=";", quotechar='"')


def eh_cotia(row: dict) -> bool:
    return row.get("SG_UF") == UF and norm(row.get("NM_UE", "")) == MUNICIPIO


def main():
    with open(TSE_FILE, encoding="utf-8") as f:
        totais = json.load(f)["totais"]
    # Nome completo por número (para quem não tem prestação de contas)
    nomes_completos = {}
    if os.path.exists(DETALHE_FILE):
        with open(DETALHE_FILE, encoding="utf-8") as f:
            nomes_completos = json.load(f).get("candidatos", {})

    caminho = baixar_zip()
    with zipfile.ZipFile(caminho) as z:
        csv_contratadas = achar_csv(z, "despesas_contratadas_candidatos")
        csv_pagas = achar_csv(z, "despesas_pagas_candidatos")
        if not csv_contratadas:
            print("ERRO: despesas_contratadas não encontrado no zip:", z.namelist()[:30])
            sys.exit(1)
        print(f"Despesas contratadas: {csv_contratadas}")

        # (cargo, número) -> prestador -> {dt, tp, total, nome}
        prestacoes = defaultdict(dict)
        prestador_cand = {}
        for row in ler_linhas(z, csv_contratadas):
            if not eh_cotia(row):
                continue
            cargo = CARGOS.get(norm(row.get("DS_CARGO", "")))
            if not cargo:
                continue
            chave = (cargo, row["NR_CANDIDATO"].strip())
            sq = row.get("SQ_PRESTADOR_CONTAS", "").strip()
            p = prestacoes[chave].setdefault(sq, {
                "dt": row.get("DT_PRESTACAO_CONTAS", ""),
                "tp": norm(row.get("TP_PRESTACAO_CONTAS", "")),
                "nome": row.get("NM_CANDIDATO", "").strip(),
                "contratadas": 0.0,
                "pagas": 0.0,
                "n": 0,
            })
            p["contratadas"] += valor(row.get("VR_DESPESA_CONTRATADA"))
            p["n"] += 1
            prestador_cand[sq] = chave

        if csv_pagas:
            print(f"Despesas pagas: {csv_pagas}")
            for row in ler_linhas(z, csv_pagas):
                sq = row.get("SQ_PRESTADOR_CONTAS", "").strip()
                chave = prestador_cand.get(sq)
                if chave is None:
                    continue
                prestacoes[chave][sq]["pagas"] += valor(row.get("VR_PAGTO_DESPESA"))

    def data_br(s):
        try:
            return datetime.strptime(s, "%d/%m/%Y")
        except ValueError:
            return datetime.min

    def escolher(prest: dict) -> dict:
        """Usa a prestação final mais recente; sem final, a mais recente."""
        lista = list(prest.values())
        finais = [p for p in lista if "FINAL" in p["tp"]] or lista
        return max(finais, key=lambda p: data_br(p["dt"]))

    candidatos = []
    encontrados = 0
    for cargo in ("prefeito", "vereadores"):
        for c in totais.get(cargo, {}).get("1", []):
            numero = str(c["numero"])
            prest = prestacoes.get((cargo, numero))
            item = {
                "cargo": cargo,
                "numero": numero,
                "nome": c["nome"],
                "nome_completo": nomes_completos.get(cargo, {}).get(numero),
                "partido": c.get("partido", ""),
                "situacao": c.get("situacao", ""),
                "votos": c["votos"],
                "despesas_contratadas": None,
                "despesas_pagas": None,
                "custo_por_voto": None,
            }
            if prest:
                encontrados += 1
                p = escolher(prest)
                item["nome_completo"] = p["nome"]
                item["despesas_contratadas"] = round(p["contratadas"], 2)
                item["despesas_pagas"] = round(p["pagas"], 2) if csv_pagas else None
                if c["votos"] > 0:
                    item["custo_por_voto"] = round(p["contratadas"] / c["votos"], 2)
            candidatos.append(item)

    print(f"Candidatos com prestação de contas: {encontrados} de {len(candidatos)}")
    if encontrados == 0:
        print("ERRO: nenhum candidato de Cotia encontrado — arquivo não gravado.")
        sys.exit(1)

    saida = {
        "fonte": "TSE — Dados Abertos — Prestação de Contas Eleitorais 2024",
        "fonte_url": FONTE_URL,
        "arquivo": os.path.basename(ZIP_URL),
        "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "municipio": MUNICIPIO,
        "uf": UF,
        "metodo": "custo_por_voto = despesas_contratadas ÷ votos nominais do 1º turno",
        "candidatos": candidatos,
    }
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
    print(f"Gravado: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
