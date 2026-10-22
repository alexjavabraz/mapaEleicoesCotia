#!/usr/bin/env python3
"""
Despesas por tipo (elemento da despesa) e por função de governo, de todas as
cidades do portal, a partir do CSV anual de despesas do TCE-SP.

A API JSON do TCE (usada em download_contas.py) não traz o tipo da despesa;
o CSV anual traz ds_elemento, ds_funcao_governo e o histórico. Cada arquivo
tem o estado inteiro (~2 GB zipado), então um ano é lido uma vez só e serve
para todas as cidades.

Uso (em duas etapas, para os anos rodarem em paralelo no Actions):
    python download_despesas_tipo.py ano 2024 parcial/2024.json
    python download_despesas_tipo.py juntar parcial/

A segunda grava data/contas_tipo_cotia.json e data/<cidade>/contas_tipo.json,
mantendo os anos que já estavam no arquivo e não vieram em parcial/.

Detalhes do CSV: latin-1 (o cabeçalho às vezes vem com BOM utf-8), separador
";", eventos em tp_despesa (Empenhado / Valor Liquidado / Valor Pago /
Anulação). O download cai perto de 1 GB: é retomado com o cabeçalho Range.
"""

import csv
import glob
import io
import json
import os
import re
import sys
import tempfile
import time
import unicodedata
import zipfile
from collections import defaultdict
from datetime import datetime, timezone

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cidades  # noqa: E402

URL = "https://transparencia.tce.sp.gov.br/sites/default/files/conjunto-dados/despesas-{ano}.zip"
HTTP = requests.Session()
HTTP.headers["User-Agent"] = "mapaEleicoesCotia/1.0 (+https://github.com/alexjavabraz/mapaEleicoesCotia)"

# Elementos da folha (pessoal e encargos): pagamentos a pessoa física fora
# deles são listados um a um para a Câmara (diárias, adiantamentos, ressarcimentos)
FOLHA = ("3190", "3191")
MAX_CAMARA_PF = 400  # por ano e cidade


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def valor(s):
    s = (s or "").strip()
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def data_iso(s):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else (s or "")[:10]


def baixar(url, destino, tentativas=10):
    """Download com retomada (Range)."""
    total = None
    for t in range(tentativas):
        feito = os.path.getsize(destino) if os.path.exists(destino) else 0
        if total and feito >= total:
            break
        cab = {"Range": f"bytes={feito}-"} if feito else {}
        try:
            with HTTP.get(url, stream=True, timeout=180, headers=cab) as r:
                print(f"  HTTP {r.status_code} {r.headers.get('content-length')} bytes (a partir de {feito})", flush=True)
                if r.status_code == 404:
                    return None
                r.raise_for_status()
                if r.status_code == 200:
                    feito = 0
                    total = int(r.headers.get("content-length") or 0) or None
                elif total is None:
                    m = re.search(r"/(\d+)$", r.headers.get("content-range", ""))
                    total = int(m.group(1)) if m else None
                with open(destino, "ab" if feito else "wb") as f:
                    for parte in r.iter_content(1 << 20):
                        f.write(parte)
            if not total or os.path.getsize(destino) >= total:
                return destino
        except (requests.exceptions.ChunkedEncodingError, requests.exceptions.ConnectionError) as e:
            print(f"  conexão caiu ({type(e).__name__}), retomando...", flush=True)
            time.sleep(5 * (t + 1))
    if total and os.path.getsize(destino) >= total:
        return destino
    raise SystemExit(f"Download incompleto: {url}")


def nova_cidade():
    return {
        # órgão -> elemento -> [pago, empenhado]
        "elementos": defaultdict(lambda: defaultdict(lambda: [0.0, 0.0])),
        # órgão -> função -> pago
        "funcoes": defaultdict(lambda: defaultdict(float)),
        "camara_pf": [],
    }


