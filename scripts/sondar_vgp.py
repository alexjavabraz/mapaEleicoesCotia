#!/usr/bin/env python3
"""
Sondagem (só leitura) das fontes de dados para Vargem Grande Paulista (SP).
Não gera arquivos para o site: imprime no log o que existe em cada fonte.

Uso: python sondar_vgp.py tse2024 | tse2026 | tce | censo | camara
"""

import csv
import html
import io
import json
import os
import re
import sys
import tempfile
import unicodedata
import zipfile
from collections import Counter, defaultdict
from urllib.parse import urljoin, urlparse

import requests

NOME = "VARGEM GRANDE PAULISTA"
IBGE = "3556453"
HTTP = requests.Session()
HTTP.headers["User-Agent"] = "mapaEleicoesCotia/1.0 (+https://github.com/alexjavabraz/mapaEleicoesCotia)"
TMP = tempfile.mkdtemp()
ODSELE = "https://cdn.tse.jus.br/estatistica/sead/odsele/"


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def titulo(t):
    print(f"\n{'=' * 70}\n{t}\n{'=' * 70}", flush=True)


def baixar(url, nome=None, tentativas=8):
    """Download com retomada (Range): o zip do TCE (2 GB) cai no meio."""
    destino = os.path.join(TMP, nome or url.rsplit("/", 1)[-1])
    print(f"baixando {url}", flush=True)
    total = None
    for t in range(tentativas):
        feito = os.path.getsize(destino) if os.path.exists(destino) else 0
        if total and feito >= total:
            break
        cab = {"Range": f"bytes={feito}-"} if feito else {}
        try:
            with HTTP.get(url, stream=True, timeout=180, headers=cab) as r:
                print(f"  HTTP {r.status_code}  {r.headers.get('content-length')} bytes (a partir de {feito})", flush=True)
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
                break
        except (requests.exceptions.ChunkedEncodingError, requests.exceptions.ConnectionError) as e:
            print(f"  conexão caiu ({type(e).__name__}), retomando...", flush=True)
    return destino


def linhas(z, nome, enc="latin-1"):
    with z.open(nome) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding=enc, newline=""),
                                  delimiter=";", quotechar='"')


def csvs(z, padrao=""):
    return [n for n in z.namelist() if n.lower().endswith(".csv") and re.search(padrao, n, re.I)]


def eh_vgp(row):
    return any(norm(row.get(c, "")) == NOME for c in ("NM_UE", "NM_MUNICIPIO", "DS_MUNICIPIO"))


# ---------------------------------------------------------------- TSE

def tse_candidatos():
    titulo("TSE consulta_cand_2024 (candidatos)")
    p = baixar(ODSELE + "consulta_cand/consulta_cand_2024.zip")
    sg_ue, cargos, eleitos = set(), Counter(), []
    with zipfile.ZipFile(p) as z:
        nome = csvs(z, "_SP\\.csv$")[0]
        for row in linhas(z, nome):
            if not eh_vgp(row):
                continue
            sg_ue.add(row["SG_UE"])
            cargos[row["DS_CARGO"]] += 1
            if row["DS_CARGO"].upper() == "VEREADOR" and "ELEITO" in row.get("DS_SIT_TOT_TURNO", "") \
                    and "NÃO" not in row["DS_SIT_TOT_TURNO"].upper():
                eleitos.append(f'{row["NM_URNA_CANDIDATO"]} ({row["SG_PARTIDO"]}) {row["DS_SIT_TOT_TURNO"]}')
            if row["DS_CARGO"].upper() == "PREFEITO":
                print(f'  prefeito: {row["NM_URNA_CANDIDATO"]} {row["SG_PARTIDO"]} {row["DS_SIT_TOT_TURNO"]}')
    os.remove(p)
    print(f"SG_UE: {sg_ue}\ncandidatos por cargo: {dict(cargos)}")
    print(f"vereadores eleitos ({len(eleitos)}):")
    for e in sorted(eleitos):
        print("  ", e)
    return sg_ue


