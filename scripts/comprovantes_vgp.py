#!/usr/bin/env python3
"""Sondagem: os adiantamentos e diárias da Câmara de VGP têm comprovante ou
prestação de contas publicada? Lei 619/2011 (SISCAM), portal CECAM, site da Câmara."""
import html
import re
import sys
from urllib.parse import urljoin, quote

import requests

HTTP = requests.Session()
HTTP.headers["User-Agent"] = "Mozilla/5.0 (mapaEleicoesCotia; +github.com/alexjavabraz/mapaEleicoesCotia)"
SISCAM = "https://vargemgrandepaulista.siscam.com.br"
ALVO = re.compile(r"adiantament|di[aá]ria|presta[cç][aã]o de contas|comprovante|nota fiscal|viage|ressarc|reembols|suprimento", re.I)


def titulo(t):
    print(f"\n{'=' * 70}\n{t}\n{'=' * 70}", flush=True)


def limpo(h):
    h = re.sub(r"<script.*?</script>|<style.*?</style>", " ", h, flags=re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def links(url, h):
    out = []
    for href, rot in re.findall(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', h, re.I | re.S):
        out.append((urljoin(url, html.unescape(href)), limpo(rot)[:100]))
    return out


def get(u, **kw):
    try:
        r = HTTP.get(u, timeout=60, **kw)
        print(f"  GET {u} -> {r.status_code} {len(r.content)} bytes {r.headers.get('content-type','')}", flush=True)
        return r
    except Exception as e:
        print(f"  GET {u} -> {type(e).__name__}: {e}", flush=True)
        return None


def pdf_texto(conteudo):
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(conteudo); f.flush()
        return re.sub(r"\s+", " ", subprocess.run(["pdftotext", "-layout", f.name, "-"], capture_output=True, text=True).stdout)


def siscam():
    titulo("SISCAM: Lei 619/2011 e normas sobre adiantamento / diárias / prestação de contas")
    vistos = set()
    for termo in ["619/2011", "adiantamento", "regime de adiantamento", "diárias", "prestação de contas adiantamento", "Lei 619"]:
        r = get(f"{SISCAM}/Home/Consulta?Pagina=1&Search={quote(termo)}&NoTexto=false")
        if not r:
            continue
        tx = limpo(r.text)
        for m in list(re.finditer(r"adiantament|di[aá]ria|619", tx, re.I))[:8]:
            print("     …", tx[max(0, m.start() - 200):m.start() + 300])
        for href, rot in links(r.url, r.text):
            if ("Documentos" in href or href.lower().endswith(".pdf") or "Documento" in rot) and href not in vistos:
                vistos.add(href)
                print(f"     doc: {rot!r} {href}")
    titulo("SISCAM: abre os documentos achados e procura regras de prestação de contas")
    for href in list(vistos)[:25]:
        r = get(href)
        if not r or not r.ok:
            continue
        tx = pdf_texto(r.content) if r.content[:4] == b"%PDF" else limpo(r.text)
        if not re.search(r"adiantament|di[aá]ria", tx, re.I):
            continue
        print(f"\n  >>> {href} ({len(tx)} chars)")
        print("     ", tx[:6000])
        for sub_href, rot in (links(r.url, r.text) if r.content[:4] != b"%PDF" else []):
            if sub_href.lower().endswith(".pdf") or "Arquivo" in sub_href or "Download" in sub_href:
                rr = get(sub_href)
                if rr and rr.ok and rr.content[:4] == b"%PDF":
                    t2 = pdf_texto(rr.content)
                    print(f"\n  >>> PDF {sub_href} ({len(t2)} chars)\n     {t2[:8000]}")


CECAM = ["http://vargemgrande-camara.cecam.com.br/CECAM_SISTEMAS_PORT/",
         "https://vargemgrande-cm.cecam.com.br/CECAM_SISTEMAS_PORT/"]


def cecam():
    titulo("CECAM: todas as páginas (2 níveis) e as que falam de adiantamento/diária/comprovante")
    for base in CECAM:
        r = get(base)
        if not r or not r.ok:
            continue
        fila, vistos = [(r.url, r.text)], {r.url}
        todos = {}
        while fila and len(vistos) < 120:
            url, h = fila.pop(0)
            for href, rot in links(url, h):
                if "cecam" not in href and "187.122" not in href:
                    continue
                todos[href] = rot
                if href in vistos or re.search(r"\.(pdf|xls|csv|zip)$", href, re.I):
                    continue
                vistos.add(href)
                rr = get(href)
                if rr is not None and rr.ok and "html" in rr.headers.get("content-type", ""):
                    fila.append((rr.url, rr.text))
                    tx = limpo(rr.text)
                    if ALVO.search(tx):
                        for m in list(ALVO.finditer(tx))[:5]:
                            print(f"     [{href}] …{tx[max(0, m.start() - 200):m.start() + 300]}")
        print("\n  Todos os links do portal:")
        for href, rot in sorted(todos.items()):
            print(f"   {rot!r:70} {href}")
        break


def site():
    titulo("Site da Câmara: busca e páginas sobre adiantamento, diárias, prestação de contas")
    base = "https://www.camaravgp.sp.gov.br"
    r = get(base + "/")
    if not r:
        return
    alvos = {}
    for href, rot in links(r.url, r.text):
        if ALVO.search(href + " " + rot) or re.search(r"transpar|despesa|contas|legisla", href + rot, re.I):
            alvos[href] = rot
    for termo in ["adiantamento", "diárias", "prestação de contas"]:
        for pad in ("/site/busca?termo={t}", "/site/pesquisa?q={t}", "/?s={t}", "/site/artigo/pesquisax/100?busca={t}"):
            rr = get(base + pad.format(t=quote(termo)))
            if rr and rr.ok:
                tx = limpo(rr.text)
                for m in list(re.finditer(termo[:8], tx, re.I))[:4]:
                    print("     …", tx[max(0, m.start() - 200):m.start() + 300])
    for href, rot in sorted(alvos.items()):
        print(f"   {rot!r:60} {href}")
        rr = get(href)
        if rr and rr.ok and "html" in rr.headers.get("content-type", ""):
            tx = limpo(rr.text)
            for m in list(ALVO.finditer(tx))[:4]:
                print(f"       …{tx[max(0, m.start() - 200):m.start() + 300]}")
            for h2, r2 in links(rr.url, rr.text):
                if ALVO.search(h2 + " " + r2):
                    print(f"       link: {r2!r} {h2}")


if __name__ == "__main__":
    {"siscam": siscam, "cecam": cecam, "site": site}[sys.argv[1]]()
