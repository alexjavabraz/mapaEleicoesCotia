"""Exploração temporária: baixa a página de viagens da Câmara e os arquivos linkados."""
import os, re, subprocess, sys, requests

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "Mozilla/5.0 (mapaEleicoesCotia)"
paginas = {
    "viagens": "https://www.cotia.sp.leg.br/relatorio-de-viagens",
    "transparencia": "https://www.cotia.sp.leg.br/transparencia-1",
    "contas": "http://www.cotia.sp.leg.br/contas-municipais",
}
links = set()
for nome, url in paginas.items():
    try:
        r = s.get(url, timeout=60)
        open(f"{out}/{nome}.html", "w").write(r.text)
        if nome == "viagens":
            links |= set(re.findall(r'href="([^"]+)"', r.text))
    except Exception as e:
        print(nome, e)

ids = []
for l in sorted(links):
    m = re.search(r"/d/([\w-]{20,})", l) or re.search(r"[?&]id=([\w-]{20,})", l)
    if m:
        ids.append((m.group(1), l))
    elif "siscam" in l:
        ids.append((None, l))
open(f"{out}/links.txt", "w").write("\n".join(sorted(links)))
for i, (fid, l) in enumerate(ids):
    url = f"https://drive.google.com/uc?export=download&id={fid}" if fid else l
    if "docs.google.com/document" in l and fid:
        url = f"https://docs.google.com/document/d/{fid}/export?format=txt"
    try:
        r = s.get(url, timeout=60)
    except Exception as e:
        print(l, e); continue
    ct = r.headers.get("content-type", "")
    base = f"{out}/f{i:03d}"
    with open(base + ".meta", "w") as fh:
        fh.write(f"{l}\n{url}\n{r.status_code} {ct} {len(r.content)}\n")
    if r.content[:4] == b"%PDF":
        open(base + ".pdf", "wb").write(r.content)
        subprocess.run(["pdftotext", "-layout", base + ".pdf", base + ".txt"])
        os.remove(base + ".pdf")
    elif "text" in ct:
        open(base + ".txt", "w").write(r.text[:200000])
    print(i, r.status_code, ct, len(r.content), l)
