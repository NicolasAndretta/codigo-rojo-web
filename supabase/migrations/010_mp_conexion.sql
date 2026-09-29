-- ============================================================
-- Código Rojo — 010: la tienda conecta SU Mercado Pago (MP Connect / OAuth)
-- Ejecutar en Supabase SQL Editor después de 009.
-- ============================================================
--
-- POR QUÉ
--
-- Hasta acá el cobro usaba un token fijo en las variables de entorno. Eso tenía
-- dos problemas, y los dos pasaron de verdad:
--
--   1. Nico tenía el token de la cuenta de Agustina. Un token de producción es
--      la llave de la cuenta: con él se crean cobros a su nombre.
--   2. El 29/09/2026 Hostinger borró las variables en un redeploy y el token se
--      perdió. Recuperarlo exigía que ella estuviera presente (el ingreso a MP le
--      pide un código al celular).
--
-- Con MP Connect, Agustina entra a /admin/cobros, toca "Conectar Mercado Pago"
-- y autoriza con SU cuenta. La aplicación de MP es de Nico (una sola, sirve para
-- cualquier cliente); la plata cae en la cuenta de ella. Nico nunca ve su token.
--
-- QUÉ SE GUARDA Y QUIÉN LO PUEDE LEER
--
-- El token de la tienda vive en esta tabla, y SOLO el servidor lo puede leer.
-- RLS activado y sin políticas: ni anon ni authenticated ven una fila, ni
-- siquiera el admin logueado. El panel muestra "Conectado como …" a través del
-- servidor, que nunca devuelve el token al navegador.
--
-- No está cifrado dentro de la tabla. Lo protege el mismo mecanismo que al
-- resto de los datos (RLS + service role). Cifrarlo con una clave en las
-- variables de entorno haría que un redeploy que las borre —ya pasó— deje la
-- tienda sin poder cobrar aunque la conexión siga guardada.
--
-- Una sola fila: es una sola tienda. El check (id = 1) lo garantiza, y
-- reconectar reemplaza la conexión en vez de acumular tokens viejos.
-- ============================================================

create table if not exists public.mp_conexion (
  id              smallint primary key default 1 check (id = 1),
  mp_user_id      text not null,
  mp_nickname     text,
  mp_email        text,
  access_token    text not null,
  refresh_token   text,
  expires_at      timestamptz,
  conectada_el    timestamptz not null default now(),
  actualizada_el  timestamptz not null default now()
);

alter table public.mp_conexion enable row level security;

-- Sin políticas a propósito. Y los permisos, explícitos: en este proyecto los
-- default privileges no se pueden dar por sentados (ver 005 y 008).
revoke all on public.mp_conexion from public, anon, authenticated;
grant select, insert, update, delete on public.mp_conexion to service_role;

-- ============================================================
-- CÓMO COMPROBARLO (no toca datos). Tiene que dar false, false, true:
--
--   select
--     has_table_privilege('anon', 'public.mp_conexion', 'select')          as anon_lee,
--     has_table_privilege('authenticated', 'public.mp_conexion', 'select') as logueado_lee,
--     has_table_privilege('service_role', 'public.mp_conexion', 'select')  as servidor_lee;
-- ============================================================
