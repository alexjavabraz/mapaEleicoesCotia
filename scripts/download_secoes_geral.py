#!/usr/bin/env python3
"""
Script para baixar dados de votação por seção das Eleições Gerais e
agregá-los por bairro para Cotia/SP.

Cargos: Governador, Senador, Deputado Federal, Deputado Estadual (arquivo SP)
        Presidente (arquivo BR — nacional)

Uso:
    pip install -r requirements.txt
    python download_secoes_geral.py 2026
    python download_secoes_geral.py 2022

Fontes:
    https://dadosabertos.tse.jus.br/dataset/resultados-2026
    Arquivo SP: votacao_secao_<ano>_SP.zip  (~767 MB em 2026)
    Arquivo BR: votacao_secao_<ano>_BR.zip  (~154 MB em 2026)

Saída:
    ../data/cotia_votos_por_bairro_<ano>.json
    — para cada bairro: votos por cargo (presidente, governador, senador,
      dep_federal, dep_estadual), ordenados por votos desc.
      Inclui apenas candidatos nominais (exclui brancos/nulos).

Requer:
    ../data/cotia_locais_votacao.json  (gerado por download_tse.py)
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

CD_MUNICIPIO_COTIA = "63614"

# CD_CARGO → chave interna usada no JSON de saída
CARGOS_SP = {
    "3": "governador",
    "5": "senador",
    "6": "dep_federal",
    "7": "dep_estadual",
}
CARGOS_BR = {
    "1": "presidente",
}

# NR_VOTAVEL especiais que devem ser ignorados
VOTOS_ESPECIAIS = {"95", "96", "97", "98", "99"}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(SCRIPT_DIR, "..", "data")
LOCAIS_FILE = os.path.join(DATA_DIR, "cotia_locais_votacao.json")


def build_secao_bairro_map():
    """Carrega cotia_locais_votacao.json e monta (zona, secao) → bairro."""
    if not os.path.exists(LOCAIS_FILE):
        print(f"ERRO: {LOCAIS_FILE} não encontrado.")
        print("Execute primeiro: python download_tse.py")
        sys.exit(1)

    with open(LOCAIS_FILE, encoding="utf-8") as f:
        locais = json.load(f)

    mapa = {}
    for l in locais:
        zona  = str(l.get("NR_ZONA", "")).strip()
        secao = str(l.get("NR_SECAO", "")).strip()
        bairro = (l.get("NM_BAIRRO", "") or "").strip().upper()
        if zona and secao and bairro:
            mapa[(zona, secao)] = bairro

    print(f"Mapeamento seção→bairro: {len(mapa)} seções, "
          f"{len(set(mapa.values()))} bairros únicos.")
    return mapa


def download_zip(url: str, dest_path: str):
    """Baixa um ZIP com barra de progresso."""
    print(f"\nBaixando: {url}")
    r = requests.get(url, stream=True, timeout=300)
    r.raise_for_status()

    total = int(r.headers.get("content-length", 0))
    with open(dest_path, "wb") as f, tqdm(
        total=total, unit="B", unit_scale=True, unit_divisor=1024, desc="Download"
    ) as bar:
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
                bar.update(len(chunk))

    print(f"Download: {os.path.getsize(dest_path) / 1e6:.1f} MB")


def process_zip(zip_path: str, cargos_map: dict, secao_bairro: dict, ano: str):
    """
    Processa um ZIP de votação por seção, filtra Cotia e agrega por bairro.
    Retorna: { bairro: { cargo_key: { nome_candidato: votos } } }
    """
    # { bairro: { cargo_key: { nome: votos } } }
    agr = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_files = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        # Exclui BRASIL (rollup nacional duplicado)
        csv_files = [n for n in csv_files if "BRASIL" not in n.upper()]
        print(f"  Arquivos CSV no ZIP: {csv_files}")

        for csv_name in csv_files:
            print(f"  Lendo {csv_name}...")
            with zf.open(csv_name) as raw:
                reader = csv.DictReader(
                    io.TextIOWrapper(raw, encoding="latin-1"),
                    delimiter=";",
                )
                n_total = n_cotia = n_mapeadas = 0
                for row in reader:
                    n_total += 1
                    if n_total % 1_000_000 == 0:
                        print(f"    {n_total:,} linhas lidas, "
                              f"{n_cotia:,} de Cotia, {n_mapeadas:,} mapeadas...")

                    if row.get("CD_MUNICIPIO", "").strip() != CD_MUNICIPIO_COTIA:
                        continue

                    n_cotia += 1
                    cd_cargo = row.get("CD_CARGO", "").strip()
                    cargo_key = cargos_map.get(cd_cargo)
                    if not cargo_key:
                        continue

                    nr_votavel = row.get("NR_VOTAVEL", "").strip()
                    if nr_votavel in VOTOS_ESPECIAIS:
                        continue

                    zona  = row.get("NR_ZONA", "").strip()
                    secao = row.get("NR_SECAO", "").strip()
                    bairro = secao_bairro.get((zona, secao))
                    if not bairro:
                        continue

                    nome = row.get("NM_VOTAVEL", "").strip()
                    votos = int(row.get("QT_VOTOS", "0").strip() or 0)
                    if nome and votos > 0:
                        agr[bairro][cargo_key][nome] += votos
                        n_mapeadas += 1

                print(f"    Total: {n_total:,} | Cotia: {n_cotia:,} | "
                      f"Mapeadas p/ bairro: {n_mapeadas:,}")

    return agr


def merge(agr_sp, agr_br):
    """Junta os dados do arquivo SP e BR num único dicionário."""
    resultado = dict(agr_sp)
    for bairro, cargos in agr_br.items():
        if bairro not in resultado:
            resultado[bairro] = {}
        for cargo_key, candidatos in cargos.items():
            if cargo_key not in resultado[bairro]:
                resultado[bairro][cargo_key] = defaultdict(int)
            for nome, votos in candidatos.items():
                resultado[bairro][cargo_key][nome] += votos
    return resultado


def build_output(agr, ano: str):
    """
    Converte o agregado para o formato final JSON.
    Cada cargo vira uma lista ordenada por votos desc.
    Também calcula totais por cargo por bairro e os totais gerais.
    """
    # Ordem de cargos na saída
    ORDEM_CARGOS = ["presidente", "governador", "senador", "dep_federal", "dep_estadual"]

    bairros_out = {}
    totais = defaultdict(lambda: defaultdict(int))  # cargo → nome → votos

    for bairro in sorted(agr.keys()):
        bairros_out[bairro] = {}
        for cargo_key in ORDEM_CARGOS:
            candidatos_dict = agr[bairro].get(cargo_key, {})
            if not candidatos_dict:
                continue
            lista = sorted(
                [{"nome": n, "votos": v} for n, v in candidatos_dict.items()],
                key=lambda x: -x["votos"],
            )
            bairros_out[bairro][cargo_key] = lista
            # Acumula totais
            for item in lista:
                totais[cargo_key][item["nome"]] += item["votos"]

    # Totais ordenados
    totais_out = {}
    for cargo_key in ORDEM_CARGOS:
        if cargo_key in totais:
            totais_out[cargo_key] = sorted(
                [{"nome": n, "votos": v} for n, v in totais[cargo_key].items()],
                key=lambda x: -x["votos"],
            )

    return {
        "ano": int(ano),
        "municipio": "COTIA",
        "cargos": ORDEM_CARGOS,
        "bairros": bairros_out,
        "totais": totais_out,
    }


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("2022", "2026"):
        print("Uso: python download_secoes_geral.py <2022|2026>")
        sys.exit(1)

    ano = sys.argv[1]
    output_file = os.path.join(DATA_DIR, f"cotia_votos_por_bairro_{ano}.json")

    print("=" * 60)
    print(f"DOWNLOADER ELEIÇÃO GERAL {ano} — VOTOS POR BAIRRO — COTIA/SP")
    print("=" * 60)

    # 1. Mapeamento seção → bairro (reusa cotia_locais_votacao.json)
    secao_bairro = build_secao_bairro_map()

    url_sp = (
        f"https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/"
        f"votacao_secao_{ano}_SP.zip"
    )
    url_br = (
        f"https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/"
        f"votacao_secao_{ano}_BR.zip"
    )

    tmp_sp = tempfile.mktemp(suffix=f"_secao_{ano}_SP.zip")
    tmp_br = tempfile.mktemp(suffix=f"_secao_{ano}_BR.zip")

    try:
        # 2. Baixa e processa arquivo SP (Governador, Senador, Dep. Federal, Dep. Estadual)
        print(f"\n[1/2] Arquivo SP — cargos estaduais")
        download_zip(url_sp, tmp_sp)
        agr_sp = process_zip(tmp_sp, CARGOS_SP, secao_bairro, ano)

        # 3. Baixa e processa arquivo BR (Presidente)
        print(f"\n[2/2] Arquivo BR — Presidente")
        download_zip(url_br, tmp_br)
        agr_br = process_zip(tmp_br, CARGOS_BR, secao_bairro, ano)

    finally:
        for p in (tmp_sp, tmp_br):
            if os.path.exists(p):
                os.unlink(p)

    # 4. Mescla e gera output
    agr = merge(agr_sp, agr_br)
    resultado = build_output(agr, ano)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    tamanho = os.path.getsize(output_file) / 1024
    print(f"\n{'=' * 60}")
    print(f"Salvo: {output_file}  ({tamanho:.0f} KB)")
    print(f"Bairros: {len(resultado['bairros'])}")
    print(f"Cargos: {resultado['cargos']}")
    print()
    print("Resumo por bairro (amostra):")
    for bairro, cargos in list(resultado['bairros'].items())[:3]:
        print(f"  {bairro}:")
        for cargo, lista in cargos.items():
            top = lista[0] if lista else None
            if top:
                print(f"    {cargo}: {top['nome']} ({top['votos']:,} votos)")
    print("=" * 60)


if __name__ == "__main__":
    main()
