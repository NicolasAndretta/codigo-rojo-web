"""Colores en OKLCH: luminosidad (L), intensidad (C) y tono (h) medidos como los
ve el ojo. Sirve para armar rosas "de la familia" del rojo: mismo rango de tono,
más claros y menos intensos.

El rojo de la marca (#D3262F) está en h ≈ 25° (cálido). El rosa anterior
(#F3A8C2) estaba en h ≈ 357° (frío, tirando a lila): por eso chocaban.
"""
import numpy as np

_M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                [0.2119034982, 0.6806995451, 0.1073969566],
                [0.0883024619, 0.2817188376, 0.6299787005]])
_M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                [1.9779984951, -2.4285922050, 0.4505937099],
                [0.0259040371, 0.7827717662, -0.8086757660]])


def _to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _to_srgb(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.sign(c) * np.abs(c) ** (1 / 2.4) - 0.055)


def _rgb(hexcolor):
    h = hexcolor.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def hex_to_oklch(hexcolor):
    L, a, b = _M2 @ np.cbrt(_M1 @ _to_lin(_rgb(hexcolor)))
    return float(L), float(np.hypot(a, b)), float(np.degrees(np.arctan2(b, a)) % 360)


def oklch_to_hex(L, C, h):
    """Devuelve (hex, entra_en_srgb)."""
    a, b = C * np.cos(np.radians(h)), C * np.sin(np.radians(h))
    lms = (np.linalg.inv(_M2) @ np.array([L, a, b])) ** 3
    s = _to_srgb(np.linalg.inv(_M1) @ lms)
    ok = bool(np.all(s >= -0.002) and np.all(s <= 1.002))
    s = np.clip(s, 0, 1)
    return "#%02X%02X%02X" % tuple(int(round(v * 255)) for v in s), ok


def contraste(hex_a, hex_b):
    """Contraste WCAG entre dos colores (1 a 21)."""
    def lum(h):
        r, g, b = _to_lin(_rgb(h))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    la, lb = sorted([lum(hex_a), lum(hex_b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)
