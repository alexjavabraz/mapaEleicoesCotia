#!/usr/bin/env python3
"""
Baixa a renda do Censo IBGE 2022 por setor censitário de Cotia/SP e grava um
JSON compacto que o mapa de 2024 usa para pintar os bairros por faixa de renda.

Fontes (FTP do IBGE, bloqueado no sandbox: roda no GitHub Actions, workflow
.github/workflows/censo.yml):
  - Agregados por setor (CSV):
    https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/
  - Malha de setores 2022:
    https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/
      malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/

Variável: rendimento nominal médio mensal das pessoas responsáveis pelos
domicílios particulares permanentes (Censo 2022, resultados do universo). O
código da variável é descoberto pelo dicionário de dados do IBGE e impresso no
log, junto com a distribuição dos valores em Cotia.

Uso:
    pip install -r requirements.txt geopandas pyogrio openpyxl
    python download_censo.py

Saída:
  ../data/censo_renda_setores.json
    {
      "_meta": { fonte, variavel, descricao, ano, salario_minimo, faixas, ... },
      "setores": [[lat, lng, renda_media, domicilios], ...],
      "bairros_tse": { "GRANJA VIANA": { renda_media, domicilios, setores, faixa }, ... }
    }
  O mapa calcula a renda de cada polígono (OSM ou Voronoi) com os pontos dos
  setores que caem dentro dele, ponderando pelo número de domicílios.
  "bairros_tse" atribui cada setor ao local de votação mais próximo (bairro do
  TSE) e serve de referência/fallback.
"""

import csv
import io
import json
import math
import os
import re
import sys
import tempfile
import unicodedata
import zipfile
from datetime import datetime, timezone
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("Dependências faltando. Execute: pip install -r requirements.txt")
    sys.exit(1)

CD_MUN_COTIA = "3513009"

# Salário mínimo de referência do Censo 2022 (agosto/2022)
SALARIO_MINIMO = 1212.0
# 3 faixas, em salários mínimos (limites superiores das duas primeiras).
# Com 2,5 e 5 SM os bairros de Cotia ficam ~24 / 27 / 7 (Censo 2022).
FAIXAS_SM = [2.5, 5.0]

URL_AGREGADOS = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/"
URL_CENSO_2022 = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/"
URL_AGREGADOS_2010 = ("https://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/"
                      "Resultados_do_Universo/Agregados_por_Setores_Censitarios/")
URL_MALHA_2010 = ("https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
                  "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2010/"
                  "setores_censitarios_shp/sp/")
# Renda do responsável por setor: publicada à parte (maio/2026)
URL_RENDA = URL_AGREGADOS.replace("Agregados_por_Setores_Censitarios/",
                                  "Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/")
URL_MALHA = ("https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/"
             "malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/setores/")

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(SCRIPT_DIR, "..", "data")
LOCAIS_FILE = os.path.join(DATA_DIR, "cotia_locais_votacao.json")
OUTPUT      = os.path.join(DATA_DIR, "censo_renda_setores.json")

HTTP = requests.Session()
HTTP.headers["User-Agent"] = "mapaEleicoesCotia/1.0 (+https://github.com/alexjavabraz/mapaEleicoesCotia)"


def sem_acento(s):
    return unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()


# ---- FTP (listagens HTML do Apache) ----

def listar(url):
    """Retorna os links (absolutos) de uma listagem de diretório do FTP do IBGE."""
    r = HTTP.get(url, timeout=60)
    r.raise_for_status()
    links = re.findall(r'href="([^"?#]+)"', r.text)
    out = []
    for h in links:
        if h.startswith("/") or h.startswith("..") or h.startswith("http"):
            continue
        out.append(urljoin(url, h))
    return out


def baixar(url, destino):
    print(f"  baixando {url}")
    with HTTP.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    print(f"  {os.path.getsize(destino) / 1e6:.1f} MB")
    return destino


