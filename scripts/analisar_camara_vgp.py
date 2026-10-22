#!/usr/bin/env python3
"""Lê os recortes de VGP do CSV de despesas do TCE-SP (artefatos da sondagem)
e lista o que a Câmara pagou a pessoas físicas fora da folha, por ano."""
import csv
import glob
import sys
from collections import defaultdict

FOLHA = ("3190", "3191")  # pessoal e encargos
for caminho in sorted(glob.glob(sys.argv[1] + "/**/*.csv", recursive=True)):
    pagos = [r for r in csv.DictReader(open(caminho, encoding="utf-8"), delimiter=";")
             if "CÂMARA" in r["ds_orgao"].upper() and "pago" in r["tp_despesa"].lower()]
    ano = pagos[0]["ano_exercicio"] if pagos else caminho
    por_el = defaultdict(float)
    for r in pagos:
        por_el[r["ds_elemento"]] += float(r["vl_despesa"].replace(",", "."))
    print(f"\n===== {ano}: Câmara, {len(pagos)} pagamentos, R$ {sum(por_el.values()):,.2f}")
    for e, v in sorted(por_el.items(), key=lambda x: -x[1]):
        print(f"   R$ {v:14,.2f}  {e}")
    print("  -- pessoa física fora da folha (elemento não começa com 3190/3191):")
    for r in pagos:
        if "FÍSICA" in r["tp_identificador_despesa"].upper() and not r["ds_elemento"].startswith(FOLHA):
            print(f"   {r['dt_emissao_despesa']} R$ {r['vl_despesa']:>10} {r['ds_despesa']} | {r['ds_elemento']}"
                  f" | {r['historico_despesa'][:300]}")
