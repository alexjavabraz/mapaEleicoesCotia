#!/usr/bin/env python3
"""
Gera ícones PNG para o PWA do Mapa Eleitoral de Cotia.
Usa apenas stdlib (struct + zlib) — sem PIL/cairosvg.

Design: escudo estilizado com as cores da bandeira de Cotia
  - Fundo escuro (tema da app)
  - Azul (metade superior) + Verde (metade inferior)
  - Faixa ondulada branca (Rio Cotia)
  - Estrela dourada
  - Texto "COTIA"
"""

import math
import os
import struct
import zlib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR  = os.path.join(SCRIPT_DIR, "..", "icons")
os.makedirs(ICONS_DIR, exist_ok=True)

# --- Cores ---
BG    = (22, 33, 62)    # #16213e — fundo da app
BLUE  = (0, 48, 135)    # #003087 — azul superior do escudo
GREEN = (27, 122, 46)   # #1b7a2e — verde inferior
WHITE = (255, 255, 255)
GOLD  = (255, 210, 0)   # #FFD200
SHIELD_BG = (240, 240, 240)  # fundo branco-acinzentado do escudo


# ---------------------------------------------------------------------------
# PNG helpers
# ---------------------------------------------------------------------------

def _chunk(ctype: bytes, data: bytes) -> bytes:
    c = ctype + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)


def write_png(path: str, w: int, h: int, pixels) -> None:
    """
    Grava PNG 24-bit.
    pixels: lista (comprimento w*h) de tuplas (r, g, b), linha a linha.
    """
    sig  = b"\x89PNG\r\n\x1a\n"
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))

    # Raw image data: 1 byte de filtro (0=None) por linha + rgb por pixel
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filtro
        for x in range(w):
            raw.extend(pixels[y * w + x])

    idat = _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    iend = _chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(sig + ihdr + idat + iend)
    print(f"  Salvo: {path}  ({w}×{h})")


# ---------------------------------------------------------------------------
# Funções de desenho auxiliares
# ---------------------------------------------------------------------------

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def point_in_polygon(px, py, pts):
    """Ray-casting para polígono convexo ou côncavo."""
    n = len(pts)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def star_polygon(cx, cy, r_out, r_in, n=5):
    """Retorna os vértices de uma estrela de n pontas."""
    pts = []
    for i in range(2 * n):
        angle = math.pi / 2 + i * math.pi / n
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(angle), cy - r * math.sin(angle)))
    return pts


# ---------------------------------------------------------------------------
# Renderiza o ícone
# ---------------------------------------------------------------------------

def render_icon(size: int):
    W = H = size
    cx, cy = W / 2.0, H / 2.0

    # Geometria do escudo (proporcional ao size)
    sh_l  = W * 0.18   # left
    sh_r  = W * 0.82   # right
    sh_t  = H * 0.10   # top
    sh_b  = H * 0.86   # base do escudo antes da ponta
    split = H * 0.46   # divisão azul/verde

    # Faixa branca (rio): y central e amplitude
    wave_y    = split
    wave_amp  = H * 0.04
    wave_half = H * 0.025   # meia-espessura da faixa

    # Estrela no topo azul
    star_cx   = cx
    star_cy   = H * 0.28
    star_rout = W * 0.13
    star_rin  = star_rout * 0.42
    star_pts  = star_polygon(star_cx, star_cy, star_rout, star_rin)

    # Montanha (triângulo branco atrás da estrela)
    mt_pts = [
        (cx,              sh_t + H * 0.04),
        (cx + W * 0.22,   split - H * 0.01),
        (cx - W * 0.22,   split - H * 0.01),
    ]

    # Coroa (série de trapézios)
    crown_y_base = sh_t - H * 0.01
    crown_y_top  = sh_t - H * 0.10
    crown_pts = [
        (cx - W * 0.24, crown_y_base),
        (cx - W * 0.20, crown_y_top + H * 0.04),
        (cx - W * 0.14, crown_y_base - H * 0.03),
        (cx - W * 0.08, crown_y_top),
        (cx,            crown_y_base - H * 0.02),
        (cx + W * 0.08, crown_y_top),
        (cx + W * 0.14, crown_y_base - H * 0.03),
        (cx + W * 0.20, crown_y_top + H * 0.04),
        (cx + W * 0.24, crown_y_base),
    ]

    pixels = []

    for y in range(H):
        for x in range(W):
            fx, fy = float(x), float(y)

            # --- Escudo: forma ---
            # O escudo é um retângulo com ponta triangular na base
            in_shield = False
            if sh_l <= fx <= sh_r:
                if sh_t <= fy <= sh_b:
                    in_shield = True
                elif sh_b < fy <= H * 0.90:
                    # Ponta do escudo: triângulo
                    frac = (fy - sh_b) / (H * 0.90 - sh_b)
                    margin = (sh_r - sh_l) / 2 * frac
                    if (sh_l + margin) <= fx <= (sh_r - margin):
                        in_shield = True

            if not in_shield:
                pixels.append(BG)
                continue

            # --- Interior do escudo ---

            # Coroa (dourada, acima do topo do escudo)
            if fy < sh_t and point_in_polygon(fx, fy, crown_pts):
                pixels.append(GOLD)
                continue

            # Montanha (triângulo branco)
            if point_in_polygon(fx, fy, mt_pts) and fy < split:
                base_color = WHITE
            else:
                base_color = None

            # Faixa ondulada branca (rio)
            wave_offset = wave_amp * math.sin(2 * math.pi * fx / W)
            dist_to_wave = abs(fy - (wave_y + wave_offset))
            in_wave = dist_to_wave < wave_half

            # Estrela dourada
            in_star = point_in_polygon(fx, fy, star_pts)

            if in_star:
                pixels.append(GOLD)
            elif in_wave:
                pixels.append(WHITE)
            elif base_color:
                pixels.append(base_color)
            elif fy < wave_y + wave_amp * math.sin(2 * math.pi * fx / W):
                pixels.append(BLUE)
            else:
                pixels.append(GREEN)

    return pixels


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    sizes = [
        (192,  "icon-192.png"),
        (512,  "icon-512.png"),
        (180,  "apple-touch-icon.png"),
        (32,   "favicon-32.png"),
    ]

    for size, name in sizes:
        pixels = render_icon(size)
        path   = os.path.join(ICONS_DIR, name)
        write_png(path, size, size, pixels)

    print("\nÍcones gerados com sucesso!")


if __name__ == "__main__":
    main()
