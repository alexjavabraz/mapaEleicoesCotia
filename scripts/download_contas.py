#!/usr/bin/env python3
"""
Baixa as despesas do município de Cotia na API de transparência do TCE-SP
e gera um JSON agregado para a página "Contas do Município" (contas.html).

Uso:
    pip install -r requirements.txt
    python download_contas.py            # 2020 até o mês atual
    python download_contas.py 2023       # 2023 até o mês atual

Fonte: https://transparencia.tce.sp.gov.br/api/json/despesas/cotia/{ano}/{mes}
Cada registro: orgao, mes, evento (Empenhado/Liquidado/Pago...), nr_empenho,
id_fornecedor, nm_fornecedor, dt_emissao_despesa (DD/MM/AAAA), vl_despesa
("1234,56", vírgula decimal, sem separador de milhar).

O JSON bruto não é versionado (fica grande demais); só o agregado em
data/contas_cotia.json. O TCE publica os meses com algumas semanas de atraso:
mês sem dado volta "[]" e é simplesmente ignorado.
"""

import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import date, datetime, timezone

try:
    import requests
except ImportError:
    print("Dependências faltando. Execute: pip install -r requirements.txt")
    sys.exit(1)

API = "https://transparencia.tce.sp.gov.br/api/json/despesas/cotia/{ano}/{mes}"
ANO_INICIAL = 2020
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "contas_cotia.json")

# Quantos lançamentos individuais guardar: no ranking geral e por fornecedor
TOP_GERAL = 50  # por evento e por ano
TOP_POR_FORNECEDOR = 5  # por evento


def parse_valor(s):
    s = (s or "").strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_data(s):
    """DD/MM/AAAA -> AAAA-MM-DD (string vazia se inválida)."""
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


def parse_fornecedor(id_raw, nome):
    """
    id_fornecedor vem como "CNPJ - PESSOA JURÍDICA - 46523049000120" ou
    "PESSOA FÍSICA - 12345678900". CPF de pessoa física não é publicado no
    JSON de saída — só o tipo e um identificador mascarado.
    """
    id_raw = (id_raw or "").strip()
    nome = re.sub(r"\s+", " ", (nome or "").strip()) or "(sem nome)"
    digitos = re.sub(r"\D", "", id_raw)
    if "JUR" in id_raw.upper() or len(digitos) == 14:
        return f"PJ:{digitos}", "PJ", digitos, nome
    if digitos:
        return f"PF:{digitos}", "PF", "", nome
    return f"X:{nome}", "", "", nome


def baixar_mes(sess, ano, mes):
    url = API.format(ano=ano, mes=mes)
    for tentativa in range(5):
        try:
            r = sess.get(url, timeout=120)
            if r.status_code == 200:
                dados = r.json()
                return dados if isinstance(dados, list) else []
            print(f"  {ano}/{mes:02d}: HTTP {r.status_code}")
        except (requests.RequestException, ValueError) as e:
            print(f"  {ano}/{mes:02d}: erro {e}")
        time.sleep(2 ** tentativa)
    raise RuntimeError(f"Falha ao baixar {url}")


# A API devolve "Empenhado", "Valor Liquidado", "Valor Pago", "Anulação",
# "Reforço"; a página usa os nomes curtos.
EVENTOS = {"valor pago": "Pago", "valor liquidado": "Liquidado"}
# Só guardamos os maiores lançamentos individuais destes eventos
EVENTOS_COM_TOP = {"Pago", "Liquidado", "Empenhado"}


def normaliza_evento(s):
    s = re.sub(r"\s+", " ", (s or "").strip()).capitalize() or "Outro"
    return EVENTOS.get(s.lower(), s)


def r2(v):
    return round(v, 2)


def arredonda(d):
    return {k: r2(v) for k, v in d.items()}


