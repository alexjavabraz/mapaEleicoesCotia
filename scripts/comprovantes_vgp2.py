#!/usr/bin/env python3
"""Sondagem 2: textos da lei do regime de adiantamento usada pela Câmara de VGP
(Lei 028/11, Lei 619/2011, Lei 35/2000) e de uma portaria de responsável."""
import re
import subprocess
import tempfile
from urllib.parse import urljoin, quote
import html
import requests

HTTP = requests.Session()
HTTP.headers["User-Agent"] = "Mozilla/5.0 (mapaEleicoesCotia)"
S = "https://vargemgrandepaulista.siscam.com.br"


def limpo(h):
    h = re.sub(r"<script.*?</script>|<style.*?</style>", " ", h, flags=re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def pdf(c):
    with tempfile.NamedTemporaryFile(suffix=".pdf") as f:
        f.write(c); f.flush()
        t = subprocess.run(["pdftotext", "-layout", f.name, "-"], capture_output=True, text=True).stdout
        if len(t.strip()) < 200:  # escaneado: OCR
            subprocess.run(["pdftoppm", "-r", "200", "-png", f.name, f.name + "p"], capture_output=True)
            import glob
            t = ""
            for img in sorted(glob.glob(f.name + "p*.png"))[:8]:
                t += subprocess.run(["tesseract", img, "-", "-l", "por"], capture_output=True, text=True).stdout
    return re.sub(r"\s+", " ", t)


def doc(url):
    r = HTTP.get(url, timeout=60)
    tx = limpo(r.text)
    m = re.search(r"Manual (.*?) Compartilhar.*?(Data:.*?)Arquivos", tx)
    print(f"\n######## {url}\n  {m.group(1) if m else ''} | {m.group(2)[:600] if m else tx[:400]}")
    for href in re.findall(r'href=["\']([^"\']+)["\']', r.text):
        h = urljoin(url, html.unescape(href))
        if re.search(r"Arquivo|Download|\.pdf", h, re.I) and "Manual.pdf" not in h:
            try:
                rr = HTTP.get(h, timeout=60)
            except Exception as e:
                print("   ", h, e); continue
            if rr.content[:4] == b"%PDF":
                t = pdf(rr.content)
                print(f"  --- PDF {h} ({len(t)} chars)\n  {t[:7000]}")


def busca(termo):
    r = HTTP.get(f"{S}/Home/Consulta?Pagina=1&Search={quote(termo)}&NoTexto=false", timeout=60)
    ids = []
    for href in re.findall(r'href=["\']([^"\']*Documentos/Documento/\d+)["\']', r.text):
        u = urljoin(S, href)
        if u not in ids:
            ids.append(u)
    tx = limpo(r.text)
    print(f"\n== busca {termo!r}: {len(ids)} documentos")
    for m in list(re.finditer(r"(Lei|Resolu|Portaria|Ato)[^.]{0,40}(adiantament|di[aá]ria)[^.]{0,200}", tx, re.I))[:10]:
        print("   …", m.group(0)[:300])
    return ids


if __name__ == "__main__":
    vistos = set()
    for termo in ["Lei 28/2011", "028/11", "619/2011", "regime de adiantamento", "Resolução diárias", "diárias vereadores"]:
        for u in busca(termo)[:6]:
            if u in vistos:
                continue
            vistos.add(u)
            pagina = limpo(HTTP.get(u, timeout=60).text)
            if re.search(r"adiantament|di[aá]ria", pagina, re.I) and re.search(r"Lei|Resolu|Portaria|Ato", pagina[:300]):
                doc(u)
    for u in [S + "/Documentos/Documento/25470", S + "/Documentos/Documento/12592", S + "/Documentos/Documento/12980"]:
        if u not in vistos:
            doc(u)
