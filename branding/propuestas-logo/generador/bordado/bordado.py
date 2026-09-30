"""Render realista de parches bordados.

Cada capa de hilo tiene: máscara (alfa), dirección de puntada por píxel, altura
(relieve) y textura de hilo. La luz usa Kajiya-Kay (el modelo de pelo/hilo):
el brillo depende de hacia dónde corre el hilo, así que cada trazo satinado
brilla distinto según su dirección, como en un bordado de verdad.

Todo lo que depende de la geometría se calcula una vez; los colores se aplican
al final, así se pueden probar muchas paletas rápido.
"""
import numpy as np
from scipy import ndimage as ndi
from PIL import Image

F = np.float32


# ------------------------------------------------------------------ color
def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], F)


def s2l(c):
    c = np.asarray(c, F)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(F)


def l2s(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def lin(hexcolor):
    return s2l(hex_rgb(hexcolor))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return (t * t * (3 - 2 * t)).astype(F)


def normalize3(x, y, z):
    n = np.sqrt(x * x + y * y + z * z) + 1e-8
    return x / n, y / n, z / n


# ------------------------------------------------------------- utilidades
def bbox_of(mask, pad, shape):
    ys, xs = np.nonzero(mask > 0.001)
    if len(ys) == 0:
        return None
    H, W = shape
    return (max(ys.min() - pad, 0), min(ys.max() + pad + 1, H), max(xs.min() - pad, 0), min(xs.max() + pad + 1, W))


def dir_blur(src, theta, length, samples=None):
    """Desenfoque a lo largo de la dirección theta (por píxel): vuelve hilos la textura."""
    H, W = src.shape
    n = samples or max(int(length / 1.6), 6)
    ys, xs = np.mgrid[0:H, 0:W].astype(F)
    c, s = np.cos(theta).astype(F), np.sin(theta).astype(F)
    acc = np.zeros((H, W), F)
    wsum = 0.0
    for k in range(n):
        u = k / (n - 1) - 0.5
        w = 1.0 - 0.6 * (2 * u) ** 2  # un poco más de peso al centro
        t = u * length
        acc += w * ndi.map_coordinates(src, [ys + t * s, xs + t * c], order=1, mode="reflect").astype(F)
        wsum += w
    return acc / wsum


def thread_noise(shape, theta, length, rng, grain=0.7):
    """Textura de hilos: ruido blanco estirado a lo largo de la puntada, normalizado."""
    n = rng.standard_normal(shape).astype(F)
    if grain:
        n = ndi.gaussian_filter(n, grain).astype(F)
    t = dir_blur(n, theta, length)
    t -= t.mean()
    t /= t.std() + 1e-6
    return t


def orient_from_mask(D, sigma=3.0):
    """Dirección de la puntada satinada: cruza el trazo (gradiente de la distancia al borde)."""
    Ds = ndi.gaussian_filter(D, 1.2)
    gy, gx = np.gradient(Ds)
    c2 = gx * gx - gy * gy
    s2 = 2 * gx * gy
    c2 = ndi.gaussian_filter(c2, sigma)
    s2 = ndi.gaussian_filter(s2, sigma)
    return (0.5 * np.arctan2(s2, c2)).astype(F)


# ------------------------------------------------------------------ luz
class Light:
    def __init__(self, az_deg=225, el_deg=42):
        az, el = np.radians(az_deg), np.radians(el_deg)
        # az 225 = desde arriba a la izquierda (y hacia abajo en pantalla).
        self.L = np.array([np.cos(el) * np.cos(az), np.cos(el) * np.sin(az), np.sin(el)], F)
        h = self.L + np.array([0, 0, 1], F)
        self.Hv = h / np.linalg.norm(h)


def shade(h, theta, light, p_spec=48.0, tilt_follow=1.0):
    """Devuelve (difuso, especular) a partir de la altura y la dirección del hilo."""
    hy, hx = np.gradient(ndi.gaussian_filter(h, 0.8))
    nx, ny, nz = normalize3(-hx, -hy, np.ones_like(h))
    L, Hv = light.L, light.Hv
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    c, s = np.cos(theta), np.sin(theta)
    slope = (hx * c + hy * s) * tilt_follow
    tx, ty, tz = normalize3(c, s, slope)
    tl = tx * L[0] + ty * L[1] + tz * L[2]
    th = tx * Hv[0] + ty * Hv[1] + tz * Hv[2]
    sin_tl = np.sqrt(np.clip(1 - tl * tl, 0, 1))
    sin_th = np.sqrt(np.clip(1 - th * th, 0, 1))
    diffuse = lam * (0.5 + 0.5 * sin_tl)
    spec = np.power(sin_th, p_spec) * smoothstep(0.0, 0.35, lam)
    return diffuse.astype(F), spec.astype(F)


# ---------------------------------------------------------------- capas
class Layer:
    """Capa de hilo lista para colorear: alfa, sombreado y textura."""

    def __init__(self, name, alpha, diffuse, spec, tex, keys, split=None, ks=0.35, tex_amt=0.14,
                 shadow=(4, 7, 5.0, 0.55), contact=(1.0, 1.5, 1.6, 0.45), dark=None, spec_tex=0.9):
        self.name = name
        self.alpha = alpha.astype(F)
        self.diffuse = diffuse
        self.spec = spec
        self.tex = tex
        self.keys = keys  # (keyA, keyB): color de cada lado de la división
        self.split = split  # máscara 0..1 del lado A (None = todo A)
        self.ks = ks
        self.tex_amt = tex_amt
        self.shadow = shadow
        self.contact = contact
        self.dark = dark  # 0..1: zonas más oscuras (pliegues del cordón, agujas)
        self.spec_tex = spec_tex

    def albedo(self, pal):
        a = pal[self.keys[0]]
        b = pal[self.keys[1]]
        if self.split is None or self.keys[0] == self.keys[1]:
            return np.broadcast_to(a, self.alpha.shape + (3,)).astype(F)
        m = self.split[..., None]
        return (a * m + b * (1 - m)).astype(F)

    def color(self, pal, ambient=0.2):
        alb = self.albedo(pal)
        lightf = ambient + 0.95 * self.diffuse
        if getattr(self, "norm", None) is None:
            # Calibración: en promedio la luz no cambia el color pedido. Los
            # pliegues y agujeros (dark) quedan afuera: oscurecen de verdad.
            w = self.alpha > 0.5
            if self.dark is not None:
                w = w & (self.dark < 0.2)
            self.norm = 1.0 / max(float(lightf[w].mean()), 1e-3) if w.any() else 1.0
        if self.dark is not None:
            lightf = lightf * (1 - self.dark)
        base = alb * (1 + self.tex_amt * self.tex[..., None])
        col = base * (lightf * self.norm)[..., None]
        # Brillo del hilo: blanco teñido del color del hilo, cortado por la textura.
        spec_col = 0.72 * alb + 0.28
        sp = (self.spec * np.clip(1 + self.spec_tex * self.tex, 0, 2.2))[..., None]
        return (col + self.ks * sp * spec_col).astype(F)


def shadow_map(alpha, dx, dy, sigma):
    s = ndi.shift(alpha, (dy, dx), order=1, mode="constant", cval=0)
    return ndi.gaussian_filter(s, sigma).astype(F)


def composite(bg, layers, pal):
    img = bg.copy()
    for ly in layers:
        a = ly.alpha
        for sh in (ly.shadow, ly.contact):
            if sh:
                dx, dy, sig, k = sh
                img *= (1 - k * shadow_map(a, dx, dy, sig))[..., None]
        col = ly.color(pal)
        img = img * (1 - a[..., None]) + col * a[..., None]
    return img


# ------------------------------------------------------------ geometrías
def ring_alpha(r, r_in, r_out, aa=1.0):
    return (np.clip((r - r_in) / aa + 0.5, 0, 1) * np.clip((r_out - r) / aa + 0.5, 0, 1)).astype(F)


def dome(x):
    x = np.clip(x, 0, 1)
    return np.sqrt(np.clip(1 - (1 - x) ** 2, 0, 1)).astype(F)


def satin_from_mask(name, mask, keys, light, rng, split=None, height=None, slant_deg=10.0,
                    stitch_len=None, p_spec=48, ks=0.3, tex_amt=0.16, shadow=(4, 7, 5.0, 0.55),
                    contact=(1.0, 1.5, 1.6, 0.5)):
    """Relleno satinado (letras): puntadas que cruzan el trazo de lado a lado."""
    H, W = mask.shape
    bb = bbox_of(mask, 40, (H, W))
    y0, y1, x0, x1 = bb
    m = mask[y0:y1, x0:x1]
    D = ndi.distance_transform_edt(m > 0.5).astype(F)
    # Ancho local del trazo: el máximo de la distancia en un entorno.
    wmax = max(float(D.max()), 2.0)
    Wl = ndi.maximum_filter(D, size=int(2 * wmax + 1)).astype(F)
    Wl = ndi.gaussian_filter(Wl, 2).astype(F)
    x = D / np.maximum(Wl, 1.0)
    h0 = height if height is not None else min(0.5 * wmax, 10.0)
    hgt = (h0 * dome(x)).astype(F)
    theta = orient_from_mask(D, sigma=5.0) + np.radians(slant_deg)
    L = stitch_len or 2.2 * wmax
    tex = thread_noise(m.shape, theta, L, rng)
    # Micro-relieve de los hilos en la altura: le da el brillo cortado.
    hgt = hgt + 0.35 * tex * smoothstep(0.5, 2.0, D)
    diffuse, spec = shade(hgt, theta, light, p_spec=p_spec)
    full = lambda a: _paste(a, (H, W), bb)
    return Layer(name, mask, full(diffuse), full(spec), full(tex), keys, split=split, ks=ks,
                 tex_amt=tex_amt, shadow=shadow, contact=contact)


def _paste(a, shape, bb):
    out = np.zeros(shape, F)
    y0, y1, x0, x1 = bb
    out[y0:y1, x0:x1] = a
    return out


def ring_satin(name, r, phi, r_in, r_out, keys, light, rng, split=None, slant_deg=25.0, h0=None,
               p_spec=44, ks=0.35, tex_amt=0.16, stitch_len=None, shadow=(3, 5, 3.5, 0.5),
               contact=(0.8, 1.2, 1.2, 0.45), wraps=None):
    """Anillo satinado (línea fina o borde overlock): puntadas que cruzan el anillo.
    wraps = separación (px) entre vueltas de hilo: marca cada vuelta con un surco."""
    H, W = r.shape
    alpha_full = ring_alpha(r, r_in, r_out)
    bb = bbox_of(alpha_full, 8, (H, W))
    y0, y1, x0, x1 = bb
    rr = r[y0:y1, x0:x1]
    pp = phi[y0:y1, x0:x1]
    w = r_out - r_in
    x = np.clip((rr - r_in) / w, 0, 1)
    h0 = h0 if h0 is not None else 0.45 * w
    hgt = (h0 * np.sqrt(np.clip(1 - (2 * x - 1) ** 2, 0, 1))).astype(F)
    theta = (pp + np.radians(slant_deg)).astype(F)
    tex = thread_noise(rr.shape, theta, stitch_len or 1.6 * w, rng)
    dark = None
    alpha = alpha_full[y0:y1, x0:x1]
    if wraps:
        n_w = max(int(round(2 * np.pi * r_out / wraps)), 8)
        shift = (rr - r_in) * np.tan(np.radians(slant_deg)) / wraps
        u = (pp / (2 * np.pi)) * n_w - shift
        g = np.abs((u - np.floor(u)) - 0.5) * 2  # 0 = centro de la vuelta, 1 = surco
        groove = smoothstep(0.55, 1.0, g)
        dark = (0.5 * groove).astype(F)
        hgt = (hgt * (1 - 0.3 * groove)).astype(F)
        # Borde festoneado: cada vuelta asoma un poco hacia afuera.
        alpha = ring_alpha(rr, r_in, r_out - 1.6 * groove)
        tex = 0.55 * tex
    hgt = hgt + 0.3 * tex
    diffuse, spec = shade(hgt, theta, light, p_spec=p_spec)
    full = lambda a: _paste(a, (H, W), bb)
    return Layer(name, full(alpha), full(diffuse), full(spec), full(tex), keys, split=split, ks=ks,
                 tex_amt=tex_amt, shadow=shadow, contact=contact,
                 dark=full(dark) if dark is not None else None)


def rope(name, r, phi, r1, r2, keys, light, rng, split=None, n=58, twist=1.45, p_spec=40, ks=0.3,
         shadow=(5, 8, 6.0, 0.6), contact=(1.2, 1.8, 2.0, 0.5)):
    """Cordón trenzado: hebras en diagonal, cada una con su volumen y sus hilos."""
    H, W = r.shape
    alpha = ring_alpha(r, r1, r2)
    bb = bbox_of(alpha, 8, (H, W))
    y0, y1, x0, x1 = bb
    rr = r[y0:y1, x0:x1]
    pp = phi[y0:y1, x0:x1]
    dA = 2 * np.pi / n
    S = twist * dA
    t = np.clip((rr - r1) / (r2 - r1), 0, 1)
    u = (pp - (t - 0.5) * S) / dA
    f = u - np.floor(u)
    g = 0.24 * (1 - np.power(np.clip(np.sin(np.pi * t), 0, 1), 0.6))
    q = np.clip((f - g) / np.maximum(1 - 2 * g, 0.05), 0, 1)
    inside = smoothstep(0.0, 0.06, q) * smoothstep(0.0, 0.06, 1 - q)
    hs = np.sqrt(np.clip(1 - (2 * q - 1) ** 2, 0, 1))
    ht = np.sqrt(np.clip(1 - (2 * t - 1) ** 2, 0, 1))
    h0 = 0.28 * (r2 - r1)
    hgt = (h0 * ht * (0.35 + 0.65 * hs)).astype(F)
    # Dirección a lo largo de la hebra.
    theta = (pp + np.arctan2(rr * S, (r2 - r1))).astype(F)
    tex = thread_noise(rr.shape, theta, 0.9 * (r2 - r1), rng)
    hgt = hgt + 0.35 * tex * inside
    diffuse, spec = shade(hgt, theta, light, p_spec=p_spec)
    dark = (0.75 * (1 - inside) + 0.25 * (1 - ht)).astype(F)
    full = lambda a: _paste(a, (H, W), bb)
    return Layer(name, alpha, full(diffuse), full(spec * inside), full(tex), keys, split=split, ks=ks,
                 tex_amt=0.12, shadow=shadow, contact=contact, dark=full(np.clip(dark, 0, 0.9)))


def tatami(name, alpha, keys, light, rng, split=None, angle_deg=35.0, row=8.0, stitch=34.0,
           p_spec=26, ks=0.1, shadow=None, contact=None):
    """Relleno tatami: filas de puntadas con las entradas de aguja escalonadas."""
    H, W = alpha.shape
    bb = bbox_of(alpha, 4, (H, W))
    y0, y1, x0, x1 = bb
    ys, xs = np.mgrid[y0:y1, x0:x1].astype(F)
    a = np.radians(angle_deg)
    uu = xs * np.cos(a) + ys * np.sin(a)
    vv = -xs * np.sin(a) + ys * np.cos(a)
    rowi = np.floor(vv / row)
    fr = (vv / row) - rowi
    offs = ((rowi * 0.25) % 1.0) * stitch
    sp = (uu + offs) / stitch
    si = np.floor(sp)
    pos = sp - si
    # Cada puntada: un poco abombada a lo largo, con la entrada de aguja hundida.
    dn = np.minimum(pos, 1 - pos) * stitch
    needle = np.exp(-(dn / 2.2) ** 2).astype(F)
    hrow = np.power(np.clip(np.sin(np.pi * fr), 0, 1), 0.6).astype(F)
    rnd = np.sin(rowi * 12.9898 + si * 78.233) * 43758.5453
    rnd = (rnd - np.floor(rnd) - 0.5).astype(F)
    theta = np.full(xs.shape, a, F)
    fib = thread_noise(xs.shape, theta, 10.0, rng, grain=0.6)
    D = ndi.distance_transform_edt(alpha[y0:y1, x0:x1] > 0.5).astype(F)
    hgt = (2.6 * hrow * (1 - 0.55 * needle) * smoothstep(0, 6, D) + 0.12 * fib).astype(F)
    diffuse, spec = shade(hgt, theta, light, p_spec=p_spec)
    tex = (0.55 * fib + 1.6 * rnd).astype(F)
    dark = (0.3 * needle + 0.22 * (1 - hrow)).astype(F)
    full = lambda arr: _paste(arr, (H, W), bb)
    return Layer(name, alpha, full(diffuse), full(spec), full(tex), keys, split=split, ks=ks,
                 tex_amt=0.07, shadow=shadow, contact=contact, dark=full(dark), spec_tex=0.5)


def fleece_bg(shape, rng, base="#0b0b0c", light_from=(0.3, 0.2)):
    """Fondo de frisa negra: pelusa con fibras cortas y luz suave."""
    H, W = shape
    n = rng.standard_normal(shape).astype(F)
    ang = ndi.gaussian_filter(rng.standard_normal(shape).astype(F), 25) * 40
    fib = dir_blur(n, ang, 9)
    fib = (fib - fib.mean()) / (fib.std() + 1e-6)
    speck = ndi.gaussian_filter(rng.standard_normal(shape).astype(F), 0.6)
    ys, xs = np.mgrid[0:H, 0:W].astype(F)
    lx, ly = light_from
    d = np.hypot(xs / W - lx, ys / H - ly)
    lightmap = 1.25 - 0.55 * np.clip(d, 0, 1.2)
    b = lin(base)
    v = (1 + 0.28 * fib + 0.12 * speck) * lightmap
    # Leve fuera de foco: la tela de atrás queda más suave que el parche.
    v = ndi.gaussian_filter(v, 1.1)
    return (b[None, None, :] * v[..., None]).astype(F)


def patch_shadow(img, disk_alpha, dx=8, dy=20, sigma=26, k=0.85):
    return img * (1 - k * shadow_map(disk_alpha, dx, dy, sigma))[..., None]


def finish(img, grain=0.012, rng=None, vignette=0.35, key=(0.3, 0.25), falloff=0.16):
    H, W, _ = img.shape
    ys, xs = np.mgrid[0:H, 0:W].astype(F)
    # Luz principal de estudio: un poco más clara arriba a la izquierda.
    dk = np.hypot(xs / W - key[0], ys / H - key[1])
    img = img * (1.06 - falloff * np.clip(dk, 0, 1.2))[..., None]
    d = np.hypot((xs - W / 2) / (W / 2), (ys - H / 2) / (H / 2))
    img = img * (1 - vignette * smoothstep(0.55, 1.45, d))[..., None]
    # Curva suave tipo foto: comprime solo los brillos fuertes, respeta el blanco.
    img = img * 1.15 / (1 + 0.15 * img)
    out = l2s(img)
    if grain and rng is not None:
        out = out + grain * rng.standard_normal(out.shape[:2]).astype(F)[..., None]
    return np.clip(out, 0, 1)


def to_image(arr, size=None):
    arr = np.nan_to_num(arr, nan=0.0)
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
    if size:
        im = im.resize(size, Image.LANCZOS)
    return im
