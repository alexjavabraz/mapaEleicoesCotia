#!/usr/bin/env python3
"""
Script para baixar e processar dados eleitorais do TSE para Cotia/SP.
Fonte: https://dadosabertos.tse.jus.br/dataset/resultados-2024

Uso:
    pip install -r requirements.txt
    python download_tse.py
"""

import io
import json
import os
import sys
import zipfile
import csv
from collections import defaultdict

try:
    import requests
    from tqdm import tqdm
except ImportError:
    print("Dependências faltando. Execute: pip install -r requirements.txt")
    sys.exit(1)

# URLs dos arquivos do TSE 2024
TSE_URLS = {
    # Arquivo nacional (todos os estados) com votação nominal por município e zona
    "votacao_munzona": "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2024.zip",
}

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tse_cotia_2024.json")
MUNICIPIO_ALVO = "COTIA"


def download_file(url: str, desc: str) -> bytes:
    """Faz o download de um arquivo com barra de progresso."""
    print(f"\nBaixando: {desc}")
    print(f"URL: {url}")

    response = requests.get(url, stream=True, timeout=120)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    buf = io.BytesIO()

    with tqdm(total=total, unit="B", unit_scale=True, desc=desc) as pbar:
        for chunk in response.iter_content(chunk_size=8192):
            buf.write(chunk)
            pbar.update(len(chunk))

    buf.seek(0)
    return buf.read()


def parse_votacao_munzona(zip_bytes: bytes, municipio: str) -> dict:
    """
    Processa o arquivo de votação nominal por município e zona.
    Retorna dict com dados organizados por zona eleitoral.
    """
    print(f"\nProcessando dados de votação para {municipio}...")

    zones = {}  # zona -> cargo -> turno -> list of candidates

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        csv_files = [f for f in z.namelist() if f.lower().endswith(".csv")]

        if not csv_files:
            print("ERRO: Nenhum arquivo CSV encontrado no ZIP.")
            return {}

        print(f"Arquivos CSV encontrados: {csv_files}")

        # Prioriza o arquivo do estado (SP) para evitar duplicatas com BRASIL
        sp_files = [f for f in csv_files if "_SP.csv" in f]
        brasil_files = [f for f in csv_files if "_BRASIL.csv" in f]
        outros_files = [f for f in csv_files if f not in sp_files and f not in brasil_files]

        # Usa o arquivo SP se disponível; caso contrário usa BRASIL; ignora os demais
        if sp_files:
            csv_files_filtrados = sp_files
        elif brasil_files:
            csv_files_filtrados = brasil_files
        else:
            csv_files_filtrados = outros_files

        print(f"Arquivos CSV a processar (filtrando duplicatas): {csv_files_filtrados}")

        for csv_name in csv_files_filtrados:
            print(f"Lendo {csv_name}...")

            with z.open(csv_name) as raw:
                # TSE usa latin-1 (ISO-8859-1) com separador ";"
                reader = csv.DictReader(
                    io.TextIOWrapper(raw, encoding="latin-1"),
                    delimiter=";",
                )

                total_linhas = 0
                linhas_cotia = 0

                for row in reader:
                    total_linhas += 1

                    nm_municipio = row.get("NM_MUNICIPIO", "").strip().upper()
                    if nm_municipio != municipio.upper():
                        continue

                    linhas_cotia += 1

                    nr_zona = row.get("NR_ZONA", "").strip()
                    nr_turno = row.get("NR_TURNO", "1").strip()
                    ds_cargo = row.get("DS_CARGO", "").strip().upper()

                    # Inicializa estrutura se necessário
                    if nr_zona not in zones:
                        zones[nr_zona] = {
                            "numero": nr_zona,
                            "nome": f"Zona {nr_zona}",
                            "prefeito": {"1": [], "2": []},
                            "vereadores": {"1": [], "2": []},
                        }

                    candidato = {
                        "numero": row.get("NR_CANDIDATO", "").strip(),
                        "nome": row.get("NM_URNA_CANDIDATO", row.get("NM_CANDIDATO", "")).strip(),
                        "partido": row.get("SG_PARTIDO", "").strip(),
                        "numero_partido": row.get("NR_PARTIDO", "").strip(),
                        "situacao": row.get("DS_SIT_TOT_TURNO", "").strip(),
                        "votos": int(row.get("QT_VOTOS_NOMINAIS_VALIDOS", "0").strip() or "0"),
                    }

                    if "PREFEITO" in ds_cargo:
                        zones[nr_zona]["prefeito"][nr_turno].append(candidato)
                    elif "VEREADOR" in ds_cargo:
                        zones[nr_zona]["vereadores"][nr_turno].append(candidato)

                print(f"  Total de linhas: {total_linhas:,}")
                print(f"  Linhas de {municipio}: {linhas_cotia:,}")

    # Ordenar por votos (decrescente)
    for zona in zones.values():
        for turno_list in zona["prefeito"].values():
            turno_list.sort(key=lambda x: x["votos"], reverse=True)
        for turno_list in zona["vereadores"].values():
            turno_list.sort(key=lambda x: x["votos"], reverse=True)

    return zones


