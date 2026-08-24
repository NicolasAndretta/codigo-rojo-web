# Código Rojo — proyecto de andmar.studio

Documentación del proyecto y del material audiovisual generado a partir de él.

---

## 1. Qué es Código Rojo

**Código Rojo** es un **ecommerce de indumentaria (streetwear)** desarrollado por
**andmar.studio**. Cubre el ciclo completo de una tienda online: catálogo con
categorías jerárquicas, carrito, checkout como invitado, integración de pagos,
sistema de descuentos y un panel de administración para que la marca gestione
su propio catálogo.

### Stack real del proyecto

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 (dark mode permanente) |
| Base de datos | Supabase (PostgreSQL + PostgREST + RLS) |
| Autenticación | Supabase Auth (JWT + Row Level Security) |
| Almacenamiento | Supabase Storage (fotos de producto) |
| Pagos | MercadoPago SDK v3 (Checkout Pro) |
| Emails | Resend |

---

## 2. Estado del proyecto

> **DESARROLLADO / DEMO**

- El desarrollo está **prácticamente terminado** y verificado funcionalmente.
- **NO está en producción.**
- **No tiene dominio definitivo.**
- La propietaria de la marca **todavía no cargó todas las fotografías reales**.
- Puede usarse como **demo / proyecto desarrollado** para mostrar capacidad técnica.

Todo el material de esta carpeta se grabó sobre una **instancia local de
demostración**, con **datos y fotos de prueba** generados para el video.
Las "fotos" de producto son ilustraciones marcadas con la etiqueta
`imagen demo`; los pedidos que aparecen en el panel se llaman literalmente
`Cliente de prueba 1…5`.

---

## 3. Funcionalidades verificadas

Verificadas ejecutando el proyecto, no leyendo el código: **36 funcionalidades
verificadas**. La suite tiene 38 entradas, pero una ("Cerrar sesión") no llegó a
verificar nada y otra es la reproducción de un bug. El detalle está en
[`recursos/verificacion-funcional.txt`](recursos/verificacion-funcional.txt).

### Tienda (público)

| Funcionalidad | Verificado |
|---|---|
| Home redirige al catálogo | ✅ |
| Catálogo listando sólo productos activos | ✅ (12 productos demo) |
| Categorías raíz (Remeras, Pantalones, Conjuntos, Buzos, Shorts, Bermudas) | ✅ |
| Subcategorías jerárquicas (Pantalones → Jean / Joggin) | ✅ |
| Filtro por categoría, que incluye las subcategorías de la madre | ✅ |
| Filtro por subcategoría | ✅ |
| Filtro por talle, combinable con categoría | ✅ |
| Estado vacío "SIN RESULTADOS" | ✅ |
| Precio con descuento + precio de lista tachado + badge de % | ✅ |
| Badge "AGOTADO" cuando ningún talle tiene stock | ✅ |
| Badge "Últimas unidades" con stock bajo | Existe en el código; no fue una comprobación separada |
| Ficha de producto con galería (foto de prenda + foto con modelo) | ✅ |
| Selector de talle que deshabilita los talles sin stock | ✅ |
| Agregar al carrito y contador en la barra superior | ✅ |
| Carrito persistente con cambio de cantidad y borrado | ✅ |
| Checkout como invitado (nombre, teléfono, email opcional) | ✅ |
| Tres puntos de entrega (Haedo, Ramos Mejía, domicilio) | ✅ |
| Cupón válido aplicado con descuento en el total | ✅ |
| Cupón inválido con mensaje de error | ✅ |
| Botón flotante de WhatsApp | ✅ |

### Panel de administración