def tse_bens(sg_ue):
    titulo("TSE bem_candidato_2024 (patrimônio)")
    p = baixar(ODSELE + "bem_candidato/bem_candidato_2024.zip")
    n, cands, total = 0, set(), 0.0
    with zipfile.ZipFile(p) as z:
        for row in linhas(z, csvs(z, "_SP\\.csv$")[0]):
            if row.get("SG_UE") in sg_ue:
                n += 1
                cands.add(row["SQ_CANDIDATO"])
                total += float((row.get("VR_BEM_CANDIDATO") or "0").replace(",", "."))
    os.remove(p)
    print(f"bens: {n} itens, {len(cands)} candidatos com bens, total R$ {total:,.2f}")


def tse_contas(sg_ue):
    titulo("TSE prestação de contas candidatos 2024 (custo por voto)")
    p = baixar(ODSELE + "prestacao_contas/prestacao_de_contas_eleitorais_candidatos_2024.zip")
    with zipfile.ZipFile(p) as z:
        for padrao in ("despesas_contratadas_candidatos_2024_SP", "despesas_pagas_candidatos_2024_SP",
                       "receitas_candidatos_2024_SP"):
            nomes = csvs(z, padrao)
            if not nomes:
                print(f"  {padrao}: não achado")
                continue
            n, cands, total = 0, set(), 0.0
            col_valor = None
            for row in linhas(z, nomes[0]):
                if col_valor is None:
                    col_valor = next((c for c in row if c.startswith("VR_")), None)
                if row.get("SG_UE") in sg_ue:
                    n += 1
                    cands.add(row.get("SQ_CANDIDATO") or row.get("NR_CANDIDATO"))
                    total += float((row.get(col_valor) or "0").replace(",", "."))
            print(f"  {nomes[0]}: {n} linhas, {len(cands)} candidatos, {col_valor} total R$ {total:,.2f}")
    os.remove(p)


def tse_munzona(ano):
    titulo(f"TSE votacao_candidato_munzona_{ano}")
    p = baixar(ODSELE + f"votacao_candidato_munzona/votacao_candidato_munzona_{ano}.zip")
    with zipfile.ZipFile(p) as z:
        for nome in csvs(z, "_(SP|BR)\\.csv$"):
            zonas, cargos, n = set(), Counter(), 0
            cod = set()
            for row in linhas(z, nome):
                if not eh_vgp(row):
                    continue
                n += 1
                zonas.add(row.get("NR_ZONA"))
                cod.add(row.get("CD_MUNICIPIO"))
                cargos[(row.get("DS_CARGO"), row.get("NR_TURNO"))] += 1
            print(f"  {nome}: {n} linhas, zonas {sorted(zonas)}, CD_MUNICIPIO {cod}")
            print(f"    cargos/turno: {dict(cargos)}")
    os.remove(p)


def tse_secao(ano):
    titulo(f"TSE votacao_secao_{ano}_SP (votos por seção → bairro)")
    p = baixar(ODSELE + f"votacao_secao/votacao_secao_{ano}_SP.zip")
    with zipfile.ZipFile(p) as z:
        nome = csvs(z)[0]
        secoes, locais, n = set(), {}, 0
        primeira = True
        for row in linhas(z, nome):
            if primeira:
                print("  colunas:", list(row.keys()))
                primeira = False
            if not eh_vgp(row):
                continue
            n += 1
            secoes.add((row["NR_ZONA"], row["NR_SECAO"]))
            if row.get("NR_LOCAL_VOTACAO"):
                locais[(row["NR_ZONA"], row["NR_LOCAL_VOTACAO"])] = row.get("NM_LOCAL_VOTACAO", "")
        print(f"  {nome}: {n} linhas, {len(secoes)} seções, {len(locais)} locais de votação")
        for k, v in sorted(locais.items())[:60]:
            print("    ", k, v)
    os.remove(p)


