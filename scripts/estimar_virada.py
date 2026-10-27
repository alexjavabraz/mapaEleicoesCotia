#!/usr/bin/env python3
"""
Estimativa de "para onde foram os votos" entre o 1º e o 2º turno.

O voto é secreto: o TSE só publica o total de cada seção (urna). Com esses
totais nos dois turnos, este script estima a matriz de transição P (linha =
escolha no 1º turno, coluna = escolha no 2º; cada linha soma 1) que melhor
explica as seções, por mínimos quadrados com restrição (regressão de Goodman,
uma forma simples de inferência ecológica):

    votos_2º_turno(seção) ≈ votos_1º_turno(seção) · P

Abstenção entra como categoria (aptos − comparecimento), porque muita gente
que não votou num turno votou no outro. Para cada bairro a mesma conta é
feita só com as seções dele, puxada para a matriz da cidade (penalidade
LAMBDA · ‖P − P_cidade‖²): bairro com poucas seções fica perto do padrão da
cidade em vez de dar um resultado ao acaso.

É uma estimativa do padrão médio, não uma contagem: não enxerga, por
exemplo, quem trocou um finalista pelo outro dentro da mesma seção.

Entrada: cotia_votos_por_secao_<ano>.json (download_secoes_geral.py)
Saída:   cotia_virada_<ano>.json

Uso: python estimar_virada.py 2026   (CIDADE=vgp para Vargem Grande Paulista)
"""

import json
import os
import sys
from collections import defaultdict

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cidades import C, arq  # noqa: E402

CARGO = "presidente"
MAX_CANDIDATOS = 4      # além dos finalistas, candidatos do 1º turno com categoria própria
MIN_PARTICIPACAO = 0.02  # ...desde que tenham ao menos 2% dos votos
LAMBDA = 2.0             # força da puxada do bairro para a matriz da cidade (por seção média)
ITERACOES = 6000

OUTROS, BRANCO_NULO, ABSTENCAO = "_OUTROS", "_BRANCO_NULO", "_ABSTENCAO"


def proj_simplex(v):
    """Projeção euclidiana de v no simplex {x ≥ 0, Σx = 1}."""
    u = np.sort(v)[::-1]
    css = np.cumsum(u)
    rho = np.nonzero(u * np.arange(1, len(v) + 1) > (css - 1))[0][-1]
    return np.maximum(v - (css[rho] - 1) / (rho + 1.0), 0)


def ajustar(X, Y, P0=None, lam=0.0):
    """min ‖Y − XP‖² + lam‖P − P0‖², linhas de P no simplex (gradiente projetado)."""
    k1, k2 = X.shape[1], Y.shape[1]
    if P0 is None:
        P = np.full((k1, k2), 1.0 / k2)
        for i in range(min(k1, k2)):  # começa supondo que cada um manteve o voto
            P[i] = 0.05 / (k2 - 1)
            P[i, i] = 0.95
        P0, lam = P.copy(), 0.0
    else:
        P = P0.copy()
    XtX, XtY = X.T @ X, X.T @ Y
    passo = 1.0 / (np.linalg.eigvalsh(XtX).max() + lam + 1e-9)
    for _ in range(ITERACOES):
        G = XtX @ P - XtY + lam * (P - P0)
        P = np.array([proj_simplex(r) for r in (P - passo * G)])
    return P


def main():
    ano = sys.argv[1] if len(sys.argv) > 1 else "2026"
    sec = json.load(open(arq(f"cotia_votos_por_secao_{ano}.json"), encoding="utf-8"))
    nomes1 = sec["nomes"][CARGO].get("1")
    nomes2 = sec["nomes"][CARGO].get("2")
    if not nomes1 or not nomes2:
        print("Sem 2º turno no arquivo por seção: nada a estimar.")
        return

    finalistas = [n for n in nomes2 if n not in ("BRANCO", "NULO")]
    total1 = defaultdict(int)
    for s in sec["secoes"]:
        for n, v in zip(nomes1, s.get("1", {}).get(CARGO, {}).get("v", [])):
            total1[n] += v
    validos = sum(v for n, v in total1.items() if n not in ("BRANCO", "NULO"))
    outros_cand = [n for n in nomes1 if n not in finalistas and n not in ("BRANCO", "NULO")]
    proprios = [n for n in outros_cand if total1[n] >= MIN_PARTICIPACAO * validos][:MAX_CANDIDATOS]

    cats1 = finalistas + proprios + [OUTROS, BRANCO_NULO, ABSTENCAO]
    cats2 = finalistas + [BRANCO_NULO, ABSTENCAO]
    idx1 = {n: cats1.index(n) for n in finalistas + proprios}
    idx2 = {n: cats2.index(n) for n in finalistas}

    linhas = []  # (bairro, x, y)
    for s in sec["secoes"]:
        a, b = s.get("1", {}).get(CARGO), s.get("2", {}).get(CARGO)
        if not a or not b or not (a.get("ap") or b.get("ap")):
            continue
        x, y = np.zeros(len(cats1)), np.zeros(len(cats2))
        for n, v in zip(nomes1, a["v"]):
            x[idx1.get(n, cats1.index(BRANCO_NULO) if n in ("BRANCO", "NULO") else cats1.index(OUTROS))] += v
        for n, v in zip(nomes2, b["v"]):
            y[idx2.get(n, cats2.index(BRANCO_NULO))] += v
        x[-1] = max((a.get("ap") or b["ap"]) - x[:-1].sum(), 0)
        y[-1] = max((b.get("ap") or a["ap"]) - y[:-1].sum(), 0)
        linhas.append((s.get("b") or "", x, y))
    if not linhas:
        print("Seções sem aptos (detalhe_votacao_secao): sem abstenção não dá para estimar.")
        sys.exit(1)

    def bloco(X, Y, P):
        return {
            "secoes": int(len(X)),
            "tot1": [int(v) for v in X.sum(0)],
            "tot2": [int(v) for v in Y.sum(0)],
            "fluxo": [[int(round(v)) for v in linha] for linha in (P * X.sum(0)[:, None])],
        }

    X = np.array([l[1] for l in linhas])
    Y = np.array([l[2] for l in linhas])
    P_cidade = ajustar(X, Y)
    print("Cidade:")
    for i, c in enumerate(cats1):
        print(f"  {c[:28]:28s} " + "  ".join(f"{cats2[j][:10]} {P_cidade[i, j]*100:5.1f}%" for j in range(len(cats2))))

    por_bairro = defaultdict(list)
    for b, x, y in linhas:
        if b:
            por_bairro[b].append((x, y))
    # escala da penalidade: proporcional ao tamanho médio de uma seção²
    escala = float((X.sum(1) ** 2).mean())
    bairros = {}
    for b in sorted(por_bairro):
        Xb = np.array([x for x, _ in por_bairro[b]])
        Yb = np.array([y for _, y in por_bairro[b]])
        Pb = ajustar(Xb, Yb, P_cidade, LAMBDA * escala)
        bairros[b] = bloco(Xb, Yb, Pb)

    saida = {
        "ano": int(ano),
        "municipio": C["nome"],
        "cargo": CARGO,
        "metodo": "inferência ecológica (regressão de Goodman com restrição) sobre votos por seção",
        "cats1": cats1,
        "cats2": cats2,
        "cidade": bloco(X, Y, P_cidade),
        "bairros": bairros,
    }
    out = arq(f"cotia_virada_{ano}.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Salvo: {out} ({os.path.getsize(out) / 1024:.0f} KB, {len(bairros)} bairros)")


if __name__ == "__main__":
    main()
