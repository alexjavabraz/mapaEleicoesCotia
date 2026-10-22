#!/usr/bin/env python3
"""
Baixa os relatórios de viagens da Câmara Municipal de Cotia e gera
data/viagens_camara.json para a seção "Viagens da Câmara" de cotia/contas.html.

Uso:
    python download_viagens.py

Fonte: https://www.cotia.sp.leg.br/relatorio-de-viagens — uma página com links
(Google Drive / Google Docs) para um PDF por viagem, identificado pelo número
do Ato da Mesa (vereadores) ou da Portaria (servidores). Cada PDF tem o mesmo
formulário:

    Ato da Mesa nº / Portaria nº, Período da Viagem, Nome do Vereador
    (ou Servidor), Destino, Motivo da Viagem, Valor das Passagens aéreas,
    Valor Total da Hospedagem, Observação (adiantamento usado/devolvido)

Precisa de pdftotext (poppler-utils) e, para PDFs escaneados, pdftoppm +
tesseract com o idioma "por". Arquivos que não puderam ser lidos (privados no
Drive, ilegíveis) ficam listados em meta.nao_lidos.
"""

import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("Dependências faltando. Execute: pip install -r requirements.txt")
    sys.exit(1)

PAGINA = "https://www.cotia.sp.leg.br/relatorio-de-viagens"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "viagens_camara.json")

# Variações de grafia do mesmo vereador nos relatórios -> nome canônico
# (chave já sem acento, em maiúsculas, sem "DR." e sem apelido).
ALIASES = {
    "IRAN SOARES LUCA": "IRAN SOARES LUCAS",
    "SILVIO BUENO CABRAL DE MEDEIROS FILHO": "SILVIO ROBERTO BUENO CABRAL DE MEDEIROS FILHO",
    "SILVIO ROBERTO B. CABRAL DE MEDEIROS FILHO": "SILVIO ROBERTO BUENO CABRAL DE MEDEIROS FILHO",
    "SILVIO CABRAL": "SILVIO ROBERTO BUENO CABRAL DE MEDEIROS FILHO",
    "YAGO NERES BEZERRA": "YAGO BEZERRA NERES",
    "YAGO B.NERES": "YAGO BEZERRA NERES",
    "YAGO B. NERES": "YAGO BEZERRA NERES",
    "JOHNY SANTOS": "JOHNY DA SILVA SANTOS",
    "FELIPE A. ARAUJO": "FELIPE AUGUSTO ARAUJO",
    "LETICIA C.B. DE OLIVEIRA": "LETICIA CRISTINA BRANCO DE OLIVEIRA",
    "MARILDA A. M. DE PAULA": "MARILDA AMELIA MARTINS DE PAULA",
    "EDSONSILVA": "EDSON DA SILVA",  # OCR
}

ROTULOS = [
    ("ato", r"(?:Ato da Mesa|Portaria)\s*n[º°o.]*"),
    ("periodo", r"Per[ií]odo da Viagem"),
    ("nomes", r"Nomes?\s+d[oa]s?\s+(?:Vereador(?:es)?|Servidor(?:es)?|Servidoras?)|Servidor(?:es)?|Vereador(?:es)?"),
    ("destino", r"Destino"),
    ("motivo", r"Motivo da Viagem"),
    ("passagens", r"Valor das Passagens(?:\s+a[ée]reas)?"),
    ("hospedagem", r"Valor Total da Hospedagem"),
    ("obs", r"Observa[çc][ãa]o"),
]


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def parse_valor(s):
    """'R$ 2.886,63' -> 2886.63; aceita o erro de digitação 'R$ 2.66345'."""
    m = re.search(r"R\$\s*([\d.,]+)", s or "")
    if not m:
        return 0.0
    v = m.group(1).rstrip(".,")
    if "," in v:
        return float(v.replace(".", "").replace(",", "."))
    if re.fullmatch(r"\d{1,3}\.\d{5}", v):  # vírgula esquecida: 2.66345
        return int(v.replace(".", "")) / 100
    return float(v.replace(".", ""))


def valores(s):
    return [parse_valor("R$ " + x) for x in re.findall(r"R\$\s*([\d.,]*\d)", s or "")]


