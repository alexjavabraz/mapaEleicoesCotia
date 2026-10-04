#!/usr/bin/env python3
"""
Script para baixar e processar dados de Eleições Gerais do TSE para Cotia/SP:
Presidente, Governador, Senador, Deputado Federal e Deputado Estadual.

Diferente de download_tse.py (eleição municipal — Prefeito/Vereador), este
script é parametrizado por ano, já que o mesmo tipo de pleito (geral) se
repete a cada 4 anos (2018, 2022, 2026, ...).

Uso:
    pip install -r requirements.txt
    python download_tse_geral.py 2022
    python download_tse_geral.py 2026

Fonte: https://dadosabertos.tse.jus.br/dataset/resultados-<ano>

Observação: o TSE só publica o dataset de votação depois que a apuração
termina. Rodar este script antes disso resulta em erro 404 — não é um bug,
é o dataset ainda não existir.
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

MUNICIPIO_ALVO = "COTIA"

# DS_CARGO (texto exato do CSV do TSE, já em maiúsculas) -> chave usada no
# JSON de saída. Conferir contra o leiame/layout oficial do TSE a cada ciclo
# eleitoral — o texto costuma ser estável, mas vale confirmar.
CARGOS_GERAL = {
    "PRESIDENTE":        "presidente",
    "GOVERNADOR":        "governador",
    "SENADOR":           "senador",
    "DEPUTADO FEDERAL":  "dep_federal",
    "DEPUTADO ESTADUAL": "dep_estadual",
}


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
    Processa o arquivo de votação nominal por município e zona, filtrando
    apenas os cargos de eleição geral (CARGOS_GERAL).
    Retorna dict: zona -> { numero, nome, <cargo>: {"1": [...], "2": [...]} }
    """
    print(f"\nProcessando dados de votação para {municipio}...")

    zones = {}

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        csv_files = [f for f in z.namelist() if f.lower().endswith(".csv")]

        if not csv_files:
            print("ERRO: Nenhum arquivo CSV encontrado no ZIP.")
            return {}

        # Presidente é cargo nacional e vem separado num arquivo "_BR.csv"
        # (NÃO confundir com "_BRASIL.csv", que é um rollup agregado nacional
        # dos demais cargos — duplicaria dados já presentes em "_SP.csv").
        # Os demais cargos gerais (Governador/Senador/Dep. Federal/Dep.
        # Estadual) vêm no arquivo do estado ("_SP.csv").
        sp_files = [f for f in csv_files if f.endswith("_SP.csv")]
        br_files = [f for f in csv_files if f.endswith("_BR.csv")]
        outros_files = [f for f in csv_files if f not in sp_files and f not in br_files
                        and not f.endswith("_BRASIL.csv")]

        if sp_files or br_files:
            csv_files_filtrados = sp_files + br_files
        else:
            csv_files_filtrados = outros_files

        print(f"Arquivos CSV a processar: {csv_files_filtrados}")

        for csv_name in csv_files_filtrados:
            print(f"Lendo {csv_name}...")

            with z.open(csv_name) as raw:
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

                    ds_cargo = row.get("DS_CARGO", "").strip().upper()
                    cargo_key = CARGOS_GERAL.get(ds_cargo)
                    if not cargo_key:
                        continue  # cargo fora do escopo (ex: vice, se aparecer)

                    linhas_cotia += 1

                    nr_zona = row.get("NR_ZONA", "").strip()
                    nr_turno = row.get("NR_TURNO", "1").strip()

                    if nr_zona not in zones:
                        zones[nr_zona] = {"numero": nr_zona, "nome": f"Zona {nr_zona}"}
                        for k in CARGOS_GERAL.values():
                            zones[nr_zona][k] = {"1": [], "2": []}

                    candidato = {
                        "numero": row.get("NR_CANDIDATO", "").strip(),
                        "nome": row.get("NM_URNA_CANDIDATO", row.get("NM_CANDIDATO", "")).strip(),
                        "partido": row.get("SG_PARTIDO", "").strip(),
                        "numero_partido": row.get("NR_PARTIDO", "").strip(),
                        "situacao": row.get("DS_SIT_TOT_TURNO", "").strip(),
                        "votos": int(row.get("QT_VOTOS_NOMINAIS_VALIDOS", "0").strip() or "0"),
                    }

                    zones[nr_zona][cargo_key].setdefault(nr_turno, []).append(candidato)

                print(f"  Total de linhas: {total_linhas:,}")
                print(f"  Linhas de {municipio} (cargos gerais): {linhas_cotia:,}")

    for zona in zones.values():
        for cargo_key in CARGOS_GERAL.values():
            for turno_list in zona[cargo_key].values():
                turno_list.sort(key=lambda x: x["votos"], reverse=True)

    return zones