def main():
    ano_ini = int(sys.argv[1]) if len(sys.argv) > 1 else ANO_INICIAL
    hoje = date.today()

    sess = requests.Session()
    sess.headers["User-Agent"] = "mapaEleicoesCotia/1.0 (+github.com/alexjavabraz/mapaEleicoesCotia)"

    por_ano = defaultdict(lambda: defaultdict(float))
    por_mes = defaultdict(lambda: defaultdict(float))
    por_orgao = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    eventos = Counter()
    forn = {}
    lancamentos = []  # (valor, registro compacto) — filtrado no fim
    meses_com_dado = []

    for ano in range(ano_ini, hoje.year + 1):
        ultimo = 12 if ano < hoje.year else hoje.month
        for mes in range(1, ultimo + 1):
            regs = baixar_mes(sess, ano, mes)
            print(f"{ano}/{mes:02d}: {len(regs)} registros")
            if not regs:
                continue
            chave_mes = f"{ano}-{mes:02d}"
            meses_com_dado.append(chave_mes)
            for r in regs:
                ev = normaliza_evento(r.get("evento"))
                vl = parse_valor(r.get("vl_despesa"))
                orgao = (r.get("orgao") or "").strip()
                fid, tipo, doc, nome = parse_fornecedor(r.get("id_fornecedor"), r.get("nm_fornecedor"))

                eventos[ev] += 1
                por_ano[str(ano)][ev] += vl
                por_mes[chave_mes][ev] += vl
                por_orgao[orgao][str(ano)][ev] += vl

                f = forn.get(fid)
                if f is None:
                    f = forn[fid] = {
                        "tipo": tipo, "doc": doc, "nomes": Counter(),
                        "anos": defaultdict(lambda: defaultdict(float)),
                        "total": defaultdict(float), "n": 0, "top": defaultdict(list),
                    }
                f["nomes"][nome] += 1
                f["anos"][str(ano)][ev] += vl
                f["total"][ev] += vl
                f["n"] += 1

                # [data, valor, evento, orgao, empenho, fornecedor_id]
                lanc = [parse_data(r.get("dt_emissao_despesa")) or chave_mes,
                        r2(vl), ev, orgao, (r.get("nr_empenho") or "").strip(), fid]
                if ev in EVENTOS_COM_TOP:
                    tops = f["top"][ev]
                    tops.append(lanc)
                    if len(tops) > TOP_POR_FORNECEDOR * 4:
                        tops.sort(key=lambda x: -x[1])
                        del tops[TOP_POR_FORNECEDOR:]
                    lancamentos.append(lanc)
            if len(lancamentos) > 50000:
                lancamentos.sort(key=lambda x: -x[1])
                lancamentos = _top_por_evento(lancamentos)
            time.sleep(0.3)

    if not meses_com_dado:
        print("Nenhum dado retornado pela API — nada a gravar.")
        sys.exit(1)

    # Ids curtos (índice) para não repetir o id longo em cada lançamento
    ordem_ev = _ordena_eventos(eventos)
    ev_principal = ordem_ev[0]
    ids = sorted(forn, key=lambda k: -forn[k]["total"].get(ev_principal, 0))
    idx = {fid: i for i, fid in enumerate(ids)}

    fornecedores = []
    for fid in ids:
        f = forn[fid]
        fornecedores.append({
            "nome": f["nomes"].most_common(1)[0][0],
            "tipo": f["tipo"],
            "doc": f["doc"],
            "n": f["n"],
            "total": arredonda(f["total"]),
            "anos": {a: arredonda(v) for a, v in sorted(f["anos"].items())},
            # por evento: [data, valor, orgao, empenho]
            "top": {ev: [[l[0], l[1], l[3], l[4]]
                         for l in sorted(ls, key=lambda x: -x[1])[:TOP_POR_FORNECEDOR]]
                    for ev, ls in f["top"].items()},
        })

    lancamentos.sort(key=lambda x: -x[1])
    top = [l[:5] + [idx[l[5]]] for l in _top_por_evento(lancamentos)]

    saida = {
        "meta": {
            "fonte": "TCE-SP — Portal da Transparência Municipal",
            "url": "https://transparencia.tce.sp.gov.br/",
            "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "primeiro_mes": meses_com_dado[0],
            "ultimo_mes": meses_com_dado[-1],
            "eventos": ordem_ev,
            "registros": sum(eventos.values()),
        },
        "por_ano": {a: arredonda(v) for a, v in sorted(por_ano.items())},
        "por_mes": {m: arredonda(v) for m, v in sorted(por_mes.items())},
        "por_orgao": {o: {a: arredonda(v) for a, v in sorted(anos.items())}
                      for o, anos in sorted(por_orgao.items())},
        "fornecedores": fornecedores,
        # [data, valor, evento, orgao, empenho, índice em fornecedores]
        "top_lancamentos": top,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(saida, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"Gravado {OUT}: {len(fornecedores)} fornecedores, "
          f"{saida['meta']['registros']} registros, eventos {dict(eventos)}")


def _ordena_eventos(eventos):
    """'Pago' primeiro (é o que a página mostra por padrão), depois o resto."""
    pref = ["Pago", "Liquidado", "Empenhado"]
    return sorted(eventos, key=lambda e: (pref.index(e) if e in pref else 9, e))


def _top_por_evento(lancs):
    """Mantém os TOP_GERAL maiores de cada (evento, ano) — lista já ordenada."""
    cont = Counter()
    out = []
    for l in lancs:
        k = (l[2], l[0][:4])
        if cont[k] < TOP_GERAL:
            cont[k] += 1
            out.append(l)
    return out


if __name__ == "__main__":
    main()