def achar_arquivos(url, padrao, profundidade=3):
    """Busca recursiva por arquivos cujo nome casa com `padrao` (regex)."""
    achados = []
    try:
        itens = listar(url)
    except Exception as e:
        print(f"  (não listou {url}: {e})")
        return achados
    for item in itens:
        if item.endswith("/"):
            if profundidade > 0:
                achados += achar_arquivos(item, padrao, profundidade - 1)
        elif re.search(padrao, item.rsplit("/", 1)[-1], re.I):
            achados.append(item)
    return achados


# ---- Dicionário de dados: descobre a variável de renda ----

def descobrir_variavel(tmp, pasta=None):
    """Lê o dicionário de dados 2022 (da pasta de renda do responsável) e devolve
    ((código, descrição, tema, aba), variável de domicílios)."""
    import openpyxl

    pasta = pasta or URL_RENDA
    dic_urls = [u for u in listar(pasta) if re.search(r"dicionario.*\.xlsx$", u, re.I)]
    if not dic_urls:
        print("  Dicionário de dados não encontrado em " + pasta)
        return None, None
    caminho = baixar(sorted(dic_urls)[-1], os.path.join(tmp, "dicionario.xlsx"))

    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    candidatos = []
    todas = []
    for ws in wb.worksheets:
        print(f"  aba '{ws.title}'")
        tema_atual = ws.title
        for row in ws.iter_rows(values_only=True):
            cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
            if not cells:
                continue
            texto = " | ".join(cells)
            # Linhas de cabeçalho de tema costumam ter uma única célula
            if len(cells) == 1 and not re.match(r"^V\d", cells[0]):
                tema_atual = cells[0]
            cod = next((c for c in cells if re.fullmatch(r"V\d{3,6}", c)), None)
            if cod:
                todas.append((cod, texto))
            if not re.search(r"rendimento|renda", sem_acento(texto)):
                continue
            print(f"  [{ws.title}] {texto[:220]}")
            if cod:
                candidatos.append((cod, texto, tema_atual, ws.title))

    # Peso: domicílios particulares permanentes ocupados (descrição mais curta que casa)
    doms = [(c, t) for c, t in todas
            if "domicilios particulares permanentes ocupados" in sem_acento(t)
            and not re.search(r"moradores|media|pessoas|rendimento|especie|tipo", sem_acento(t))]
    doms.sort(key=lambda ct: (len(ct[1]), ct[0]))
    for c, t in doms[:5]:
        print(f"  peso candidato: {c} — {t[:160]}")
    var_dom = doms[0][0] if doms else "V0007"
    print(f"Peso (domicílios): {var_dom}")

    if not candidatos:
        print(f"  {len(todas)} variáveis no dicionário, nenhuma de rendimento.")
        return None, var_dom

    def pontos(c):
        t = sem_acento(c[1])
        p = 0
        if "medio" in t or "media" in t:
            p += 4
        if "responsav" in t:
            p += 3
        if "mediana" in t:
            p -= 2
        if "per capita" in t:
            p -= 1
        if "com rendimento" in t:
            p += 1
        return p

    candidatos.sort(key=pontos, reverse=True)
    escolhido = candidatos[0]
    print(f"\nVariável escolhida: {escolhido[0]} — {escolhido[1][:200]} (tema: {escolhido[2]} / aba {escolhido[3]})")

    return escolhido, var_dom


# ---- Agregados por setor: valores da variável para Cotia ----

