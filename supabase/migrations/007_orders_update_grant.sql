-- ============================================================
-- Código Rojo — Migración 007
-- Grant de UPDATE sobre `orders` para el rol `authenticated` (panel admin)
-- Ejecutar en Supabase SQL Editor después de 006.
-- ============================================================
-- Bug detectado en pruebas E2E (2026-06-19): cambiar el estado de una orden
-- desde el panel admin (/admin/ordenes/[id]) fallaba EN SILENCIO. La acción
-- `updateOrderStatus` (lib/admin/actions.ts) usa el cliente del request
-- (rol `authenticated`) y hace UPDATE sobre public.orders, pero la migración
-- 001 sólo concedió SELECT + INSERT a `authenticated` (línea 261) y la 006
-- otorgó escritura a products/product_variants/categories/discounts — nunca a
-- `orders`. Postgres rechaza el UPDATE con 42501 "permission denied for table
-- orders" ANTES de evaluar la policy, y la acción no chequea el error → el
-- formulario "actualiza" pero el estado nunca cambia.
--
-- La seguridad NO se relaja: la policy `orders_admin_all` (FOR ALL using
-- public.is_admin()) ya existe y es la que autoriza. Un `authenticated` que NO
-- es admin sigue sin poder hacer UPDATE (no hay policy permisiva de UPDATE para
-- él: orders_self_* sólo cubren SELECT e INSERT). El grant es condición
-- necesaria (acceso a la tabla); la RLS sigue autorizando fila por fila.

grant update on public.orders to authenticated;

-- ============================================================
-- Después de correr esto, el panel admin puede cambiar el estado de las
-- órdenes (pending → paid → preparing → shipped → delivered / cancelled).
-- ============================================================