| Funcionalidad | Verificado |
|---|---|
| `/admin` sin sesión redirige a `/login` | ✅ |
| Login con credenciales inválidas muestra error traducido al español | ✅ |
| Login correcto entra al panel | ✅ |
| Dashboard con contadores reales (productos, pagadas sin preparar, en curso) | ✅ |
| Listado de productos con stock total y estado activo/oculto | ✅ |
| Crear producto nuevo | ✅ |
| Subir foto de prenda a Storage y verla reflejada | ✅ |
| Editar stock por talle (XS a XXL) | ✅ |
| Publicar / despublicar producto | ✅ |
| Regla de negocio: sin foto de prenda no se puede publicar | ✅ |
| Crear categoría | ✅ |
| Crear subcategoría dentro de una categoría madre | ✅ |
| Eliminar categoría | ✅ |
| Panel de descuentos con listado de vigentes y pasados | ✅ |
| Crear cupón (código, tipo, valor, vencimiento, usos máximos) | ✅ |
| El descuento creado impacta en la tienda | ✅ |
| El cupón creado valida en el checkout (end-to-end) | ✅ |
| Listado de órdenes con estados | ✅ |
| Detalle de orden con ítems, contacto y punto de entrega | ✅ |
| Cambio de estado de una orden | ✅ |

### No verificable en este entorno

| Funcionalidad | Motivo |
|---|---|
| Pago real con MercadoPago | Requiere credenciales de MercadoPago y un webhook con URL pública |
| Descuento de stock al confirmar el pago | Depende del webhook anterior |
| Emails transaccionales (Resend) | Requiere API key y dominio verificado |

El código de estas tres funciones existe y está integrado, pero **no se grabó
ninguna imagen que sugiera que un pago se completó**.

---

## 4. Hallazgo técnico durante las pruebas

**Bug reproducible:** entrar directamente a `/checkout` (URL pegada, refresco de
página o compartir el link) **rebota siempre a `/carrito`**, incluso con productos
en el carrito.

- **Causa:** en `CheckoutClient.tsx` el efecto `if (items.length === 0) router.replace("/carrito")`
  corre antes de que `CartProvider` hidrate el carrito desde `localStorage`
  (los efectos de los hijos se ejecutan antes que los del padre).
- **Impacto:** un cliente que refresque el checkout pierde el paso de compra.
- **Sugerencia:** que `CartContext` exponga un estado `hydrated` y que el redirect
  espere a que sea `true`.

No se modificó el código del proyecto: queda reportado para que lo decidan ustedes.

---

## 5. Qué se puede mostrar y qué no

### Se puede afirmar
- "Desarrollamos ecommerce a medida."
- "Construimos tiendas online con administración personalizada."
- "Catálogo con categorías y subcategorías, filtros por talle y stock por talle."
- "Checkout sin registro con punto de entrega."
- "Sistema de descuentos por producto, por categoría y por cupón."
- "Panel donde la marca carga productos, fotos, stock, categorías, descuentos y órdenes."
- "Integración con MercadoPago Checkout Pro" *(como integración construida, no como pagos cobrados)*.

### No se debe afirmar
- Que la tienda **está online**, publicada o vendiendo.
- Ventas, facturación, cantidad de pedidos, clientes o conversiones.
- Testimonios o resultados de ningún tipo.
- Que las fotos o los productos que se ven son reales.
- Trayectoria, cantidad de proyectos o tamaño del estudio.
- Precios de los servicios de andmar.studio: **no hay información confiable**, así que
  las piezas y captions **no incluyen ningún precio**. Si más adelante definen un piso,
  se puede sumar "Desde $X" a los captions de `posts.md` y `reels.md`.

### Aclaración obligatoria en cada pieza que muestre el sitio
> "Demo con datos de prueba. El sitio todavía no está publicado."

Todos los videos la llevan **impresa en pantalla** (chip arriba a la derecha) y
todos los captions la incluyen por escrito.

---

## 6. Cómo se generó el material

El proyecto usa Supabase como backend y no hay credenciales disponibles en este
entorno. Para poder **ejecutar la aplicación real sin tocar una línea de su código**,
se levantó un emulador local compatible con la API de Supabase (PostgREST + Auth +
Storage) y se sembraron datos de demostración. La app corrió tal cual está en el
repositorio; lo único que se ajustó fue la configuración local de la copia de trabajo
(imágenes sin optimizar y sin el indicador de desarrollo de Next), nunca el código
del producto.

- Grabación: Playwright (Chromium), con indicador de cursor y toques dibujado para
  que se entienda la interacción.
- Edición: FFmpeg (H.264, 1080×1920, pista de audio silenciosa para que
  Instagram permita ponerle música arriba).
