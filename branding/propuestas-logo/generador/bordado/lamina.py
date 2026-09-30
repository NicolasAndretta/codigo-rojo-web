"""Lámina 'Rosas que van con el rojo' (HTML que después se captura a JPG)."""

ROJO = "#D3262F"
TENUE = "#6E655E"
CUERPO = "#4A433E"
TINTA = "#171412"
PAPEL = "#F1ECE5"
SERIF = "'Instrument Serif', serif"
COND = "'Barlow Condensed', sans-serif"
SANS = "'Barlow', sans-serif"
MONO = "'IBM Plex Mono', monospace"

FUENTES = [
    ("Barlow", "normal", 400, "Barlow-400.ttf"),
    ("Barlow", "normal", 500, "Barlow-500.ttf"),
    ("Barlow", "normal", 600, "Barlow-600.ttf"),
    ("Barlow Condensed", "normal", 600, "BarlowCondensed-600.ttf"),
    ("Barlow Condensed", "normal", 700, "BarlowCondensed-700.ttf"),
    ("Instrument Serif", "normal", 400, "InstrumentSerif-400.ttf"),
    ("Instrument Serif", "italic", 400, "InstrumentSerif-400i.ttf"),
    ("IBM Plex Mono", "normal", 500, "IBMPlexMono-500.ttf"),
]


def _chip(color, etiqueta):
    return (f'<span style="display: flex; align-items: center; gap: 9px">'
            f'<span style="display: block; width: 26px; height: 26px; border-radius: 50%; background: {color}; '
            f'box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12)"></span>'
            f'<span style="font-family: {MONO}; font-weight: 500; font-size: 17px; color: #2B2622">{color}</span>'
            f'<span style="font-size: 16px; color: {TENUE}">{etiqueta}</span></span>')


def _par(a, b, titulo, texto):
    return (f'<div style="display: flex; align-items: center; gap: 22px">'
            f'<span style="display: flex; border-radius: 12px; overflow: hidden">'
            f'<span style="display: block; width: 84px; height: 84px; background: {a}"></span>'
            f'<span style="display: block; width: 84px; height: 84px; background: {b}"></span></span>'
            f'<span style="display: flex; flex-direction: column; gap: 4px">'
            f'<span style="font-family: {SERIF}; font-style: italic; font-size: 40px; line-height: 1; color: {TINTA}">{titulo}</span>'
            f'<span style="font-size: 24px; color: {CUERPO}">{texto}</span></span></div>')


def pagina(opciones, imagen, carpeta_fuentes, rosa_anterior="#F3A8C2", ejemplo="blush"):
    """opciones: lista de dicts {key, nombre, rosa, cordon, linea}; imagen(i, key) -> src."""
    tarjetas = ""
    for i, o in enumerate(opciones, 1):
        tarjetas += f'''<article style="display: flex; flex-direction: column">
<div style="display: flex; align-items: baseline; gap: 16px; margin-bottom: 18px">
<span style="font-family: {MONO}; font-size: 20px; color: {TENUE}">{i:02d}</span>
<h2 style="margin: 0; font-family: {SERIF}; font-style: italic; font-weight: 400; font-size: 58px; line-height: 1">{o["nombre"]}</h2>
</div>
<img src="{imagen(i, o["key"])}" alt="Parche con el rosa {o["nombre"]}" style="width: 100%; aspect-ratio: 1; display: block; border-radius: 18px; box-shadow: 0 18px 40px -18px rgba(20,10,5,0.45)">
<div style="display: flex; gap: 18px; margin: 20px 0 14px">{_chip(o["rosa"], "rosa")}{_chip(o["cordon"], "cordón")}{_chip(ROJO, "rojo")}</div>
<p style="margin: 0; font-size: 23px; line-height: 1.35; color: {CUERPO}">{o["linea"]}</p>
</article>
'''
    ahora = next(o["rosa"] for o in opciones if o["key"] == ejemplo)
    caras = "".join(
        f"@font-face{{font-family:'{fam}';font-style:{st};font-weight:{w};src:url({carpeta_fuentes}/{f})}}"
        for fam, st, w, f in FUENTES)
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Rosas que van con el rojo</title>
<style>{caras}*{{box-sizing:border-box}}body{{margin:0}}</style></head><body>
<div style="width: 2400px; padding: 96px 96px 80px; background: {PAPEL}; color: {TINTA}; font-family: {SANS}; display: flex; flex-direction: column; gap: 64px">
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 620px; gap: 80px; align-items: end">
<div style="display: flex; flex-direction: column">
<p style="margin: 0 0 18px; font-family: {COND}; font-weight: 600; font-size: 26px; letter-spacing: 6px; color: {TENUE}">CÓDIGO ROJO · LÍNEA HOMBRE / MUJER</p>
<h1 style="margin: 0; font-family: {SERIF}; font-weight: 400; font-size: 176px; line-height: 0.9; letter-spacing: -1px">Rosas que van<br>con el <em style="font-style: italic; color: #C8202A">rojo</em></h1>
<p style="margin: 28px 0 0; max-width: 1300px; font-size: 30px; line-height: 1.35; color: {CUERPO}">El rosa de antes tiraba a lila y peleaba con nuestro rojo, que es cálido. Estos ocho son de la misma familia que el rojo: van del más suave al más fuerte.</p>
</div>
<div style="background: #E7E0D7; border-radius: 22px; padding: 34px 38px; display: flex; flex-direction: column; gap: 22px">
<p style="margin: 0; font-family: {COND}; font-weight: 600; font-size: 24px; letter-spacing: 5px; color: {TENUE}">POR QUÉ CHOCABA</p>
{_par(ROJO, rosa_anterior, "Antes", "rosa frío, tirando a lila")}
{_par(ROJO, ahora, "Ahora", "rosa cálido, de la familia del rojo")}
</div>
</div>
<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 56px 36px">
{tarjetas}</div>
<div style="padding-top: 28px; border-top: 1px solid #D8D0C6; display: flex; justify-content: space-between; font-size: 22px; color: {TENUE}">
<span>Todos con el mismo rojo <b style="color: {TINTA}; font-weight: 600">{ROJO}</b> y negro. El rosa elegido se aplica a los 4 diseños.</span>
<span>Elegí el número que más te guste.</span>
</div>
</div>
</body></html>'''
