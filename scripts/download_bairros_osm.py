#!/usr/bin/env python3
"""
Salva em data/osm_bairros_cotia.json a resposta da Overpass API com os
bairros/distritos de Cotia (mesma query de fetchCotiaBairros em js/map.js).

O mapa de 2024 lê esse arquivo local em vez de consultar a Overpass a cada
visita: a API é lenta (dezenas de segundos) e cai com frequência. O arquivo
guarda o JSON OSM bruto; a página continua convertendo com osmtogeojson, então
o que aparece no mapa é o mesmo da consulta ao vivo.

Uso:
    pip install -r requirements.txt
    python download_bairros_osm.py
"""

import json
import os
import sys
import time

import requests

QUERY = """
[out:json][timeout:90];
(
  relation["name"="Cotia"]["admin_level"="8"];
)->.municipio;
area.municipio->.area_mun;
(
  relation["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.area_mun);
  relation["place"~"^(suburb|neighbourhood|quarter|district|village|town|hamlet)$"](area.area_mun);
  way["place"~"^(suburb|neighbourhood|quarter|district)$"](area.area_mun);
);
out body;
>;
out skel qt;
""".strip()

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

SAIDA = os.path.join(os.path.dirname(__file__), "..", "data", "osm_bairros_cotia.json")


def baixar():
    for tentativa in range(3):
        for url in ENDPOINTS:
            try:
                print(f"Consultando {url} (tentativa {tentativa + 1})...")
                r = requests.post(url, data={"data": QUERY}, timeout=180,
                                  headers={"User-Agent": "mapaEleicoesCotia/1.0"})
                r.raise_for_status()
                data = r.json()
                if data.get("elements"):
                    return data
                print("  resposta sem elementos")
            except Exception as e:  # noqa: BLE001
                print(f"  falhou: {e}")
        time.sleep(20 * (tentativa + 1))
    return None


def main():
    data = baixar()
    if not data:
        print("Overpass indisponível — arquivo não atualizado.")
        sys.exit(1)
    # Só os campos que osmtogeojson usa; "osm3s" traz a data da consulta,
    # que mudaria o arquivo a cada execução.
    data = {"version": data.get("version"), "generator": data.get("generator"),
            "elements": data["elements"]}
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    tipos = {}
    for el in data["elements"]:
        tipos[el["type"]] = tipos.get(el["type"], 0) + 1
    print(f"Salvo {SAIDA}: {tipos}")


if __name__ == "__main__":
    main()
