-- ============================================================
-- Código Rojo — 013: botón de arrepentimiento
-- Ejecutar en Supabase SQL Editor después de 012.
-- ============================================================
--
-- POR QUÉ
--
-- La Resolución 424/2020 (Secretaría de Comercio Interior) obliga a las
-- tiendas online a tener un "botón de arrepentimiento" visible: el comprador
-- puede revocar la compra dentro de los 10 días corridos desde que la recibe
-- (art. 34 de la Ley 24.240), sin registrarse, y la tienda tiene que darle un
-- código de identificación del trámite dentro de las 24 horas.
--
-- Cada pedido de arrepentimiento queda acá con su código (se le muestra al
-- cliente en el momento) y Agustina lo ve en el panel → Arrepentimientos.
-- Lo escribe solo el servidor (/api/arrepentimiento, con tope por IP).
-- ============================================================

create table if not exists public.arrepentimientos (
  id             bigint primary key generated always as identity,
  codigo         text not null unique,
  nombre         text not null check (char_length(nombre) between 1 and 120),
  telefono       text not null check (char_length(telefono) between 1 and 40),
  email          text check (email is null or char_length(email) <= 160),
  numero_pedido  text check (numero_pedido is null or char_length(numero_pedido) <= 40),
  motivo         text check (motivo is null or char_length(motivo) <= 1000),
  estado         text not null default 'nuevo' check (estado in ('nuevo', 'resuelto')),
  creado_el      timestamptz not null default now(),
  resuelto_el    timestamptz
);

create index if not exists arrepentimientos_creado_idx on public.arrepentimientos (creado_el desc);

alter table public.arrepentimientos enable row level security;

-- Sin políticas: nadie lo lee ni lo escribe desde el navegador (tiene datos de
-- contacto). Solo el servidor; el panel chequea que sea admin.
revoke all on public.arrepentimientos from public, anon, authenticated;
grant select, insert, update on public.arrepentimientos to service_role;