def ler_csv_zip(caminho_zip, variaveis):
    """Lê os CSVs do zip e devolve {CD_SETOR: {var: valor}} para Cotia,
    ou None se nenhuma das variáveis existe no arquivo."""
    resultado = {}
    achou_coluna = False
    with zipfile.ZipFile(caminho_zip) as z:
        for nome in z.namelist():
            if not nome.lower().endswith(".csv"):
                continue
            raw = z.read(nome)
            for enc in ("utf-8-sig", "latin-1"):
                try:
                    texto = raw.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            primeira = texto.split("\n", 1)[0]
            sep = ";" if primeira.count(";") >= primeira.count(",") else ","
            leitor = csv.DictReader(io.StringIO(texto), delimiter=sep)
            campos = {f.strip().upper(): f for f in (leitor.fieldnames or [])}
            cols = {v: campos[v.upper()] for v in variaveis if v.upper() in campos}
            col_set = campos.get("CD_SETOR")
            if not cols or not col_set:
                continue
            achou_coluna = True
            print(f"  {nome}: colunas {sorted(cols)} encontradas")
            for linha in leitor:
                cd = (linha.get(col_set) or "").strip()
                if not cd.startswith(CD_MUN_COTIA):
                    continue
                resultado.setdefault(cd, {}).update({v: numero(linha.get(c)) for v, c in cols.items()})
    return resultado if achou_coluna else None


def numero(v):
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.upper() == "X" or s == ".":
        return None  # suprimido por sigilo
    s = s.replace(".", "").replace(",", ".") if "," in s else s
    try:
        return float(s)
    except ValueError:
        return None


def valores_cotia(tmp, variaveis):
    """Procura a variável nos zips CSV por setor: primeiro os de renda do
    responsável, depois os agregados gerais (básico primeiro)."""
    pasta = URL_RENDA
    zips = [u for u in listar(URL_RENDA)
            if re.search(r"^Agregados_por_setores.*csv\.zip$", u.rsplit("/", 1)[-1], re.I)]
    zips += [u for u in listar(urljoin(URL_AGREGADOS, "Agregados_por_Setor_csv/"))
             if u.lower().endswith(".zip")]
    # renda/rendimento primeiro, depois básico, depois o resto
    def ordem(u):
        n = u.lower()
        return (0 if "rend" in n or "renda" in n else 1 if "basico" in n else 2, n)
    zips.sort(key=ordem)  # estável: renda do responsável continua na frente
    print("Zips de agregados por setor:\n  " + "\n  ".join(z.rsplit("/", 1)[-1] for z in zips))
    for i, url in enumerate(zips):
        destino = os.path.join(tmp, f"agregado_{i}.zip")
        baixar(url, destino)
        vals = ler_csv_zip(destino, variaveis)
        os.remove(destino)
        if vals is not None:
            print(f"  → {len(vals)} setores de Cotia em {url.rsplit('/', 1)[-1]}")
            return vals, url.rsplit("/", 1)[-1]
    raise SystemExit(f"Variáveis {variaveis} não encontradas em nenhum zip de {pasta}")


# ---- Malha: ponto representativo de cada setor ----

def pontos_setores(tmp, url_base, padrao):
    import geopandas as gpd

    candidatos = achar_arquivos(url_base, padrao)
    print("Malhas de SP encontradas:\n  " + "\n  ".join(candidatos))
    if not candidatos:
        raise SystemExit("Malha de setores de SP não encontrada em " + url_base)
    # Prefere gpkg; senão shapefile zipado
    candidatos.sort(key=lambda u: (0 if u.lower().endswith(".gpkg") else 1, u))
    url = candidatos[0]
    destino = baixar(url, os.path.join(tmp, url.rsplit("/", 1)[-1]))
    caminho = destino if destino.lower().endswith(".gpkg") else f"zip://{destino}"

    gdf = gpd.read_file(caminho)
    print(f"  colunas: {list(gdf.columns)}")
    # 2022: CD_SETOR / CD_MUN; 2010: CD_GEOCODI (o município são os 7 primeiros dígitos)
    col_setor = next(c for c in gdf.columns if c.upper() in ("CD_SETOR", "CD_GEOCODI"))
    gdf = gdf[gdf[col_setor].astype(str).str.startswith(CD_MUN_COTIA)]
    print(f"  {len(gdf)} setores de Cotia na malha (CRS {gdf.crs})")
    gdf = gdf.to_crs(4326)
    pts = gdf.geometry.representative_point()
    return {str(cd): (round(p.y, 5), round(p.x, 5)) for cd, p in zip(gdf[col_setor], pts)}