def tse_locais(ano):
    titulo(f"TSE eleitorado_local_votacao_{ano} (lat/lng e bairro dos locais)")
    try:
        p = baixar(ODSELE + f"eleitorado_locais_votacao/eleitorado_local_votacao_{ano}.zip")
    except Exception as e:
        print("  falhou:", e)
        return
    with zipfile.ZipFile(p) as z:
        print("  arquivos:", z.namelist()[:10])
        nome = (csvs(z, "_SP\\.csv$") or csvs(z))[0]
        secoes, com_coord, bairros, locais = 0, 0, Counter(), set()
        for row in linhas(z, nome):
            if not eh_vgp(row):
                continue
            secoes += 1
            lat = (row.get("NR_LATITUDE") or "").strip()
            if lat and lat not in ("-1", "0"):
                com_coord += 1
            bairros[row.get("NM_BAIRRO", "").strip()] += 1
            locais.add(row.get("NR_LOCAL_VOTACAO"))
        print(f"  {nome}: {secoes} seções, {com_coord} com coordenadas, {len(locais)} locais, "
              f"{len(bairros)} bairros (campo NM_BAIRRO)")
        for b, c in bairros.most_common(80):
            print(f"     {c:4d}  {b}")
    os.remove(p)


# ---------------------------------------------------------------- TCE-SP

TCE = "https://transparencia.tce.sp.gov.br"


