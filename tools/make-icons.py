"""Erzeugt die App-Icons (PNG) mit Pillow: python3 tools/make-icons.py"""
from PIL import Image, ImageDraw

def icon(size, path):
    s = 4  # Supersampling für glatte Kanten
    S = size * s
    img = Image.new("RGB", (S, S), "#12161f")
    d = ImageDraw.Draw(img)
    pad, gap = S * 0.14, S * 0.04
    cell = (S - 2 * pad - gap) / 2
    pattern = [["O", "X"], ["X", "O"]]
    for r in range(2):
        for c in range(2):
            x0 = pad + c * (cell + gap)
            y0 = pad + r * (cell + gap)
            d.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=cell * 0.16,
                                fill="#46536b" if (r + c) % 2 == 0 else "#273043")
            m = cell * 0.22
            w = int(cell * 0.13)
            col = "#ffffff" if pattern[r][c] == "O" else "#ffcf4a"
            if pattern[r][c] == "O":
                d.ellipse([x0 + m, y0 + m, x0 + cell - m, y0 + cell - m], outline=col, width=w)
            else:
                for a, b in (((x0 + m, y0 + m), (x0 + cell - m, y0 + cell - m)),
                             ((x0 + cell - m, y0 + m), (x0 + m, y0 + cell - m))):
                    d.line([a, b], fill=col, width=w)
                    for p in (a, b):
                        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=col)
    img.resize((size, size), Image.LANCZOS).save(path)

icon(180, "icons/apple-touch-icon.png")
icon(192, "icons/icon-192.png")
icon(512, "icons/icon-512.png")