# ---- Agregação por bairro do TSE (local de votação mais próximo) ----

def faixa(renda):
    sm = renda / SALARIO_MINIMO
    for i, lim in enumerate(FAIXAS_SM):
        if sm <= lim:
            return i + 1
    return len(FAIXAS_SM) + 1


def bairros_tse(setores):
    with open(LOCAIS_FILE, encoding="utf-8") as f:
        locais = json.load(f)
    pts = []
    for l in locais:
        try:
            lat, lng = float(l["NR_LATITUDE"]), float(l["NR_LONGITUDE"])
        except (KeyError, TypeError, ValueError):
            continue
        if lat == -1 or lng == -1 or not l.get("NM_BAIRRO"):
            continue
        pts.append((lat, lng, l["NM_BAIRRO"].strip()))

    soma = {}
    for lat, lng, renda, dom in setores:
        coslat = math.cos(math.radians(lat))
        _, _, bairro = min(pts, key=lambda p: (p[0] - lat) ** 2 + ((p[1] - lng) * coslat) ** 2)
        s = soma.setdefault(bairro, [0.0, 0.0, 0])
        s[0] += renda * dom
        s[1] += dom
        s[2] += 1
    out = {}
    for bairro, (rd, dom, n) in sorted(soma.items()):
        if dom <= 0:
            continue
        media = rd / dom
        out[bairro] = {"renda_media": round(media, 2), "domicilios": int(dom), "setores": n, "faixa": faixa(media)}
    return out


def censo_2022(tmp):
    """(dados {CD_SETOR: (renda, domicílios)}, pontos, meta) ou None sem renda por setor."""
    print("1. Dicionário de dados 2022 da renda do responsável")
    escolhido, _ = descobrir_variavel(tmp, URL_RENDA)
    # Peso: V06001 = pessoas responsáveis em domicílios particulares permanentes
    # ocupados (= nº de domicílios), no mesmo arquivo da renda (dicionário 20260508).
    var_dom = "V06001"
    if not escolhido:
        print("  Outras pastas do Censo 2022 com renda/rendimento no nome:")
        for u in achar_arquivos(URL_CENSO_2022, r"rend", profundidade=2):
            print("   ", u)
        return None
    cod, descricao, _, _ = escolhido

    print(f"\n2. Valores por setor de Cotia ({cod} e peso {var_dom})")
    valores, arquivo = valores_cotia(tmp, [cod, var_dom])

    print("\n3. Malha de setores 2022")
    pontos = pontos_setores(tmp, URL_MALHA, r"^SP.*setores.*\.(zip|gpkg)$")

    dados = {cd: (v.get(cod), v.get(var_dom)) for cd, v in valores.items()}
    meta = {
        "fonte": "IBGE, Censo Demográfico 2022 — Agregados por setores censitários",
        "arquivo": arquivo, "variavel": cod, "variavel_domicilios": var_dom,
        "descricao": descricao, "ano": 2022, "salario_minimo": 1212.0,
    }
    return dados, pontos, meta