def processar_ano(ano, saida):
    tmp = tempfile.mkdtemp()
    destino = os.path.join(tmp, f"despesas-{ano}.zip")
    print(f"Baixando {URL.format(ano=ano)}", flush=True)
    if not baixar(URL.format(ano=ano), destino):
        print(f"{ano}: arquivo ainda não publicado (404).")
        return
    alvo = {norm(c["nome"]): k for k, c in cidades.CIDADES.items()}
    res = {k: nova_cidade() for k in cidades.CIDADES}
    n = 0
    with zipfile.ZipFile(destino) as z:
        nome = next(x for x in z.namelist() if x.lower().endswith(".csv"))
        with z.open(nome) as f:
            texto = io.TextIOWrapper(f, encoding="latin-1", newline="")
            leitor = csv.reader(texto, delimiter=";")
            cab = [c.replace("ï»¿", "").replace("﻿", "").strip().strip('"') for c in next(leitor)]
            i = {c: k for k, c in enumerate(cab)}
            print(f"  colunas: {cab}", flush=True)
            for row in leitor:
                n += 1
                if n % 2_000_000 == 0:
                    print(f"  {n:,} linhas", flush=True)
                if len(row) < len(cab):
                    continue
                cid = alvo.get(norm(row[i["ds_municipio"]]))
                if not cid:
                    continue
                tp = row[i["tp_despesa"]].lower()
                pago, emp = "pago" in tp, "empenhado" in tp
                anul = "anula" in tp
                if not (pago or emp or anul):
                    continue
                orgao = re.sub(r"\s+", " ", row[i["ds_orgao"]]).strip()
                elem = re.sub(r"\s+", " ", row[i["ds_elemento"]]).strip() or "(sem elemento)"
                vl = valor(row[i["vl_despesa"]])
                r = res[cid]
                if pago:
                    r["elementos"][orgao][elem][0] += vl
                    func = re.sub(r"\s+", " ", row[i["ds_funcao_governo"]]).strip() or "(sem função)"
                    r["funcoes"][orgao][func] += vl
                    ident = norm(row[i["tp_identificador_despesa"]])
                    if ("CAMARA" in norm(orgao) and "FISICA" in ident
                            and not elem.startswith(FOLHA) and len(r["camara_pf"]) < MAX_CAMARA_PF):
                        # [data, valor, favorecido, elemento, histórico] — sem CPF
                        r["camara_pf"].append([data_iso(row[i["dt_emissao_despesa"]]), round(vl, 2),
                                               re.sub(r"\s+", " ", row[i["ds_despesa"]]).strip(), elem,
                                               re.sub(r"\s+", " ", row[i["historico_despesa"]]).strip()[:400]])
                elif emp:
                    r["elementos"][orgao][elem][1] += vl
                else:  # anulação de empenho
                    r["elementos"][orgao][elem][1] -= abs(vl)
    os.remove(destino)
    print(f"  {n:,} linhas lidas", flush=True)

    out = {}
    for cid, r in res.items():
        out[cid] = {
            "elementos": {o: {e: [round(v[0], 2), round(v[1], 2)] for e, v in els.items()}
                          for o, els in r["elementos"].items()},
            "funcoes": {o: {f: round(v, 2) for f, v in fs.items()} for o, fs in r["funcoes"].items()},
            "camara_pf": sorted(r["camara_pf"]),
        }
        tot = sum(v[0] for els in r["elementos"].values() for v in els.values())
        print(f"  {cid}: pago R$ {tot:,.2f}, {len(r['camara_pf'])} pagamentos da Câmara a pessoa física fora da folha")
    os.makedirs(os.path.dirname(os.path.abspath(saida)), exist_ok=True)
    with open(saida, "w", encoding="utf-8") as f:
        json.dump({"ano": str(ano), "cidades": out}, f, ensure_ascii=False)
    print(f"Gravado {saida}")


def juntar(pasta):
    parciais = []
    for p in sorted(glob.glob(os.path.join(pasta, "**", "*.json"), recursive=True)):
        with open(p, encoding="utf-8") as f:
            parciais.append(json.load(f))
    if not parciais:
        raise SystemExit("Nenhum arquivo parcial em " + pasta)
    for cid in cidades.CIDADES:
        caminho = os.path.join(cidades.DATA_DIR, cidades.nome_arquivo_de(cid, "contas_tipo_cotia.json"))
        anos = {}
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as f:
                anos = json.load(f).get("anos", {})
        for p in parciais:
            if cid in p["cidades"]:
                anos[p["ano"]] = p["cidades"][cid]
        saida = {
            "meta": {
                "fonte": "TCE-SP — Conjuntos de dados, despesas municipais (CSV anual)",
                "url": "https://transparencia.tce.sp.gov.br/conjunto-de-dados",
                "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "evento": "elementos: [valor pago, valor empenhado líquido de anulações]; funcoes: valor pago",
                "campos_camara_pf": ["data", "valor", "favorecido", "elemento", "historico"],
            },
            "anos": dict(sorted(anos.items())),
        }
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
        print(f"Gravado {caminho}: anos {list(saida['anos'])}")


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "ano":
        processar_ano(int(sys.argv[2]), sys.argv[3])
    elif len(sys.argv) == 3 and sys.argv[1] == "juntar":
        juntar(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(2)
