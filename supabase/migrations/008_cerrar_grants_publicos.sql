-- ============================================================
-- Código Rojo — 008: cerrar los permisos que permitían pedidos gratis
-- Ejecutar en Supabase SQL Editor después de 007.
-- ============================================================
--
-- EL PROBLEMA (encontrado el 29/09/2026, antes del lanzamiento)
--
-- La 002 terminaba con:
--     grant execute on function public.mark_order_paid(bigint, text)
--       to anon, authenticated, service_role;
--
-- `mark_order_paid` es `security definer`, o sea que corre con los privilegios
-- del owner y SALTEA RLS. Al estar concedida a `anon`, quedaba expuesta por
-- PostgREST a cualquiera que tuviera la anon key — que es pública y viaja en el
-- bundle que descarga el navegador.
--
-- El ataque, sin herramientas especiales:
--   1. Comprar normal en la tienda. POST /api/orders devuelve el order_id.
--   2. Cerrar la pestaña de MercadoPago. NO pagar.
--   3. POST https://<proyecto>.supabase.co/rest/v1/rpc/mark_order_paid
--      con la anon key y {"p_order_id": <id>, "p_payment_id": "loquesea"}
--   4. La orden pasa a 'paid', se descuenta el stock, y en /admin/ordenes
--      aparece como pagada. Se despacha mercadería que nadie pagó.
--
-- Que fue un descuido y no una decisión está a la vista en la misma tanda:
-- la 004 concede `redeem_coupon` SOLO a service_role (línea 241). El criterio
-- estaba claro, se aplicó ahí y se pasó por alto acá.
--
-- Lo mismo vale para el insert directo en orders / order_items /
-- shipping_addresses que concedió la 004 (líneas 110-112): con eso se podía
-- insertar por PostgREST una orden con total = 0 y los items que uno quisiera,
-- salteando TODO el recálculo de precios de app/api/orders/route.ts.
--
-- POR QUÉ ES SEGURO REVOCARLOS
--
-- Se verificó cada uso antes de tocar nada:
--   · mark_order_paid se llama en un solo lugar, app/api/webhooks/mp/route.ts:37,
--     con createServiceClient() → le alcanza service_role.
--   · Todos los inserts de órdenes pasan por app/api/orders/route.ts:167 y :183,
--     también con el service client.
--   · shipping_addresses no se usa en ningún lado: la dirección se guarda inline
--     en orders.delivery_address.
--   · No hay un solo insert a estas tablas desde el navegador.
--
-- El checkout de invitado NO se rompe: nunca dependió de estos permisos.
-- ============================================================

-- 1. La función que marca pagado vuelve a ser solo del servidor.
revoke execute on function public.mark_order_paid(bigint, text) from anon;
revoke execute on function public.mark_order_paid(bigint, text) from authenticated;

-- 2. Nadie inserta órdenes desde el navegador. Solo el service client.
revoke insert on public.orders             from anon;
revoke insert on public.order_items        from anon;
revoke insert on public.shipping_addresses from anon;

revoke insert on public.orders             from authenticated;
revoke insert on public.order_items        from authenticated;
revoke insert on public.shipping_addresses from authenticated;

-- Nota: los `select` se dejan como están. El agujero era de escritura, y sacar
-- lecturas a ciegas puede romper pantallas. Si más adelante se confirma que
-- nadie lee orders desde el navegador, se revisa aparte.

-- 3. Límites al bucket de fotos.
-- La 003 lo creó sin tope de tamaño ni lista de formatos, así que aceptaba
-- cualquier cosa de cualquier peso. Ahora el navegador achica antes de subir
-- (lib/image-client.ts) y la action valida del lado del servidor, pero el
-- bucket es la última línea: si alguien sube por la API de Storage salteando
-- el panel, acá se corta.
--
-- 5 MB va por encima del tope de la app (4 MB) a propósito: el que tiene que
-- rebotar primero es el que puede dar un mensaje claro, no el storage.
-- HEIC queda afuera aposta: next/image no lo puede renderizar.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
 where id = 'product-images';

-- ============================================================
-- CÓMO COMPROBAR QUE QUEDÓ CERRADO
--
-- Con la anon key del proyecto (la pública, la que está en el .env como
-- NEXT_PUBLIC_SUPABASE_ANON_KEY), esto TIENE que devolver 401/403:
--
--   curl -X POST 'https://<proyecto>.supabase.co/rest/v1/rpc/mark_order_paid' \
--     -H "apikey: <ANON_KEY>" \
--     -H "Authorization: Bearer <ANON_KEY>" \
--     -H "Content-Type: application/json" \
--     -d '{"p_order_id": 1, "p_payment_id": "prueba"}'
--
-- Y esto también:
--
--   curl -X POST 'https://<proyecto>.supabase.co/rest/v1/orders' \
--     -H "apikey: <ANON_KEY>" \
--     -H "Authorization: Bearer <ANON_KEY>" \
--     -H "Content-Type: application/json" \
--     -d '{"status":"pending","total":0,"customer_name":"x","customer_phone":"x","delivery_point":"domicilio"}'
--
-- Si alguno de los dos responde 200, la migración no se aplicó.
-- ============================================================