def censo_2010(tmp):
    """Plano B: Censo 2010, Basico_SP2.csv (V005 = rendimento nominal médio mensal
    dos responsáveis por domicílios particulares permanentes; V001 = domicílios)."""
    print("\n== Censo 2010 (plano B) ==")
    zips = [u for u in listar(URL_AGREGADOS_2010) if re.search(r"SP_Exceto_Capital.*\.zip$", u, re.I)]
    if not zips:
        raise SystemExit("Agregados 2010 de SP não encontrados em " + URL_AGREGADOS_2010)
    url = sorted(zips)[-1]
    destino = baixar(url, os.path.join(tmp, "sp2010.zip"))
    dados = {}
    with zipfile.ZipFile(destino) as z:
        nomes = [n for n in z.namelist() if re.search(r"basico_sp\d?\.csv$", n, re.I)]
        print("  arquivos básicos:", nomes)
        for nome in nomes:
            texto = z.read(nome).decode("latin-1")
            leitor = csv.DictReader(io.StringIO(texto), delimiter=";")
            campos = {f.strip().upper(): f for f in (leitor.fieldnames or [])}
            c_set, c_rend, c_dom = campos.get("COD_SETOR"), campos.get("V005"), campos.get("V001")
            if not (c_set and c_rend and c_dom):
                print(f"  {nome}: colunas esperadas ausentes ({list(campos)[:12]})")
                continue
            for linha in leitor:
                cd = (linha.get(c_set) or "").strip()
                if cd.startswith(CD_MUN_COTIA):
                    dados[cd] = (numero(linha.get(c_rend)), numero(linha.get(c_dom)))
    os.remove(destino)
    print(f"  {len(dados)} setores de Cotia")
    if not dados:
        raise SystemExit("Nenhum setor de Cotia nos agregados 2010.")

    print("\nMalha de setores 2010")
    pontos = pontos_setores(tmp, URL_MALHA_2010, r"setores.*\.zip$")
    meta = {
        "fonte": "IBGE, Censo Demográfico 2010 — Resultados do universo, agregados por setores censitários",
        "arquivo": url.rsplit("/", 1)[-1], "variavel": "V005", "variavel_domicilios": "V001",
        "descricao": "Valor do rendimento nominal médio mensal das pessoas responsáveis por domicílios particulares permanentes",
        "ano": 2010, "salario_minimo": 510.0,
    }
    return dados, pontos, meta


def main():
    global SALARIO_MINIMO
    with tempfile.TemporaryDirectory() as tmp:
        r = censo_2022(tmp)
        if r is None:
            print("\nCenso 2022 sem renda por setor publicada; usando o Censo 2010.")
            r = censo_2010(tmp)
    dados, pontos, meta = r
    SALARIO_MINIMO = meta["salario_minimo"]

    setores = []
    sem_ponto = sem_renda = 0
    for cd, (renda, dom) in dados.items():
        if renda is None or not dom:
            sem_renda += 1
            continue
        if cd not in pontos:
            sem_ponto += 1
            continue
        lat, lng = pontos[cd]
        setores.append([lat, lng, round(renda, 2), int(dom)])
    print(f"\n{len(setores)} setores válidos ({sem_renda} sem renda/domicílios por sigilo, {sem_ponto} sem geometria)")
    if not setores:
        raise SystemExit("Nenhum setor válido; abortando sem gravar.")

    rendas = sorted(s[2] for s in setores)
    q = lambda p: rendas[min(len(rendas) - 1, int(p * len(rendas)))]
    total_dom = sum(s[3] for s in setores)
    media_cotia = sum(s[2] * s[3] for s in setores) / total_dom
    print(f"Renda média Cotia (ponderada por domicílio): R$ {media_cotia:,.2f}")
    print(f"Quartis por setor: Q1 {q(.25):,.0f}  mediana {q(.5):,.0f}  Q3 {q(.75):,.0f}  máx {rendas[-1]:,.0f}")
    for i in range(1, len(FAIXAS_SM) + 2):
        n = sum(1 for s in setores if faixa(s[2]) == i)
        print(f"  faixa {i}: {n} setores")

    bairros = bairros_tse(setores)
    for b, d in bairros.items():
        print(f"  {b:45s} R$ {d['renda_media']:>10,.0f}  faixa {d['faixa']}  ({d['setores']} setores)")

    saida = {
        "_meta": {
            **meta,
            "municipio": CD_MUN_COTIA,
            "faixas_sm": FAIXAS_SM,
            "renda_media_municipio": round(media_cotia, 2),
            "campos_setor": ["lat", "lng", "renda_media", "domicilios"],
            "gerado_em": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "setores": sorted(setores),
        "bairros_tse": bairros,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print(f"\nGravado {OUTPUT} ({os.path.getsize(OUTPUT) / 1e3:.0f} KB)")


if __name__ == "__main__":
    main()
