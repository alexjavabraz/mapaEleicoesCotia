#!/usr/bin/env python3
"""
Script para baixar dados de votação por seção e agregá-los por bairro e por
local de votação (escola) para Cotia/SP.

Fonte: https://dadosabertos.tse.jus.br/dataset/resultados-2024
Arquivo: votacao_secao_2024_SP.zip (~475 MB)

Uso:
    pip install -r requirements.txt
    python download_secoes.py

Saída:
  ../data/cotia_votos_por_bairro.json   — votos por bairro (prefeito + vereadores)
  ../data/cotia_votos_por_escola.json   — votos totais de prefeito por escola
"""

import csv
import io
import json
import os
import sys
import tempfile
import zipfile
from collections import defaultdict

try:
    import requests
    from tqdm import tqdm
except ImportError:
    print("Dependências faltando. Execute: pip install -r requirements.txt")
    sys.exit(1)

# URL do arquivo de votação por seção do estado de SP (2024)
URL_SECAO = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/"
    "votacao_secao_2024_SP.zip"
)

# Código do município de Cotia no TSE
CD_MUNICIPIO_COTIA = "63614"

# Cargos de interesse
CARGOS = {
    "11": "prefeito",   # Prefeito
    "13": "vereadores", # Vereador
}

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR     = os.path.join(SCRIPT_DIR, "..", "data")
LOCAIS_FILE  = os.path.join(DATA_DIR, "cotia_locais_votacao.json")
OUTPUT_BAIRRO = os.path.join(DATA_DIR, "cotia_votos_por_bairro.json")
OUTPUT_ESCOLA = os.path.join(DATA_DIR, "cotia_votos_por_escola.json")


def build_maps():
    """
    Constrói dois mapeamentos a partir de cotia_locais_votacao.json:
      secao_bairro: (zona, secao) -> nome do bairro
      secao_escola: (zona, secao) -> nr_local_votacao
    Também retorna metadados das escolas (nome, bairro, zona).
    """
    if not os.path.exists(LOCAIS_FILE):
        print(f"ERRO: Arquivo de locais não encontrado: {LOCAIS_FILE}")
        print("Execute primeiro: python download_tse.py")
        sys.exit(1)

    with open(LOCAIS_FILE, encoding="utf-8") as f:
        locais = json.load(f)

    secao_bairro = {}
    secao_escola = {}
    escola_meta  = {}   # nr_local -> {nome, bairro, zona}

    for local in locais:
        zona   = str(local.get("NR_ZONA",  "")).strip()
        secao  = str(local.get("NR_SECAO", "")).strip()
        bairro = (local.get("NM_BAIRRO", "") or "").strip().upper()
        nr     = str(local.get("NR_LOCAL_VOTACAO", "")).strip()
        nome   = (local.get("NM_LOCAL_VOTACAO", "") or "").strip()

        if zona and secao and bairro:
            secao_bairro[(zona, secao)] = bairro
        if zona and secao and nr:
            secao_escola[(zona, secao)] = nr
        if nr and nr not in escola_meta:
            escola_meta[nr] = {"nr": nr, "nome": nome, "bairro": bairro, "zona": zona}

    print(f"Mapeamento: {len(secao_bairro)} seções → bairros, "
          f"{len(secao_escola)} seções → escolas ({len(escola_meta)} escolas únicas).")
    return secao_bairro, secao_escola, escola_meta


def download_zip(url, dest_path):
    """Faz download com barra de progresso."""
    print(f"Baixando {url} ...")
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()

    total = int(r.headers.get("content-length", 0))
    with open(dest_path, "wb") as f, tqdm(
        total=total,
        unit="B",
        unit_scale=True,
        unit_divisor=1024,
        desc="Download",
    ) as bar:
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
                bar.update(len(chunk))

    print(f"Download concluído: {os.path.getsize(dest_path) / 1e6:.1f} MB")