def calcular_totais(zones: dict) -> dict:
    """Calcula totais agregados de todas as zonas."""
    totais = {
        "prefeito": defaultdict(list),
        "vereadores": defaultdict(list),
    }

    for zona in zones.values():
        for turno, candidatos in zona["prefeito"].items():
            for c in candidatos:
                # Procura se candidato já existe nos totais
                encontrado = False
                for tc in totais["prefeito"][turno]:
                    if tc["numero"] == c["numero"]:
                        tc["votos"] += c["votos"]
                        encontrado = True
                        break
                if not encontrado:
                    totais["prefeito"][turno].append(dict(c))

        for turno, candidatos in zona["vereadores"].items():
            for c in candidatos:
                encontrado = False
                for tc in totais["vereadores"][turno]:
                    if tc["numero"] == c["numero"]:
                        tc["votos"] += c["votos"]
                        encontrado = True
                        break
                if not encontrado:
                    totais["vereadores"][turno].append(dict(c))

    # Ordenar por votos
    for cargo in totais:
        for turno in totais[cargo]:
            totais[cargo][turno].sort(key=lambda x: x["votos"], reverse=True)

    return {k: dict(v) for k, v in totais.items()}


def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    print("=" * 60)
    print("DOWNLOADER DE DADOS ELEITORAIS TSE 2024 - COTIA/SP")
    print("=" * 60)

    # 1. Baixar votação por município e zona
    try:
        zip_bytes = download_file(
            TSE_URLS["votacao_munzona"],
            "Votação por Município e Zona (SP)"
        )
    except requests.exceptions.RequestException as e:
        print(f"\nERRO ao baixar arquivo: {e}")
        print("\nTente baixar manualmente em:")
        print("https://dadosabertos.tse.jus.br/dataset/resultados-2024")
        sys.exit(1)

    # 2. Processar dados
    zones = parse_votacao_munzona(zip_bytes, MUNICIPIO_ALVO)

    if not zones:
        print("\nERRO: Nenhum dado encontrado para Cotia.")
        sys.exit(1)

    # 3. Calcular totais
    totais = calcular_totais(zones)

    # 4. Montar estrutura final
    resultado = {
        "municipio": {
            "nome": MUNICIPIO_ALVO,
            "uf": "SP",
            "ano_eleicao": 2024,
        },
        "zonas": zones,
        "totais": totais,
        "zonas_lista": sorted(zones.keys()),
    }

    # 5. Salvar JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Dados salvos em: {OUTPUT_FILE}")
    print(f"Zonas eleitorais encontradas: {sorted(zones.keys())}")

    for zona_num in sorted(zones.keys()):
        zona = zones[zona_num]
        n_pref_t1 = len(zona["prefeito"].get("1", []))
        n_ver_t1 = len(zona["vereadores"].get("1", []))
        print(f"  Zona {zona_num}: {n_pref_t1} candidatos a prefeito, {n_ver_t1} candidatos a vereador")

    print("\nAgora abra o index.html no seu navegador para visualizar o mapa.")
    print("=" * 60)


if __name__ == "__main__":
    main()