def adiantamento_usado(obs, n_pessoas):
    """
    Quanto do adiantamento (alimentação e transporte local) foi efetivamente
    gasto, lido do texto livre da Observação. Retorna (valor, lido_com_certeza).
    """
    o = sem_acento(obs).lower()
    m = re.search(r"(?:utilizad[oa]|usad[oa]|gast[oa]|utilizacao de)\s+(?:o\s+)?(?:valor\s+)?(?:de\s+)?r\$\s*([\d.,]*\d)", o)
    if m:
        return parse_valor("R$ " + m.group(1)), True
    m = re.search(r"aliment\w*[^.]*?foi de r\$\s*([\d.,]*\d)", o)
    if m:
        return parse_valor("R$ " + m.group(1)), True
    if re.search(r"nao houve|nao teve|nao solicitou|nao foi utilizad|ressarcimento total|devolucao integral|"
                 r"valor integral, conforme|restituido o valor total|cancelamento da viagem", o):
        return 0.0, True
    vs = valores(obs)
    if re.search(r"(utilizad|usad)o?\s+o\s+valor\s+(integral|total)", o) and vs:
        total = re.search(r"totalizando\s+r\$\s*([\d.,]*\d)", o)
        if total:
            return parse_valor("R$ " + total.group(1)), True
        return vs[0] * (n_pessoas if "cada" in o else 1), True
    if "devolv" in o and len(vs) >= 2:
        return max(vs[0] - vs[1], 0.0), True
    return 0.0, False


def separa_nomes(s):
    s = re.sub(r"\s+", " ", s).strip().rstrip(".")
    partes = re.split(r",\s*|\s+E\s+", s)
    return [p.strip() for p in partes if p.strip()]


def nome_canonico(n):
    """Devolve (chave, nome para exibição)."""
    exib = re.sub(r"^(DR|DRA)\.?\s+", "", n.strip().rstrip("."), flags=re.I)
    exib = re.split(r"\s+[–—-]\s+|-(?=[A-ZÀ-Ú]+$)", exib)[0].strip()  # remove apelido
    exib = re.sub(r"\b(DA|DE|DO|DOS|DAS)(SILVA|SOUZA|SANTOS)\b", r"\1 \2", exib)  # OCR: "DASILVA"
    chave = sem_acento(exib).upper()
    chave = ALIASES.get(chave, chave)
    return chave, exib


def extrai_campos(texto):
    """Um PDF pode trazer mais de um relatório; devolve um dict por relatório."""
    texto = texto.replace("﻿", "")
    blocos = re.split(r"Relat[óo]rio\s+de\s+Viage[mn]s?", texto, flags=re.I)
    alternancia = "|".join(f"(?P<{k}>{r})\\s*:?" for k, r in ROTULOS)
    saida = []
    for b in blocos:
        achados = list(re.finditer(rf"(?:^|\n)\s*(?:{alternancia})", b, flags=re.I))
        # Só a primeira ocorrência de cada rótulo delimita campo: uma linha da
        # Observação que começa com "Vereador ..." não pode cortar o texto.
        vistos = set()
        achados = [m for m in achados if not (m.lastgroup in vistos or vistos.add(m.lastgroup))]
        if not achados:
            continue
        campos = {}
        for i, m in enumerate(achados):
            k = m.lastgroup
            fim = achados[i + 1].start() if i + 1 < len(achados) else len(b)
            campos.setdefault(k, re.sub(r"\s+", " ", b[m.end():fim]).strip())
        if campos.get("nomes") and (campos.get("passagens") or campos.get("hospedagem")):
            campos["_servidor"] = bool(re.search(r"Servidor", b[achados[0].start():], re.I)) and \
                not re.search(r"Nome do Vereador", b, re.I)
            saida.append(campos)
    return saida


def pdf_para_texto(conteudo):
    with tempfile.TemporaryDirectory() as d:
        pdf = os.path.join(d, "a.pdf")
        open(pdf, "wb").write(conteudo)
        txt = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True).stdout
        if len(txt.strip()) > 50 or not shutil.which("tesseract"):
            return txt, False
        # PDF escaneado: OCR página a página
        subprocess.run(["pdftoppm", "-r", "300", "-png", pdf, os.path.join(d, "p")], check=False)
        partes = []
        for png in sorted(f for f in os.listdir(d) if f.endswith(".png")):
            r = subprocess.run(["tesseract", os.path.join(d, png), "-", "-l", "por"],
                               capture_output=True, text=True)
            partes.append(r.stdout)
        return "\n".join(partes), True


def baixar(sess, href):
    m = re.search(r"/d/([\w-]{20,})", href) or re.search(r"[?&]id=([\w-]{20,})", href)
    if not m:
        return None
    fid = m.group(1)
    if "docs.google.com/document" in href:
        r = sess.get(f"https://docs.google.com/document/d/{fid}/export?format=txt", timeout=60)
        return ("txt", r.text) if r.ok and "accounts.google.com" not in r.url else None
    r = sess.get(f"https://drive.google.com/uc?export=download&id={fid}", timeout=60)
    if r.ok and r.content[:4] == b"%PDF":
        return ("pdf", r.content)
    return None


def ano_de(ato, periodo, rotulo):
    for s in (ato, rotulo, periodo):
        m = re.search(r"(20\d{2})", s or "")
        if m:
            return m.group(1)
    return ""


