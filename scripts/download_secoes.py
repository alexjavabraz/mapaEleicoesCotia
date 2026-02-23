#!/usr/bin/env python3
"""
Script para baixar dados de votação por seção e agregá-los por bairro para Cotia/SP.

Fonte: https://dadosabertos.tse.jus.br/dataset/resultados-2024
Arquivo: votacao_secao_2024_SP.zip (~475 MB)

Uso:
    pip install -r requirements.txt
    python download_secoes.py

Saída: ../data/cotia_votos_por_bairro.json
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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(SCRIPT_DIR, "..", "data")
LOCAIS_FILE = os.path.join(DATA_DIR, "cotia_locais_votacao.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "cotia_votos_por_bairro.json")


def build_secao_bairro_map():
    """Constrói mapeamento (zona, secao) -> bairro a partir dos locais de votação."""
    if not os.path.exists(LOCAIS_FILE):
        print(f"ERRO: Arquivo de locais não encontrado: {LOCAIS_FILE}")
        print("Execute primeiro: python download_tse.py")
        sys.exit(1)

    with open(LOCAIS_FILE, encoding="utf-8") as f:
        locais = json.load(f)

    mapa = {}
    for local in locais:
        zona  = str(local.get("NR_ZONA") or local.get("zona") or "").strip()
        secao = str(local.get("NR_SECAO") or local.get("secao") or "").strip()
        bairro = (local.get("NM_BAIRRO") or local.get("bairro") or "").strip().upper()
        if zona and secao and bairro:
            mapa[(zona, secao)] = bairro

    print(f"Mapeamento: {len(mapa)} seções → bairros carregados.")
    return mapa


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


def process_zip(zip_path, secao_bairro):
    """Lê o CSV dentro do ZIP e agrega votos por (bairro, cargo, candidato)."""
    # Estrutura: { bairro: { "vereadores": {nome: votos}, "prefeito": {nome: votos} } }
    agregado = defaultdict(lambda: {"prefeito": defaultdict(int), "vereadores": defaultdict(int)})

    with zipfile.ZipFile(zip_path, "r") as zf:
        # Processa apenas o arquivo _SP.csv (evita duplicar com _BRASIL.csv)
        csv_names = [n for n in zf.namelist() if n.endswith("_SP.csv") or n.lower().endswith(".csv")]
        # Preferir arquivo específico do SP
        sp_files = [n for n in csv_names if "_SP" in n.upper()]
        target_files = sp_files if sp_files else csv_names

        for csv_name in target_files:
            print(f"Processando: {csv_name}")
            with zf.open(csv_name) as raw:
                reader = csv.DictReader(
                    io.TextIOWrapper(raw, encoding="latin-1"),
                    delimiter=";",
                )
                rows_processed = 0
                rows_cotia = 0
                for row in reader:
                    rows_processed += 1
                    if rows_processed % 500_000 == 0:
                        print(f"  Lidas {rows_processed:,} linhas, {rows_cotia:,} de Cotia...")

                    # Filtra por município de Cotia
                    if row.get("CD_MUNICIPIO", "").strip() != CD_MUNICIPIO_COTIA:
                        continue

                    cd_cargo = row.get("CD_CARGO", "").strip()
                    if cd_cargo not in CARGOS:
                        continue

                    cargo_key = CARGOS[cd_cargo]

                    zona  = row.get("NR_ZONA",  "").strip()
                    secao = row.get("NR_SECAO", "").strip()
                    bairro = secao_bairro.get((zona, secao))
                    if not bairro:
                        continue

                    nome_cand = row.get("NM_VOTAVEL", "").strip().upper()
                    votos_str = row.get("QT_VOTOS", "0").strip().replace(",", "")
                    try:
                        votos = int(votos_str)
                    except ValueError:
                        votos = 0

                    if nome_cand and votos > 0:
                        agregado[bairro][cargo_key][nome_cand] += votos
                        rows_cotia += 1

                print(f"  Total: {rows_processed:,} linhas, {rows_cotia:,} votos de Cotia registrados.")

    return agregado


def build_output(agregado):
    """Converte estrutura interna para o formato de saída JSON."""
    resultado = {}
    for bairro, cargos in sorted(agregado.items()):
        resultado[bairro] = {}
        for cargo_key, candidatos in cargos.items():
            # Ordena por votos decrescente
            lista = sorted(
                [{"nome": nome, "votos": v} for nome, v in candidatos.items()],
                key=lambda x: -x["votos"],
            )
            resultado[bairro][cargo_key] = lista
    return resultado


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # 1. Constrói mapeamento seção → bairro
    secao_bairro = build_secao_bairro_map()
    if not secao_bairro:
        print("Nenhum mapeamento de seções encontrado. Abortando.")
        sys.exit(1)

    # 2. Download do ZIP em arquivo temporário
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        download_zip(URL_SECAO, tmp_path)

        # 3. Processa CSV dentro do ZIP
        print("Processando dados de votação por seção...")
        agregado = process_zip(tmp_path, secao_bairro)

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if not agregado:
        print("AVISO: Nenhum dado encontrado para Cotia. Verifique o CD_MUNICIPIO.")
        sys.exit(1)

    # 4. Salva resultado
    resultado = build_output(agregado)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\nSalvo: {OUTPUT_FILE}")
    print(f"  {len(resultado)} bairros")
    total_cand = sum(
        len(c.get("vereadores", [])) for c in resultado.values()
    )
    print(f"  ~{total_cand} registros de vereadores (total)")


if __name__ == "__main__":
    main()