- Piezas gráficas: renderizadas con Chromium a partir del sistema visual de
  andmar.studio (ver `recursos/marca-andmar.md`).

**No se subieron ni se expusieron contraseñas, tokens, cookies, API keys ni datos
privados.** El usuario que aparece en el login del video es `admin@demo.local`,
creado sólo para la demo.

---

## 7. Contenido generado

```
andmar-content/codigo-rojo/
├── project.md                  ← este archivo
├── capturas/
│   ├── escritorio/             18 capturas 2880×1800
│   └── mobile/                 18 capturas 1236×2676
├── videos/
│   ├── reels/                  Reels finales 1080×1920 MP4
│   └── brutos/                 Material bruto reutilizable MP4
├── recursos/
│   ├── marca-andmar.md         Sistema visual (color, tipografía, formatos)
│   └── verificacion-funcional.txt   Resultado de las 38 comprobaciones
└── social/
    ├── content-index.md        Índice de todas las piezas
    ├── posts/                  Carrusel de 7 slides + 2 posts sueltos (1080×1350)
    ├── historias/              8 historias (1080×1920)
    ├── destacadas/             5 portadas de destacadas (1080×1920)
    ├── reels/                  Portadas de los reels (1080×1920)
    └── captions/               Captions, objetivo y CTA de cada pieza
```

---

## 8. Mejores assets (por dónde empezar)

1. **`videos/reels/reel-01.mp4`** — recorrido de la tienda en vertical. Es el más
   fácil de entender sin contexto y el que mejor muestra el producto terminado.
2. **`social/posts/01…07-carrusel-*.png`** — el carrusel completo. Es la pieza que
   más explica qué sabe hacer andmar.studio en un solo posteo.
3. **`videos/reels/reel-04.mp4`** — cargar un producto desde el panel. Es el
   diferencial más concreto frente a "te hago una web".
4. **`videos/reels/reel-06.mp4`** — cupón creado en el panel y aplicado en el
   checkout. Demuestra que el sistema está conectado de punta a punta.
5. **`social/historias/h1…h4`** — la secuencia problema → solución → demostración
   → CTA, lista para publicar en orden.

---

## 9. Observaciones menores para revisar

- **Placeholder del teléfono en el checkout.** `CheckoutClient.tsx` (línea ~224) usa
  `placeholder="11 2843-6661"`, que parece un número real. Se ve en el checkout público
  de la tienda. Para grabar se reemplazó por `11 5555-5555` **sólo en la copia local
  de demostración**; el repositorio quedó intacto. Conviene revisarlo antes de publicar.
- **Fotos de producto.** Las imágenes usadas son ilustraciones generadas para la demo,
  marcadas con la etiqueta `imagen demo`. Cuando la propietaria cargue las fotos reales,
  conviene volver a grabar los reels: el material se regenera con los mismos scripts.
- **Órdenes de ejemplo.** Los pedidos que aparecen en el panel se llaman
  `Cliente de prueba 1…5` justamente para que nadie los confunda con clientes reales.

---

## 10. Correcciones aplicadas después de la primera entrega

- **`reel-05.mp4` recompuesto.** Terminaba mostrando el catálogo filtrado por la
  categoría nueva en "0 PRODUCTOS / SIN RESULTADOS". Se cortó el material bruto
  en 36,3 s, antes del toque que producía ese estado. Ahora cierra mostrando la
  categoría integrada a la fila de filtros, con 13 productos.
- **Identidad visual alineada.** Todas las piezas gráficas, las placas de video
  y el sobreimpreso se regeneraron con los valores oficiales de andmar.studio:
  violeta `#8B5CF6`, Space Grotesk Bold para títulos y marca, Inter para texto
  corrido, y la marca escrita `andmar.studio` con el punto en violeta.
- **Capturas del checkout rehechas.** Las cuatro capturas del checkout y los dos
  slides del carrusel que las usan mostraban en pantalla el placeholder del
  campo de teléfono del proyecto, que tiene formato de celular real. Se
  rehicieron con un placeholder neutro.
- **Todo el material se archivó** en el repositorio central de contenido
  `Andmar-content`, carpeta `02 Codigo Rojo`.