def process_zip(zip_path, secao_bairro, secao_escola):
    """
    Lê o CSV dentro do ZIP e agrega votos:
      - por bairro (prefeito + vereadores)
      - por escola — total de votos válidos ao prefeito (CD_CARGO=11)
    """
    # { bairro: { cargo: { nome: votos } } }
    agr_bairro = defaultdict(lambda: {
        "prefeito":   defaultdict(int),
        "vereadores": defaultdict(int),
    })
    # { nr_local: total_votos_prefeito }
    agr_escola = defaultdict(int)

    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_names = [n for n in zf.namelist() if n.endswith("_SP.csv") or n.lower().endswith(".csv")]
        sp_files  = [n for n in csv_names if "_SP" in n.upper()]
        target    = sp_files if sp_files else csv_names

        for csv_name in target:
            print(f"Processando: {csv_name}")
            with zf.open(csv_name) as raw:
                reader = csv.DictReader(
                    io.TextIOWrapper(raw, encoding="latin-1"),
                    delimiter=";",
                )
                n_total = n_cotia = 0
                for row in reader:
                    n_total += 1
                    if n_total % 500_000 == 0:
                        print(f"  Lidas {n_total:,} linhas, {n_cotia:,} de Cotia...")

                    if row.get("CD_MUNICIPIO", "").strip() != CD_MUNICIPIO_COTIA:
                        continue

                    cd_cargo = row.get("CD_CARGO", "").strip()
                    if cd_cargo not in CARGOS:
                        continue

                    zona  = row.get("NR_ZONA",  "").strip()
                    secao = row.get("NR_SECAO", "").strip()

                    votos_str = row.get("QT_VOTOS", "0").strip().replace(",", "")
                    try:
                        votos = int(votos_str)
                    except ValueError:
                        votos = 0

                    nome_cand = row.get("NM_VOTAVEL", "").strip().upper()

                    # Agrega por bairro
                    bairro = secao_bairro.get((zona, secao))
                    if bairro and nome_cand and votos > 0:
                        agr_bairro[bairro][CARGOS[cd_cargo]][nome_cand] += votos
                        n_cotia += 1

                    # Agrega total de votos de prefeito por escola
                    if cd_cargo == "11" and votos > 0:
                        nr = secao_escola.get((zona, secao))
                        if nr:
                            agr_escola[nr] += votos

                print(f"  Total: {n_total:,} linhas, {n_cotia:,} votos de Cotia registrados.")

    return agr_bairro, agr_escola


def build_bairro_output(agr_bairro):
    """Converte agregado de bairros para o formato de saída JSON."""
    resultado = {}
    for bairro, cargos in sorted(agr_bairro.items()):
        resultado[bairro] = {}
        for cargo_key, candidatos in cargos.items():
            lista = sorted(
                [{"nome": nome, "votos": v} for nome, v in candidatos.items()],
                key=lambda x: -x["votos"],
            )
            resultado[bairro][cargo_key] = lista
    return resultado


def build_escola_output(agr_escola, escola_meta):
    """
    Constrói o JSON de votos por escola:
      { nr_local: { nr, nome, bairro, zona, votos_prefeito } }
    """
    resultado = {}
    for nr, total in sorted(agr_escola.items(), key=lambda x: x[0]):
        meta = escola_meta.get(nr, {})
        resultado[nr] = {
            "nr":             nr,
            "nome":           meta.get("nome", ""),
            "bairro":         meta.get("bairro", ""),
            "zona":           meta.get("zona", ""),
            "votos_prefeito": total,
        }
    return resultado


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Constrói mapeamentos seção → bairro e seção → escola
    secao_bairro, secao_escola, escola_meta = build_maps()
    if not secao_bairro:
        print("Nenhum mapeamento de seções encontrado. Abortando.")
        sys.exit(1)

    # 2. Download do ZIP em arquivo temporário
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        download_zip(URL_SECAO, tmp_path)

        # 3. Processa CSV
        print("Processando dados de votação por seção...")
        agr_bairro, agr_escola = process_zip(tmp_path, secao_bairro, secao_escola)

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if not agr_bairro:
        print("AVISO: Nenhum dado encontrado para Cotia. Verifique o CD_MUNICIPIO.")
        sys.exit(1)

    # 4. Salva cotia_votos_por_bairro.json
    res_bairro = build_bairro_output(agr_bairro)
    with open(OUTPUT_BAIRRO, "w", encoding="utf-8") as f:
        json.dump(res_bairro, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo: {OUTPUT_BAIRRO}  ({len(res_bairro)} bairros)")

    # 5. Salva cotia_votos_por_escola.json
    res_escola = build_escola_output(agr_escola, escola_meta)
    total_votos_escolas = sum(e["votos_prefeito"] for e in res_escola.values())
    with open(OUTPUT_ESCOLA, "w", encoding="utf-8") as f:
        json.dump(res_escola, f, ensure_ascii=False, indent=2)
    print(f"Salvo: {OUTPUT_ESCOLA}  ({len(res_escola)} escolas, "
          f"{total_votos_escolas:,} votos prefeito)")


if __name__ == "__main__":
    main()
