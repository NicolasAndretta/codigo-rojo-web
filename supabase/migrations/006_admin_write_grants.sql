-- ============================================================
-- Código Rojo — Migración 006
-- Grants de ESCRITURA para el rol `authenticated` (panel admin)
-- Ejecutar en Supabase SQL Editor después de 005.
-- ============================================================
-- Problema detectado en pruebas E2E: el panel admin no podía crear/editar
-- ni descuentos ni productos. Las acciones del admin (lib/admin/*.ts) usan
-- el cliente del request (rol `authenticated`, sujeto a RLS), pero las
-- migraciones 001/004 solo le dieron SELECT sobre estas tablas. Sin grants
-- de insert/update/delete, Postgres rechaza la escritura ANTES de evaluar
-- la policy RLS → "permission denied for table ..." → error genérico en el
-- formulario.
--
-- La seguridad NO se relaja: las policies `*_admin_*` (public.is_admin())
-- siguen filtrando. Un `authenticated` que NO es admin queda bloqueado por
-- RLS aunque tenga el grant de tabla. El grant es condición necesaria
-- (acceso a la tabla); la RLS es la que autoriza fila por fila.

grant select, insert, update, delete on public.products         to authenticated;
grant select, insert, update, delete on public.product_variants to authenticated;
grant select, insert, update, delete on public.categories       to authenticated;
grant select, insert, update, delete on public.discounts        to authenticated;

-- Las secuencias ya están concedidas a authenticated en 001
-- (grant usage, select on all sequences ...). Nada más que hacer.

-- ============================================================
-- Después de correr esto, el panel admin puede:
--  - crear/editar/eliminar productos y variantes (stock)
--  - crear/editar categorías
--  - crear/pausar/eliminar descuentos y cupones
-- ============================================================