def tce():
    titulo("TCE-SP API: lista de municípios")
    r = HTTP.get(TCE + "/api/json/municipios", timeout=60)
    print("HTTP", r.status_code)
    slug = None
    try:
        for m in r.json():
            if "vargem" in json.dumps(m, ensure_ascii=False).lower():
                print("  ", m)
                slug = m.get("municipio") or slug
    except ValueError:
        print(r.text[:500])
    slug = slug or "vargem-grande-paulista"
    print("slug:", slug)

    titulo(f"TCE-SP API despesas/{slug}: meses com dados, órgãos e campos")
    for ano in range(2020, 2027):
        regs = []
        for mes in (1, 6, 12):
            rr = HTTP.get(f"{TCE}/api/json/despesas/{slug}/{ano}/{mes}", timeout=180)
            try:
                d = rr.json()
            except ValueError:
                d = []
            regs += d if isinstance(d, list) else []
        orgaos = Counter(x.get("orgao") for x in regs)
        print(f"  {ano} (jan/jun/dez): {len(regs)} registros; órgãos {dict(orgaos)}")
        if regs and ano == 2025:
            print("  campos de um registro:", json.dumps(regs[0], ensure_ascii=False))
    rr = HTTP.get(f"{TCE}/api/json/receitas/{slug}/2025/1", timeout=120)
    print(f"  receitas/{slug}/2025/1: HTTP {rr.status_code}, {len(rr.content)} bytes")

    titulo("TCE-SP conjuntos de dados (CSV com elemento da despesa)")
    links = []
    for pag in ("/conjunto-de-dados", "/conjuntos-de-dados", "/dados-abertos"):
        try:
            rp = HTTP.get(TCE + pag, timeout=60)
        except Exception as e:
            print(f"  {pag}: {e}")
            continue
        achados = sorted(set(re.findall(r'href="([^"]+\.(?:zip|csv))"', rp.text, re.I)))
        print(f"  {pag}: HTTP {rp.status_code}, {len(achados)} links zip/csv")
        for a in achados[:60]:
            print("    ", a)
        links += [urljoin(TCE + pag, a) for a in achados]
    despesas = [u for u in links if re.search(r"despesas?-?_?2025", u, re.I)]
    url = despesas[0] if despesas else TCE + "/sites/default/files/conjunto-dados/despesas-2025.zip"
    try:
        p = baixar(url, "despesas-tce.zip")
    except Exception as e:
        print("  falhou:", e)
        return
    with zipfile.ZipFile(p) as z:
        print("  arquivos:", z.namelist())
        nome = csvs(z)[0]
        with z.open(nome) as f:
            cab = f.readline()
        for enc in ("utf-8-sig", "latin-1"):
            try:
                cab = cab.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        sep = ";" if cab.count(";") >= cab.count(",") else ","
        print(f"  {nome}: encoding {enc}, separador {sep!r}\n  cabeçalho: {cab.strip()}")

        def col(*chaves):
            for c in cab.strip().split(sep):
                c = c.strip().strip('"')
                if all(k in c.lower() for k in chaves):
                    return c
            return None

        c_mun, c_org, c_el = col("municipio"), col("orgao"), col("elemento")
        c_tp = col("tp_despesa") or col("evento") or col("tipo")
        c_vl = col("vl_") or col("valor")
        c_tpid, c_id = col("tp_identificador"), col("nr_identificador")
        c_forn = col("ds_despesa") or col("fornecedor") or col("credor")
        c_hist = col("historico")
        print(f"  colunas usadas: mun={c_mun} org={c_org} elem={c_el} tipo={c_tp} valor={c_vl} "
              f"id={c_id} forn={c_forn} hist={c_hist}")
        por_elem = defaultdict(lambda: defaultdict(float))
        camara_pf = defaultdict(float)
        camara_hist = []
        cotia_elem = defaultdict(float)
        orgs, tipos = Counter(), Counter()
        with z.open(nome) as f:
            leitor = csv.DictReader(io.TextIOWrapper(f, encoding=enc, errors="replace", newline=""),
                                    delimiter=sep)
            saida = open(os.environ.get("VGP_CSV", os.path.join(TMP, "vgp.csv")), "w", newline="", encoding="utf-8")
            grava = csv.DictWriter(saida, fieldnames=leitor.fieldnames, delimiter=";")
            grava.writeheader()
            for row in leitor:
                mun = norm(row.get(c_mun, ""))
                if mun not in (NOME, "COTIA"):
                    continue
                tp = row.get(c_tp, "") if c_tp else ""
                tipos[tp] += 1
                try:
                    vl = float((row.get(c_vl) or "0").replace(".", "").replace(",", ".")
                               if "," in (row.get(c_vl) or "") else (row.get(c_vl) or "0"))
                except ValueError:
                    vl = 0.0
                pago = "pag" in tp.lower()
                elem = row.get(c_el, "") if c_el else ""
                if mun == "COTIA":
                    if pago:
                        cotia_elem[elem] += vl
                    continue
                grava.writerow(row)
                org = row.get(c_org, "")
                orgs[org] += 1
                if not pago:
                    continue
                por_elem[org][elem] += vl
                if "CAMARA" in norm(org):
                    ident = (row.get(c_tpid, "") if c_tpid else "") + " " + (row.get(c_id, "") if c_id else "")
                    favorecido = (row.get(c_forn) if c_forn else "") or ident
                    el = norm(elem)
                    pf = "CPF" in ident.upper() or "FISICA" in norm(ident)
                    especial = any(k in el for k in ("DIARIA", "INDENIZ", "RESSARC", "RESTITU",
                                                     "PASSAGE", "LOCOMO", "SUPRIMENTO", "ADIANTAMENTO"))
                    if pf or especial:
                        camara_pf[(("PF " if pf else "") + elem, favorecido)] += vl
                        if especial and len(camara_hist) < 30:
                            camara_hist.append(row)
        saida.close()
        print(f"  tipos/eventos: {dict(tipos)}")
        print(f"  órgãos de VGP (linhas): {dict(orgs)}")
        for org, elems in por_elem.items():
            print(f"\n  PAGO por elemento — {org}")
            for e, v in sorted(elems.items(), key=lambda x: -x[1])[:45]:
                print(f"     R$ {v:16,.2f}  {e}")
        print("\n  Câmara: pagamentos a pessoas físicas e em diárias/indenizações/ressarcimentos")
        for (e, f), v in sorted(camara_pf.items(), key=lambda x: -x[1])[:80]:
            print(f"     R$ {v:12,.2f}  {e} | {f}")
        print("\n  Câmara: exemplos de lançamentos de diárias/indenizações")
        for row in camara_hist:
            print("    ", json.dumps(row, ensure_ascii=False)[:700])
        print(f"\n  Cotia (mesmo arquivo), PAGO por elemento, top 15:")
        for e, v in sorted(cotia_elem.items(), key=lambda x: -x[1])[:15]:
            print(f"     R$ {v:16,.2f}  {e}")
    os.remove(p)


