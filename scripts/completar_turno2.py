#!/usr/bin/env python3
"""
Completa o 2º turno de tse_cotia_<ano>.json a partir do arquivo por seção.

O TSE atualiza o votacao_secao antes do votacao_candidato_munzona: logo
depois do 2º turno, o arquivo por zona ainda vem só com o 1º. Este script
soma as seções (cotia_votos_por_secao_<ano>.json) por zona e no município e
grava o turno "2" de Presidente/Governador em "zonas" e "totais", com nome
de urna e partido do 1º turno. A situação (ELEITO/NÃO ELEITO) é nacional ou
estadual e não dá para tirar das seções da cidade: fica vazia até o arquivo
por zona trazer o 2º turno, quando este script não muda nada.

Uso: python completar_turno2.py 2026   (CIDADE=vgp para Vargem Grande Paulista)
"""

import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cidades import arq  # noqa: E402


def main():
    ano = sys.argv[1] if len(sys.argv) > 1 else "2026"
    tse_file = arq(f"tse_cotia_{ano}.json")
    sec_file = arq(f"cotia_votos_por_secao_{ano}.json")
    tse = json.load(open(tse_file, encoding="utf-8"))
    sec = json.load(open(sec_file, encoding="utf-8"))
    if "2" not in sec.get("turnos", []):
        print("Arquivo por seção sem 2º turno: nada a fazer.")
        return

    mudou = False
    for cargo in sec["cargos"]:
        if tse["totais"].get(cargo, {}).get("2"):
            print(f"{cargo}: o arquivo por zona já tem o 2º turno.")
            continue
        nomes2 = sec["nomes"][cargo].get("2")
        nomes1 = sec["nomes"][cargo].get("1")
        if not nomes2 or not nomes1:
            continue

        # Nome completo (seções) → candidato do 1º turno (urna), pelo total de votos
        soma1 = defaultdict(int)
        for s in sec["secoes"]:
            for n, v in zip(nomes1, s.get("1", {}).get(cargo, {}).get("v", [])):
                soma1[n] += v
        por_votos = {c["votos"]: c for c in tse["totais"][cargo].get("1", [])}
        meta = {n: por_votos.get(v) for n, v in soma1.items()}

        por_zona = defaultdict(lambda: defaultdict(int))
        for s in sec["secoes"]:
            for n, v in zip(nomes2, s.get("2", {}).get(cargo, {}).get("v", [])):
                if n not in ("BRANCO", "NULO"):
                    por_zona[s["z"]][n] += v

        def lista(votos):
            out = []
            for n, v in votos.items():
                m = meta.get(n) or {}
                out.append({
                    "numero": m.get("numero", ""), "nome": m.get("nome", n),
                    "partido": m.get("partido", ""), "numero_partido": m.get("numero_partido", ""),
                    "situacao": "", "votos": v,
                })
            return sorted(out, key=lambda c: -c["votos"])

        total = defaultdict(int)
        for z, votos in por_zona.items():
            for n, v in votos.items():
                total[n] += v
            if z in tse["zonas"]:
                tse["zonas"][z].setdefault(cargo, {})["2"] = lista(votos)
        tse["totais"].setdefault(cargo, {})["2"] = lista(total)
        tse["turno2_das_secoes"] = True
        mudou = True
        print(f"{cargo}: 2º turno das seções → {[(c['nome'], c['votos']) for c in tse['totais'][cargo]['2']]}")

    if mudou:
        with open(tse_file, "w", encoding="utf-8") as f:
            json.dump(tse, f, ensure_ascii=False, indent=2)
        print(f"Salvo: {tse_file}")


if __name__ == "__main__":
    main()