def main():
    sess = requests.Session()
    sess.headers["User-Agent"] = "Mozilla/5.0 (mapaEleicoesCotia; +github.com/alexjavabraz/mapaEleicoesCotia)"
    pagina = sess.get(PAGINA, timeout=60)
    pagina.raise_for_status()

    links = []
    vistos = set()
    for href, rotulo in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', pagina.text, re.S):
        href = html.unescape(href)
        if not re.search(r"drive\.google|docs\.google", href) or href in vistos:
            continue
        vistos.add(href)
        links.append((href, re.sub(r"<[^>]+>|\s+", " ", html.unescape(rotulo)).strip()))
    print(f"{len(links)} arquivos linkados")

    viagens, nao_lidos, ocr = [], [], 0
    for href, rotulo in links:
        arq = None
        for tentativa in range(3):  # o Drive às vezes recusa downloads em sequência
            try:
                arq = baixar(sess, href)
            except requests.RequestException as e:
                print("  erro", href, e)
            if arq or "open?id=0B" in href:  # links antigos "0B…" são privados
                break
            time.sleep(5 * (tentativa + 1))
        time.sleep(0.5)
        if arq is None:
            nao_lidos.append({"rotulo": rotulo, "url": href, "motivo": "arquivo privado ou indisponível"})
            continue
        if arq[0] == "pdf":
            texto, usou_ocr = pdf_para_texto(arq[1])
            ocr += usou_ocr
        else:
            texto, usou_ocr = arq[1], False
        relatorios = extrai_campos(texto)
        relatorios = [r for r in relatorios if valores(r.get("passagens", "") + r.get("hospedagem", ""))
                      or re.search(r"\w{3}", r.get("destino", ""))]
        if not relatorios:
            # o modelo em branco (sem dados) também cai aqui
            if not re.search(r"Nome d[oa]s? Vereador\s*:?\s*\n\s*Destino", texto):
                nao_lidos.append({"rotulo": rotulo, "url": href, "motivo": "texto ilegível"})
            continue
        for c in relatorios:
            nomes = separa_nomes(c["nomes"])
            if not nomes:
                continue
            pass_ = parse_valor(c.get("passagens"))
            hosp = parse_valor(c.get("hospedagem"))
            usado, certo = adiantamento_usado(c.get("obs", ""), len(nomes))
            pessoas = [nome_canonico(n) for n in nomes]
            viagens.append({
                # o rótulo do link é mais confiável que o número lido por OCR
                "ato": rotulo if re.fullmatch(r"\d+[/-]\d{4}", rotulo)
                else re.sub(r"\s+", "", c.get("ato", "")).rstrip(".") or rotulo,
                "tipo": "servidor" if c["_servidor"] else "vereador",
                "ano": ano_de(c.get("ato"), c.get("periodo"), rotulo),
                "periodo": c.get("periodo", "").rstrip("."),
                "pessoas": [k for k, _ in pessoas],
                "destino": c.get("destino", "").rstrip("."),
                "motivo": c.get("motivo", ""),
                "passagens": round(pass_, 2),
                "hospedagem": round(hosp, 2),
                "adiantamento_usado": round(usado, 2),
                "adiantamento_lido": certo,
                "total": round(pass_ + hosp + usado, 2),
                "obs": c.get("obs", ""),
                "url": href,
                "ocr": usou_ocr,
                "_exib": dict(pessoas),
            })

    # Dedup (o mesmo relatório às vezes aparece em dois links)
    unicos = {}
    for v in viagens:
        unicos.setdefault((v["ato"], tuple(v["pessoas"]), v["total"]), v)
    viagens = sorted(unicos.values(), key=lambda v: (v["ano"], v["ato"]))

    # Nome de exibição: a grafia mais frequente de cada pessoa
    grafias = defaultdict(lambda: defaultdict(int))
    for v in viagens:
        for k, exib in v.pop("_exib").items():
            grafias[k][exib] += 1
    nomes = {k: max(g.items(), key=lambda x: x[1])[0] for k, g in grafias.items()}

    saida = {
        "meta": {
            "fonte": "Câmara Municipal de Cotia — Relatório de Viagens",
            "url": PAGINA,
            "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "arquivos": len(links),
            "viagens": len(viagens),
            "ocr": ocr,
            "nao_lidos": nao_lidos,
        },
        "nomes": nomes,
        "viagens": viagens,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(saida, fh, ensure_ascii=False, separators=(",", ":"))
    duvidosos = sum(1 for v in viagens if not v["adiantamento_lido"])
    print(f"Gravado {OUT}: {len(viagens)} viagens, {len(nao_lidos)} arquivos não lidos, "
          f"{ocr} via OCR, {duvidosos} com adiantamento não interpretado")


if __name__ == "__main__":
    main()
