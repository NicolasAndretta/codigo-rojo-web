# Código Rojo

E-commerce de streetwear argentino desarrollado como proyecto portfolio full-stack. Cubre el ciclo completo de una tienda online: catálogo con categorías jerárquicas, carrito y checkout como invitado, pagos reales con MercadoPago, sistema de descuentos (producto / categoría / cupón), panel de administración y emails transaccionales. Marca real: [@codigorojo.ind](https://www.instagram.com/codigorojo.ind).

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase)
![MercadoPago](https://img.shields.io/badge/MercadoPago-Checkout%20Pro-009ee3?style=flat-square&logo=mercadopago)
![Resend](https://img.shields.io/badge/Resend-Emails-000000?style=flat-square&logo=resend)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.3 (App Router, React 19; el build usa webpack, ver `CLAUDE.md`) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind CSS v4 (dark mode permanente) |
| Base de datos | Supabase (PostgreSQL + PostgREST + RLS) |
| Autenticación | Supabase Auth (JWT + Row Level Security) |
| Almacenamiento | Supabase Storage (fotos de productos) |
| Pagos | MercadoPago SDK v3 (Checkout Pro) |
| Emails | Resend |
| Tipografía | Inter (texto) + Bebas Neue (display) |
| Deploy | Hostinger (Node.js standalone) |

---

## Funcionalidades

### Catálogo y productos
- Categorías con subcategorías jerárquicas (ej. Pantalones → Jean / Joggin)
- Filtros combinables por categoría, subcategoría y talle
- Página de producto con selector de talle y stock en tiempo real
- Dos fotos por producto: foto de la prenda (obligatoria) + foto con modelo (opcional)
- Indicadores de "últimas unidades" y "agotado"

### Carrito y checkout como invitado
- Carrito persistente en `localStorage` (no requiere registro ni sobrevive recarga)
- Checkout sin cuenta: nombre, teléfono y email opcional
- Tres puntos de entrega: Estación Haedo, Estación Ramos Mejía o envío a domicilio (CABA y zona oeste)
- Sin cálculo de costo de envío: se coordina por WhatsApp
- Mensaje de WhatsApp pre-armado post-pago con el detalle completo del pedido

### Pagos con MercadoPago
- Integración con la API de preferencias (Checkout Pro: tarjeta, débito o efectivo)
- Precios recalculados en el servidor (nunca se confía en el cliente)
- Webhook idempotente que descuenta stock al confirmar el pago
- Páginas de éxito, error y pendiente con feedback claro

### Sistema de descuentos
- Descuento por producto individual (porcentaje o monto fijo)
- Descuento por categoría completa
- Cupones con código, fecha de vencimiento y límite de usos
- Precedencia automática: el descuento de producto gana sobre el de categoría
- Módulo desacoplado y reutilizable (sin dependencias de la marca)

### Panel de administración
- CRUD completo de productos con subida de fotos a Storage
- Stock por talle editable inline
- Toggle de activar / desactivar productos (no se publica sin foto de prenda)
- Gestión de categorías y subcategorías
- Panel de descuentos con creación de cupones
- Vista de órdenes con detalle, datos del cliente y cambio de estado
- Acceso restringido a `role = 'admin'` (middleware + revalidación en layout)

### Emails transaccionales
- Confirmación al cliente cuando deja su email
- Notificación al administrador por cada orden nueva
- Plantillas HTML branded, en español, enviadas desde el webhook

### Diseño y marca
- Identidad visual completa: logo, wordmark y tagline "Tu estilo, bajo control."
- Estética streetwear con dark mode permanente (negro / rojo / blanco)
- Botón flotante de WhatsApp en toda la tienda
- SEO con título, descripción y Open Graph

---

## Instalación local

### Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta de desarrollador en [MercadoPago](https://www.mercadopago.com.ar/developers)
- Cuenta en [Resend](https://resend.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/NicolasAndretta/codigo-rojo-web.git
cd codigo-rojo-web

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editá .env.local con tus credenciales reales

# 4. Aplicar las migraciones en el SQL Editor de Supabase
#    Ejecutá en orden los archivos de supabase/migrations/ (001 a 006)

# 5. Iniciar en modo desarrollo
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

> El webhook de MercadoPago no llega a `localhost`. Para probar la confirmación de pago en local, exponé el puerto con un túnel (cloudflared / ngrok) y usá esa URL pública como `NEXT_PUBLIC_SITE_URL`.

---

## Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá cada valor:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase (sin `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon (pública) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (solo server-side) |
| `MP_ACCESS_TOKEN` | Access token de MercadoPago (`TEST-` para desarrollo) |
| `RESEND_API_KEY` | API key de Resend para emails |
| `EMAIL_FROM` | Remitente de los emails (ej. `Código Rojo <pedidos@tudominio.com>`) |
| `ADMIN_EMAIL` | Casilla que recibe la notificación de cada orden nueva |
| `NEXT_PUBLIC_SITE_URL` | URL base de la app, sin barra final |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp para coordinar entregas |

---

## Estructura del proyecto

```
app/
├── (public)/              # Rutas sin auth
│   ├── catalogo/          # Catálogo con filtros
│   ├── producto/[id]/     # Detalle de producto
│   ├── carrito/           # Carrito
│   └── checkout/          # Checkout invitado + success / failure / pending
├── (admin)/               # Panel protegido (role = admin)
│   └── admin/
│       ├── productos/     # CRUD, stock por talle, fotos
│       ├── categorias/    # Categorías y subcategorías
│       ├── descuentos/    # Descuentos y cupones
│       └── ordenes/       # Órdenes con cambio de estado
├── (auth)/login/          # Acceso al panel admin
├── auth/                  # callback + confirmación de cuenta
└── api/
    ├── orders/            # Crea orden + preferencia de MercadoPago
    ├── webhooks/mp/        # Webhook idempotente de pago
    └── coupons/validate/  # Validación de cupones
components/
├── catalog/               # ProductCard, CategoryPills, SizeFilter, PriceTag
├── admin/                 # DiscountForm, CategorySelect
├── Navbar.tsx · CartButton.tsx · AccountMenu.tsx · WhatsAppFloat.tsx
lib/
├── supabase/              # client, server, admin (service role), proxy
├── mercadopago/           # Cliente de preferencias y pagos
├── resend/                # client, order-emails, templates HTML
├── discounts/             # pricing (lógica pura) + server (acceso a datos)
├── admin/                 # Server Actions del panel (actions, discounts)
├── context/               # CartContext (carrito en localStorage)
├── hooks/ · checkout/ · auth/ · utils/ · types/
└── delivery.ts            # Puntos de entrega
supabase/
└── migrations/            # 001 a 006 (schema, RPC, storage, descuentos, grants)
proxy.ts                   # Middleware de Next.js 16 (protección de /admin)
```

---

## Base de datos (Supabase)

Tablas principales:

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios con rol `client` o `admin` (extiende `auth.users`) |
| `categories` | Categorías jerárquicas (`parent_id` para subcategorías) |
| `products` | Productos con `images[]`, precio e `is_active` |
| `product_variants` | Stock por talle (XS–XXL) de cada producto |
| `orders` | Órdenes con datos del invitado, punto de entrega y estado MP |
| `order_items` | Líneas de cada orden con el precio autoritativo |
| `shipping_addresses` | Direcciones de envío (campos Correo Argentino-ready) |
| `discounts` | Descuentos de producto / categoría / cupón |

Las políticas RLS garantizan que la compra como invitado solo pueda crear órdenes con `user_id` nulo, que los descuentos vigentes sean de lectura pública y que toda operación de escritura del panel requiera `role = 'admin'` (vía la función `public.is_admin()`). La confirmación de pago y el descuento de stock corren en una función `SECURITY DEFINER` idempotente (`mark_order_paid`).

---

## Estado del proyecto

Feature-complete y verificado. `eslint` y `next build` pasan limpios; las pruebas E2E (Playwright) del funnel de compra y del panel admin corren sin errores.

Pasos manuales pendientes para producción:
- Confirmar el descuento de stock con un pago real de prueba en MercadoPago (vía túnel para que el webhook llegue).
- Verificar el dominio en Resend para enviar emails a terceros.
- Desplegar a Hostinger (`next build` → `.next/standalone/` + `public/` + `.next/static/`, start con `node server.js`) y cargar las variables de entorno en el hPanel.

---

## Autor

**Nicolas Andretta** — [GitHub](https://github.com/NicolasAndretta)
