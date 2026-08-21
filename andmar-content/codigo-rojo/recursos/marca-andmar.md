# Sistema visual — andmar.studio

Tokens usados en todas las piezas de `social/`. Sirven para que cualquier
pieza nueva salga igual sin tener que adivinar valores.

## Color

| Token | Valor | Uso |
|---|---|---|
| Negro base | `#08080B` | Fondo de todas las piezas |
| Negro superficie | `#101017` | Tarjetas, mockups |
| Violeta primario | `#7C5CFF` | Acento principal |
| Violeta claro | `#A78BFA` | Titulares destacados, iconos |
| Violeta profundo | `#5B3FD9` | Degradados |
| Blanco | `#F6F6F9` | Texto principal |
| Gris texto | `#9A9AAA` | Texto secundario |
| Línea | `rgba(255,255,255,.10)` | Bordes y grillas |

## Tipografía

| Rol | Fuente | Peso |
|---|---|---|
| Titulares | Inter | 900, `letter-spacing: -0.035em` |
| Texto | Inter | 500 / 600 |
| Etiquetas técnicas, marca | JetBrains Mono | 500 / 700, `letter-spacing: .16em–.30em` |

## Recursos visuales fijos

- Resplandor violeta radial arriba a la derecha.
- Grilla fina de 90 px con máscara radial.
- Grano sutil (`feTurbulence`, `overlay`, opacidad .22).
- Regla violeta de 88×4 px como separador antes del handle.
- Marca: cuadrado violeta redondeado de 18 px + `andmar.studio` en monoespaciada.

## Formatos

| Pieza | Medida |
|---|---|
| Post de feed | 1080 × 1350 (4:5) |
| Historia / Reel / Destacada | 1080 × 1920 (9:16) |
| Video Reel | 1080 × 1920, H.264, 30 fps, pista de audio silenciosa |

## Nota sobre el logotipo

Las piezas usan un **logotipo tipográfico** (`andmar.studio` en JetBrains Mono + un
cuadrado violeta como isotipo). Si andmar.studio ya tiene un logo propio, reemplazá
el bloque `.brand` de `social-lib` por el archivo real: el resto del sistema no cambia.

---

## Cómo regenerar el material

Los scripts que produjeron esta carpeta viven fuera del repositorio (entorno de
trabajo temporal). Si hace falta rehacer el material cuando la propietaria cargue
las fotos reales, el procedimiento fue:

1. Levantar la app tal cual está en el repo, apuntando a un backend compatible
   con Supabase (o al Supabase real del proyecto).
2. Grabar los recorridos con Playwright en viewport 540×960 @2× (sale 1080×1920)
   y 1440×900 @2× para escritorio.
3. Componer con FFmpeg: placa de intro + grabación (acelerada para que cada reel
   quede entre 22 y 35 s) + placa de cierre, más una marca de agua fija.
4. Renderizar las piezas gráficas con Chromium a partir de este sistema visual.

Lo importante para reproducirlo: **la leyenda "Demo · datos de prueba" tiene que
seguir estando** mientras el sitio no esté publicado.