def calcular_totais(zones: dict) -> dict:
    """Calcula totais agregados de todas as zonas, por cargo."""
    totais = {k: defaultdict(list) for k in CARGOS_GERAL.values()}

    for zona in zones.values():
        for cargo_key in CARGOS_GERAL.values():
            for turno, candidatos in zona[cargo_key].items():
                for c in candidatos:
                    lista = totais[cargo_key][turno]
                    encontrado = next((tc for tc in lista if tc["numero"] == c["numero"]), None)
                    if encontrado:
                        encontrado["votos"] += c["votos"]
                    else:
                        lista.append(dict(c))

    for cargo_key in totais:
        for turno in totais[cargo_key]:
            totais[cargo_key][turno].sort(key=lambda x: x["votos"], reverse=True)

    return {k: dict(v) for k, v in totais.items()}


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("2022", "2026"):
        print("Uso: python download_tse_geral.py <2022|2026>")
        sys.exit(1)

    ano = sys.argv[1]
    url = (
        "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/"
        f"votacao_candidato_munzona_{ano}.zip"
    )
    output_file = os.path.join(os.path.dirname(__file__), "..", "data", f"tse_cotia_{ano}.json")

    print("=" * 60)
    print(f"DOWNLOADER DE DADOS — ELEIÇÃO GERAL {ano} — COTIA/SP")
    print("=" * 60)

    try:
        zip_bytes = download_file(url, f"Votação por Município e Zona ({ano})")
    except requests.exceptions.RequestException as e:
        print(f"\nERRO ao baixar arquivo: {e}")
        print(
            f"\nO TSE só publica este dataset depois que a apuração de {ano} termina.\n"
            f"Se ainda não saiu, tente mais tarde. Portal: "
            f"https://dadosabertos.tse.jus.br/dataset/resultados-{ano}"
        )
        sys.exit(1)

    zones = parse_votacao_munzona(zip_bytes, MUNICIPIO_ALVO)

    if not zones:
        print("\nERRO: Nenhum dado encontrado para Cotia.")
        sys.exit(1)

    totais = calcular_totais(zones)

    resultado = {
        "municipio": {
            "nome": MUNICIPIO_ALVO,
            "uf": "SP",
            "ano_eleicao": int(ano),
            "tipo": "geral",
        },
        "cargos_lista": list(CARGOS_GERAL.values()),
        "zonas": zones,
        "totais": totais,
        "zonas_lista": sorted(zones.keys()),
    }

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Dados salvos em: {output_file}")
    print(f"Zonas eleitorais encontradas: {sorted(zones.keys())}")

    for zona_num in sorted(zones.keys()):
        zona = zones[zona_num]
        resumo = ", ".join(
            f"{len(zona[k].get('1', []))} {k}" for k in CARGOS_GERAL.values()
        )
        print(f"  Zona {zona_num}: {resumo}")

    print("\nAbra eleicao-geral.html no navegador (via servidor HTTP local) para visualizar.")
    print("=" * 60)


if __name__ == "__main__":
    main()
