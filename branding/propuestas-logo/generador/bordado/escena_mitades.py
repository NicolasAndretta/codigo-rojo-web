"""Parche 'Mitades' en cuadrado (2000 px, se entrega a 1000): el que se usa para
comparar colores. La geometría y la luz se calculan una vez; después cada
paleta sale en segundos."""
import os

import numpy as np
from PIL import Image

import bordado as B
from bordado import F


def construir(carpeta_mascaras, S=2000, R=820, semilla=3):
    cx = cy = S // 2
    rng = np.random.default_rng(semilla)
    luz = B.Light()
    ys, xs = np.mgrid[0:S, 0:S].astype(F)
    r = np.hypot(xs - cx, ys - cy).astype(F)
    phi = np.arctan2(ys - cy, xs - cx).astype(F)
    # Lado A (hombre) = izquierda, con el borde de la división suavizado.
    lado_a = np.clip((cx - xs) + 0.5, 0, 1).astype(F)

    def mascara(nombre):
        return np.asarray(Image.open(os.path.join(carpeta_mascaras, f"{nombre}.png")))[..., 3].astype(F) / 255

    capas = [
        B.tatami("base", B.ring_alpha(r, -1, R - 18), ("black", "pink"), luz, rng, split=lado_a),
        B.ring_satin("overlock", r, phi, R - 48, R, ("black", "black"), luz, rng, slant_deg=18, h0=16,
                     wraps=6.5, shadow=(5, 8, 6, 0.6)),
        B.ring_satin("linea1", r, phi, R - 68, R - 56, ("red", "red"), luz, rng, slant_deg=35),
        B.rope("cordon", r, phi, R - 188, R - 80, ("red", "rose"), luz, rng, split=lado_a),
        B.ring_satin("linea2", r, phi, R - 216, R - 204, ("red", "red"), luz, rng, slant_deg=35),
        B.satin_from_mask("wordmark", mascara("wm"), ("red", "red"), luz, rng, split=lado_a),
        B.satin_from_mask("bajada", mascara("tag"), ("white", "black"), luz, rng, split=lado_a,
                          shadow=(2, 3, 2, 0.5), contact=(0.6, 0.9, 0.9, 0.4)),
    ]
    fondo = B.fleece_bg((S, S), rng)
    fondo = B.patch_shadow(fondo, B.ring_alpha(r, -1, R))
    return {"capas": capas, "fondo": fondo}


def renderizar(escena, colores, tam=(1000, 1000)):
    paleta = {k: B.lin(v) for k, v in colores.items()}
    img = B.composite(escena["fondo"], escena["capas"], paleta)
    out = B.finish(img, rng=np.random.default_rng(11))
    return B.to_image(out, tam)