# ---------------------------------------------------------------- IBGE

def censo():
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import download_censo as dc
    dc.CD_MUN_COTIA = IBGE
    titulo("IBGE Censo 2022: renda do responsável por setor (V06004/V06001/V06006)")
    vals, arquivo = dc.valores_cotia(TMP, ["V06004", "V06001", "V06006"])
    com_renda = {k: v for k, v in vals.items() if v.get("V06004") and v.get("V06001")}
    dom = sum(v["V06001"] for v in com_renda.values())
    media = sum(v["V06004"] * v["V06001"] for v in com_renda.values()) / dom if dom else 0
    print(f"  {arquivo}: {len(vals)} setores, {len(com_renda)} com renda; "
          f"renda média ponderada R$ {media:,.2f}; {dom:,.0f} domicílios")
    titulo("IBGE malha de setores 2022 (SP)")
    pontos = dc.pontos_setores(TMP, dc.URL_MALHA, r"^SP.*setores.*\.(zip|gpkg)$")
    print(f"  pontos de setores: {len(pontos)}")
    import geopandas as gpd
    for f in os.listdir(TMP):
        if f.lower().endswith(".gpkg"):
            g = gpd.read_file(os.path.join(TMP, f), where=f"CD_MUN = '{IBGE}'")
            for col in ("NM_BAIRRO", "NM_DIST", "NM_SUBDIST", "CD_SIT"):
                if col in g.columns:
                    print(f"  {col}: {dict(Counter(g[col].fillna('')).most_common(40))}")


# ---------------------------------------------------------------- Câmara

PALAVRAS = re.compile(r"di[aá]ria|verba|reembols|ressarc|indeniza|viage|adiantament|gabinete|"
                      r"transpar|despesa|subs[ií]dio|remunera|folha|combust|passage", re.I)
SITES = [
    "https://www.camaravgp.sp.gov.br/", "https://camaravgp.sp.gov.br/",
    "https://www.vargemgrandepaulista.sp.leg.br/", "https://vargemgrandepaulista.sp.leg.br/",
    "https://www.cmvgp.sp.gov.br/", "https://www.camaravargemgrandepaulista.sp.gov.br/",
    "https://www.camaravargemgrande.sp.gov.br/", "https://www.vgp.sp.leg.br/",
    "https://www.camaramunicipalvgp.sp.gov.br/",
    "https://www.vargemgrandepaulista.sp.gov.br/", "https://vargemgrandepaulista.sp.gov.br/",
]


def links_de(url, texto):
    out = []
    for href, rotulo in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', texto, re.I | re.S):
        rotulo = re.sub(r"<[^>]+>|\s+", " ", html.unescape(rotulo)).strip()
        out.append((urljoin(url, html.unescape(href)), rotulo[:90]))
    return out


