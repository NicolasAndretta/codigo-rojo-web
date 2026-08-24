# Sistema visual — andmar.studio

Tokens usados en todas las piezas de `social/`. Sirven para que cualquier
pieza nueva salga igual sin tener que adivinar valores.

## Color

Los valores son los de `99 Marca andmar studio/Identidad.md` del repositorio
central `Andmar-content`.

| Token | Valor | Uso |
|---|---|---|
| Fondo principal | `#08080B` | Fondo de todas las piezas |
| Fondo alternativo | `#0C0A14` | Tarjetas, mockups |
| Violeta (acento) | `#8B5CF6` | Acento principal y el punto de la marca |
| Violeta claro | `#C4B5FD` | Titulares destacados, iconos |
| Violeta oscuro | `#4C1D95` | Halos y degradados |
| Texto principal | `#FFFFFF` | Texto principal |
| Texto secundario | `#A1A1AA` | Texto de apoyo |
| Texto tenue | `#52525B` | Detalles |
| Línea | blanco al 8 % | Bordes y grillas |

## Tipografía

| Rol | Fuente | Peso |
|---|---|---|
| Títulos y la marca | Space Grotesk | 700, `letter-spacing: -0.025em` |
| Texto corrido | Inter | 400 / 500 |
| Etiquetas y rótulos | Inter | 600 / 700, `letter-spacing: .16em–.28em` |

## Recursos visuales fijos

- Resplandor violeta radial arriba a la derecha.
- Grilla fina de 90 px con máscara radial.
- Grano sutil (`feTurbulence`, `overlay`, opacidad .22).
- Regla violeta de 88×4 px como separador antes del handle.
- Marca escrita: `andmar.studio` en minúsculas, Space Grotesk Bold, con el punto
  en violeta `#8B5CF6`. Nunca en mayúsculas, nunca separada, sin isotipo.

## Formatos

| Pieza | Medida |
|---|---|
| Post de feed | 1080 × 1350 (4:5) |
| Historia / Reel / Destacada | 1080 × 1920 (9:16) |
| Video Reel | 1080 × 1920, H.264, pista de audio silenciosa. Los reels 01 a 07 quedan a 25 fps y el hero y el 08 a 30 fps. |

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
