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
      O nível de cima é o 1º turno (formato de sempre); o 2º turno, quando
      existe, fica em "turnos": {"2": {"bairros": ..., "totais": ...}}.
    ../data/cotia_votos_por_secao_<ano>.json
    — Presidente e Governador seção a seção, nos dois turnos, com brancos,
      nulos e (se o CSV trouxer) aptos e comparecimento. É a base da
      comparação entre turnos: o voto é secreto, então o que dá para ver é a
      mudança agregada em cada seção, nunca a troca de um eleitor.

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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cidades import C, arq  # noqa: E402

CD_MUNICIPIO_COTIA = C["tse"]  # nome histórico; vale para a cidade de CIDADE

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
# ...mas no arquivo por seção brancos e nulos entram (contam na comparação)
ESPECIAIS_SECAO = {"95": "BRANCO", "96": "NULO"}
# Cargos que podem ter 2º turno: só eles vão para o arquivo por seção
CARGOS_SECAO = ("presidente", "governador")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(SCRIPT_DIR, "..", "data")
LOCAIS_FILE = arq("cotia_locais_votacao.json")


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
    Retorna (agr, secoes):
      agr    = { turno: { bairro: { cargo_key: { nome_candidato: votos } } } }
      secoes = { (zona, secao): { "bairro", "local", turno: { cargo_key:
                 { "votos": {nome: votos}, "aptos", "comparecimento" } } } }
    """
    agr = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(int))))
    secoes = {}

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
                print(f"    Colunas: {reader.fieldnames}")
                turnos_vistos = defaultdict(int)
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

                    turno = row.get("NR_TURNO", "1").strip() or "1"
                    turnos_vistos[turno] += 1
                    nr_votavel = row.get("NR_VOTAVEL", "").strip()
                    zona  = row.get("NR_ZONA", "").strip()
                    secao = row.get("NR_SECAO", "").strip()
                    nome = row.get("NM_VOTAVEL", "").strip()
                    votos = int(row.get("QT_VOTOS", "0").strip() or 0)

                    if cargo_key in CARGOS_SECAO and zona and secao and (
                        nr_votavel not in VOTOS_ESPECIAIS or nr_votavel in ESPECIAIS_SECAO
                    ):
                        sec = secoes.setdefault((zona, secao), {
                            "bairro": secao_bairro.get((zona, secao), ""),
                            "local": row.get("NR_LOCAL_VOTACAO", "").strip(),
                        })
                        c = sec.setdefault(turno, {}).setdefault(
                            cargo_key, {"votos": defaultdict(int)})
                        rotulo = ESPECIAIS_SECAO.get(nr_votavel, nome)
                        c["votos"][rotulo] += votos
                        for col, k in (("QT_APTOS", "aptos"), ("QT_COMPARECIMENTO", "comparecimento")):
                            v = (row.get(col) or "").strip()
                            if v.isdigit():
                                c[k] = max(c.get(k, 0), int(v))

                    if nr_votavel in VOTOS_ESPECIAIS:
                        continue
                    bairro = secao_bairro.get((zona, secao))
                    if not bairro:
                        continue

                    if nome and votos > 0:
                        agr[turno][bairro][cargo_key][nome] += votos
                        n_mapeadas += 1

                print(f"    Total: {n_total:,} | Cotia: {n_cotia:,} | "
                      f"Mapeadas p/ bairro: {n_mapeadas:,} | "
                      f"linhas por turno: {dict(turnos_vistos)}")

    return agr, secoes


def aplicar_detalhe(zip_path: str, secoes: dict):
    """
    detalhe_votacao_secao_<ano>.zip traz aptos, comparecimento e abstenções
    por seção (o votacao_secao não traz). Preenche "aptos"/"comparecimento"
    de Presidente/Governador em cada seção e turno já presentes em `secoes`.
    """
    cargos = {**CARGOS_SP, **CARGOS_BR}
    n = 0
    with zipfile.ZipFile(zip_path, "r") as zf:
        nomes = [x for x in zf.namelist() if x.lower().endswith(".csv")
                 and "BRASIL" not in x.upper() and (x.endswith("_SP.csv") or x.endswith("_BR.csv"))]
        print(f"  Arquivos CSV (detalhe): {nomes}")
        for csv_name in nomes:
            with zf.open(csv_name) as raw:
                reader = csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1"), delimiter=";")
                for row in reader:
                    if row.get("CD_MUNICIPIO", "").strip() != CD_MUNICIPIO_COTIA:
                        continue
                    cargo = cargos.get(row.get("CD_CARGO", "").strip())
                    if cargo not in CARGOS_SECAO:
                        continue
                    chave = (row.get("NR_ZONA", "").strip(), row.get("NR_SECAO", "").strip())
                    turno = row.get("NR_TURNO", "1").strip() or "1"
                    c = secoes.get(chave, {}).get(turno, {}).get(cargo)
                    if c is None:
                        continue
                    for col, k in (("QT_APTOS", "aptos"), ("QT_COMPARECIMENTO", "comparecimento")):
                        v = (row.get(col) or "").strip()
                        if v.isdigit():
                            c[k] = int(v)
                    n += 1
    print(f"  Seções com aptos/comparecimento: {n:,}")


def merge(agr_sp, agr_br):
    """Junta os dados do arquivo SP e BR (de um mesmo turno) num único dicionário."""
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


def build_secoes(secoes: dict, ano: str):
    """
    Arquivo por seção, compacto: para cada cargo e turno, a lista de nomes
    (candidatos, depois BRANCO e NULO) e, em cada seção, os votos na mesma
    ordem. "ap"/"cp" = aptos/comparecimento quando o CSV traz as colunas.
    """
    turnos = sorted({t for s in secoes.values() for t in s if t in ("1", "2")})
    nomes = {}
    for cargo in CARGOS_SECAO:
        nomes[cargo] = {}
        for t in turnos:
            tot = defaultdict(int)
            for s in secoes.values():
                for n, v in s.get(t, {}).get(cargo, {}).get("votos", {}).items():
                    tot[n] += v
            if not tot:
                continue
            esp = [n for n in ("BRANCO", "NULO") if n in tot]
            nomes[cargo][t] = sorted((n for n in tot if n not in esp), key=lambda n: -tot[n]) + esp

    lista = []
    for (zona, secao) in sorted(secoes, key=lambda k: (int(k[0] or 0), int(k[1] or 0))):
        s = secoes[(zona, secao)]
        item = {"z": zona, "s": secao, "b": s["bairro"], "l": s["local"]}
        for t in turnos:
            por_cargo = {}
            for cargo, ns in ((c, nomes[c].get(t)) for c in CARGOS_SECAO):
                dados = s.get(t, {}).get(cargo)
                if not ns or not dados:
                    continue
                d = {"v": [dados["votos"].get(n, 0) for n in ns]}
                if dados.get("aptos"):
                    d["ap"] = dados["aptos"]
                if dados.get("comparecimento"):
                    d["cp"] = dados["comparecimento"]
                por_cargo[cargo] = d
            if por_cargo:
                item[t] = por_cargo
        lista.append(item)

    return {
        "ano": int(ano),
        "municipio": C["nome"],
        "cargos": list(CARGOS_SECAO),
        "turnos": turnos,
        "nomes": nomes,
        "secoes": lista,
    }


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
        "municipio": C["nome"],
        "cargos": ORDEM_CARGOS,
        "bairros": bairros_out,
        "totais": totais_out,
    }


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("2022", "2026"):
        print("Uso: python download_secoes_geral.py <2022|2026>")
        sys.exit(1)

    ano = sys.argv[1]
    output_file = arq(f"cotia_votos_por_bairro_{ano}.json")

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
        agr_sp, sec_sp = process_zip(tmp_sp, CARGOS_SP, secao_bairro, ano)

        # 3. Baixa e processa arquivo BR (Presidente)
        print(f"\n[2/2] Arquivo BR — Presidente")
        download_zip(url_br, tmp_br)
        agr_br, sec_br = process_zip(tmp_br, CARGOS_BR, secao_bairro, ano)

    finally:
        for p in (tmp_sp, tmp_br):
            if os.path.exists(p):
                os.unlink(p)

    # 4. Mescla e gera output (1º turno no nível de cima, como sempre)
    resultado = build_output(merge(agr_sp.get("1", {}), agr_br.get("1", {})), ano)
    for turno in sorted(set(agr_sp) | set(agr_br)):
        if turno == "1":
            continue
        extra = build_output(merge(agr_sp.get(turno, {}), agr_br.get(turno, {})), ano)
        resultado.setdefault("turnos", {})[turno] = {
            "bairros": extra["bairros"], "totais": extra["totais"],
        }
    if os.environ.get("EXIGIR_TURNO2") and "2" not in resultado.get("turnos", {}):
        print("ERRO: o arquivo do TSE ainda não tem o 2º turno (EXIGIR_TURNO2).")
        sys.exit(2)

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)

    # Seções de Presidente/Governador nos dois turnos (comparação entre turnos)
    for chave, dados in sec_br.items():
        alvo = sec_sp.setdefault(chave, {"bairro": dados["bairro"], "local": dados["local"]})
        for t, cargos in dados.items():
            if t in ("bairro", "local"):
                continue
            alvo.setdefault(t, {}).update(cargos)
    url_det = (
        f"https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_secao/"
        f"detalhe_votacao_secao_{ano}.zip"
    )
    tmp_det = tempfile.mktemp(suffix=f"_detalhe_{ano}.zip")
    try:
        print("\n[extra] Detalhe por seção — aptos e comparecimento")
        download_zip(url_det, tmp_det)
        aplicar_detalhe(tmp_det, sec_sp)
    except Exception as e:  # sem o detalhe o arquivo sai só sem abstenção
        print(f"  AVISO: detalhe por seção indisponível ({e})")
    finally:
        if os.path.exists(tmp_det):
            os.unlink(tmp_det)

    secoes_file = arq(f"cotia_votos_por_secao_{ano}.json")
    with open(secoes_file, "w", encoding="utf-8") as f:
        json.dump(build_secoes(sec_sp, ano), f, ensure_ascii=False, separators=(",", ":"))
    print(f"Salvo: {secoes_file}  ({os.path.getsize(secoes_file) / 1024:.0f} KB)")

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