def camara():
    titulo("Sites da Câmara e da Prefeitura de VGP")
    vivos = []
    for s in SITES:
        try:
            r = HTTP.get(s, timeout=30)
            t = re.search(r"<title>(.*?)</title>", r.text, re.I | re.S)
            print(f"  {s} -> HTTP {r.status_code} {r.url}  título: {t.group(1).strip()[:90] if t else ''}")
            if r.ok:
                vivos.append((r.url, r.text))
        except Exception as e:
            print(f"  {s} -> {type(e).__name__}")
    vistos = set()
    for base, texto in vivos:
        dominio = urlparse(base).netloc
        if dominio in vistos:
            continue
        vistos.add(dominio)
        titulo(f"Links relevantes em {base} (profundidade 2)")
        fila, visitados, relevantes = [(base, texto)], {base}, {}
        while fila and len(visitados) < 45:
            url, txt = fila.pop(0)
            for href, rotulo in links_de(url, txt):
                if not PALAVRAS.search(href + " " + rotulo):
                    continue
                relevantes[href] = rotulo
                if href in visitados or len(visitados) >= 45:
                    continue
                if re.search(r"\.(pdf|xlsx?|csv|zip|docx?)$", href, re.I):
                    continue
                visitados.add(href)
                try:
                    r = HTTP.get(href, timeout=30)
                    if "html" in r.headers.get("content-type", ""):
                        fila.append((r.url, r.text))
                except Exception:
                    pass
        for href, rotulo in sorted(relevantes.items()):
            print(f"   {rotulo!r:60} {href}")


CECAM = ["https://vargemgrande-cm.cecam.com.br/CECAM_SISTEMAS_PORT/",
         "http://vargemgrande-camara.cecam.com.br/CECAM_SISTEMAS_PORT/",
         "http://187.122.108.2/PortaldaTransparencia/"]
OUTRAS = ["https://www.camaravgp.sp.gov.br/site/artigo/pesquisax/100",
          "https://sistemas.vargemgrandepaulista.sp.gov.br/portal/transparencia"]


def cecam():
    """Lista todas as páginas dos portais de transparência da Câmara (CECAM)
    e abre as que falam de diárias, viagens, adiantamentos, verbas."""
    for base in CECAM + OUTRAS:
        titulo(f"Portal {base}")
        try:
            r = HTTP.get(base, timeout=60)
        except Exception as e:
            print(f"  {type(e).__name__}: {e}")
            continue
        print(f"  HTTP {r.status_code} {r.url}  {len(r.text)} bytes")
        todos = {}
        for href, rotulo in links_de(r.url, r.text):
            todos[href] = rotulo
        for href, rotulo in sorted(todos.items()):
            print(f"   {rotulo!r:60} {href}")
        alvo = re.compile(r"di[aá]ria|viage|adiantament|verba|ressarc|reembols|indeniza|suprimento|passage", re.I)
        for href, rotulo in todos.items():
            if not alvo.search(href + " " + rotulo):
                continue
            try:
                rr = HTTP.get(href, timeout=60)
            except Exception as e:
                print(f"\n  >> {href}: {type(e).__name__}")
                continue
            texto = re.sub(r"<script.*?</script>|<style.*?</style>", " ", rr.text, flags=re.S | re.I)
            texto = re.sub(r"<[^>]+>", " ", html.unescape(texto))
            texto = re.sub(r"\s+", " ", texto)
            print(f"\n  >> {rotulo!r} {href} HTTP {rr.status_code}\n     {texto[:2500]}")


def seguro(f, *a):
    try:
        return f(*a)
    except BaseException as e:  # segue para a próxima fonte
        print(f"  ERRO em {f.__name__}: {type(e).__name__}: {e}", flush=True)


if __name__ == "__main__":
    alvo = sys.argv[1]
    if alvo == "tse2024":
        sg = seguro(tse_candidatos) or set()
        seguro(tse_bens, sg)
        seguro(tse_contas, sg)
        seguro(tse_munzona, 2024)
        seguro(tse_locais, 2024)
        seguro(tse_secao, 2024)
    elif alvo == "tse2026":
        seguro(tse_munzona, 2026)
        seguro(tse_locais, 2026)
        seguro(tse_secao, 2026)
    elif alvo == "tce":
        seguro(tce)
    elif alvo == "censo":
        seguro(censo)
    elif alvo == "camara":
        seguro(camara)
    elif alvo == "cecam":
        seguro(cecam)
