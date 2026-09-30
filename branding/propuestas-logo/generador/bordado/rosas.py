"""Genera las 8 opciones de rosa sobre el parche 'Mitades' y la lámina para elegir.

    cd branding/propuestas-logo/generador && npm install     # una vez (Playwright)
    pip install -r bordado/requirements.txt                   # una vez
    python3 bordado/rosas.py

Deja los JPG en branding/propuestas-logo/rosas/ (tarda un par de minutos).
"""
import json
import os
import subprocess

import escena_mitades
from color import oklch_to_hex

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "salida")
DESTINO = os.path.abspath(os.path.join(AQUI, "..", "..", "rosas"))
FUENTES = os.path.abspath(os.path.join(AQUI, "..", "fuentes"))

# Rosas en OKLCH (luminosidad, intensidad, tono). Todos entre 358° y 45°: la
# familia del rojo (25°). Del más suave al más fuerte.
OPCIONES = [
    ("empolvado", "Empolvado", (0.885, 0.038, 12), "Rosa apenas insinuado. Elegante y fácil de combinar."),
    ("nude", "Nude", (0.87, 0.048, 45), "Rosado tirando a piel. Sobrio, bien de moda."),
    ("cuarzo", "Cuarzo", (0.86, 0.060, 358), "El más parecido al de antes, pero sin pelear con el rojo."),
    ("blush", "Blush", (0.82, 0.082, 12), "Rosa rubor: se nota rosa sin gritar."),
    ("viejo", "Rosa viejo", (0.74, 0.065, 12), "Apagado y con carácter. Queda muy bien con el negro."),
    ("coral", "Coral", (0.79, 0.110, 30), "Cálido, tirando a salmón. Tono sobre tono con el rojo."),
    ("frutilla", "Frutilla", (0.765, 0.128, 14), "Rosa vivo y cálido. Más juvenil."),
    ("fuerte", "Rosa fuerte", (0.70, 0.165, 6), "El de más onda. Ojo: sobre este rosa, las letras rojas se leen menos."),
]
# Hilos fijos. El rojo del hilo va un toque más profundo que el de la marca
# (#D3262F): con los brillos del satinado, en promedio se ve igual.
BASE = {"black": "#101010", "red": "#C8202A", "white": "#EFEAE4"}
ANTERIOR = ("#F3A8C2", "#DC6F8F")


def main():
    os.makedirs(DESTINO, exist_ok=True)
    lamina_dir = os.path.join(SALIDA, "lamina")
    os.makedirs(lamina_dir, exist_ok=True)
    mascaras = os.path.join(SALIDA, "mascaras")
    subprocess.run(["node", "mascaras.mjs", "mitades-cuadrado.json", mascaras], cwd=AQUI, check=True)

    escena = escena_mitades.construir(mascaras)
    opciones = []
    for i, (key, nombre, (L, C, h), linea) in enumerate(OPCIONES, 1):
        rosa, _ = oklch_to_hex(L, C, h)
        cordon, _ = oklch_to_hex(L - 0.14, C + 0.03, h)  # el cordón: el mismo rosa, más profundo
        img = escena_mitades.renderizar(escena, {**BASE, "pink": rosa, "rose": cordon})
        img.save(os.path.join(lamina_dir, f"{key}.png"))
        img.save(os.path.join(DESTINO, f"{i:02d}-{key}.jpg"), quality=90, optimize=True, progressive=True)
        opciones.append({"key": key, "nombre": nombre, "rosa": rosa, "cordon": cordon, "linea": linea})
        print(f"{i:02d} {nombre:12s} rosa {rosa}  cordón {cordon}")
    img = escena_mitades.renderizar(escena, {**BASE, "pink": ANTERIOR[0], "rose": ANTERIOR[1]})
    img.save(os.path.join(DESTINO, "00-el-de-antes.jpg"), quality=90, optimize=True, progressive=True)

    import lamina
    html = lamina.pagina(opciones, lambda i, key: f"{key}.png", os.path.relpath(FUENTES, lamina_dir))
    pagina = os.path.join(lamina_dir, "index.html")
    with open(pagina, "w", encoding="utf-8") as f:
        f.write(html)
    subprocess.run(["node", "captura.mjs", pagina, os.path.join(DESTINO, "rosas.jpg"), "2400"], cwd=AQUI, check=True)
    with open(os.path.join(DESTINO, "rosas.json"), "w", encoding="utf-8") as f:
        json.dump(opciones, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
