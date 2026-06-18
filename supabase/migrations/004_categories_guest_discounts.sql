-- ============================================================
-- Código Rojo — Migración 004
-- Categorías jerárquicas + checkout invitado + módulo descuentos
-- Ejecutar en Supabase SQL Editor después de 003.
-- ============================================================

-- ============================================================
-- 1) CATEGORÍAS JERÁRQUICAS (categoría → subcategoría)
-- ============================================================

alter table public.categories
  add column if not exists parent_id     bigint references public.categories(id) on delete cascade,
  add column if not exists display_order integer not null default 0;

create index if not exists categories_parent_id_idx on public.categories(parent_id);

-- Reseed completo de categorías para Código Rojo.
-- Limpiamos las categorías demo (Hoodies/Accesorios) y dejamos la
-- jerarquía real. on delete set null en products → los productos
-- existentes quedan sin categoría, no se borran.
delete from public.categories;
-- Reiniciar la secuencia de IDs para que el seed sea predecible
alter sequence public.categories_id_seq restart with 1;

-- Categorías raíz (parent_id null)
insert into public.categories (name, slug, parent_id, display_order) values
  ('Remeras',    'remeras',    null, 1),
  ('Pantalones', 'pantalones', null, 2),
  ('Conjuntos',  'conjuntos',  null, 3),
  ('Buzos',      'buzos',      null, 4),
  ('Shorts',     'shorts',     null, 5),
  ('Bermudas',   'bermudas',   null, 6);

-- Subcategorías de Pantalones
insert into public.categories (name, slug, parent_id, display_order)
select 'Jean', 'jean', id, 1 from public.categories where slug = 'pantalones';

insert into public.categories (name, slug, parent_id, display_order)
select 'Joggin', 'joggin', id, 2 from public.categories where slug = 'pantalones';

-- ============================================================
-- 2) CHECKOUT COMO INVITADO
-- ============================================================
-- El cliente final compra sin cuenta. Guardamos su contacto
-- directamente en la orden y reemplazamos el viejo delivery_type
-- (pickup|delivery) por un punto de entrega concreto.

-- Nuevo enum de punto de entrega
do $$ begin
  create type public.delivery_point as enum ('haedo', 'ramos_mejia', 'domicilio');
exception when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists customer_name   text,
  add column if not exists customer_phone  text,
  add column if not exists customer_email  text,
  add column if not exists delivery_point  public.delivery_point,
  add column if not exists delivery_address text,
  add column if not exists delivery_notes  text;

-- Cupón aplicado a la orden (para redimirlo al confirmar el pago).
-- La FK se agrega más abajo, junto con la creación de la tabla discounts.

-- Migrar datos existentes: las órdenes viejas con delivery_type se
-- mapean a un punto por defecto para no perder histórico.
update public.orders
  set delivery_point = case
    when delivery_type = 'delivery' then 'domicilio'::public.delivery_point
    else 'haedo'::public.delivery_point
  end
  where delivery_point is null;

-- A partir de ahora delivery_type deja de ser obligatorio (lo
-- reemplaza delivery_point). Lo dejamos nullable por compatibilidad.
alter table public.orders alter column delivery_type drop not null;

-- --- RLS: permitir compra anónima ---------------------------------
-- Las órdenes de invitado tienen user_id null. Permitimos a anon
-- insertar órdenes/items siempre que user_id sea null (un anónimo
-- nunca puede insertar una orden a nombre de otro usuario).

drop policy if exists "orders_self_insert" on public.orders;
create policy "orders_guest_or_self_insert" on public.orders
  for insert with check (
    user_id is null or auth.uid() = user_id
  );

drop policy if exists "order_items_self_insert" on public.order_items;
create policy "order_items_guest_or_self_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

drop policy if exists "shipping_self_insert" on public.shipping_addresses;
create policy "shipping_guest_or_self_insert" on public.shipping_addresses
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id is null or o.user_id = auth.uid())
    )
  );

-- Grants para el rol anónimo (insert de compra invitada)
grant insert on public.orders             to anon;
grant insert on public.order_items        to anon;
grant insert on public.shipping_addresses to anon;

-- ============================================================
-- 3) MÓDULO DE DESCUENTOS (genérico y reutilizable)
-- ============================================================
-- ┌──────────────────────────────────────────────────────────┐
-- │ MÓDULO REUTILIZABLE — Sistema de descuentos para e-commerce │
-- │ Diseñado para portarse a otros proyectos sin cambios:       │
-- │  - Nombres genéricos (discounts, no "codigo_rojo_*")        │
-- │  - 3 alcances: producto, categoría, cupón                   │
-- │  - 2 modos de valor: porcentaje o monto fijo               │
-- │  - Vigencia (fechas) y límite de usos opcionales           │
-- │ Depende solo de: products(id), categories(id).             │
-- └──────────────────────────────────────────────────────────┘

do $$ begin
  create type public.discount_scope as enum ('product', 'category', 'coupon');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.discount_value_type as enum ('percent', 'fixed');
exception when duplicate_object then null;
end $$;

create table if not exists public.discounts (
  id          bigint primary key generated always as identity,
  scope       public.discount_scope      not null,
  value_type  public.discount_value_type not null,
  value       numeric(10, 2) not null check (value > 0),

  -- Alcance: exactamente uno aplica según `scope`
  target_product_id  bigint references public.products(id)   on delete cascade,
  target_category_id bigint references public.categories(id) on delete cascade,
  code               text,   -- solo para scope = 'coupon' (case-insensitive)

  -- Vigencia y límites (opcionales → MVP simple)
  starts_at   timestamptz,
  ends_at     timestamptz,
  max_uses    integer check (max_uses is null or max_uses > 0),
  uses_count  integer not null default 0,

  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Integridad: cada scope exige su target correspondiente
  constraint discount_scope_target check (
    (scope = 'product'  and target_product_id  is not null and target_category_id is null and code is null) or
    (scope = 'category' and target_category_id is not null and target_product_id  is null and code is null) or
    (scope = 'coupon'   and code is not null and target_product_id is null and target_category_id is null)
  )
);

-- Un único descuento activo por producto / categoría / código
create unique index if not exists discounts_unique_active_product
  on public.discounts(target_product_id) where scope = 'product' and is_active;
create unique index if not exists discounts_unique_active_category
  on public.discounts(target_category_id) where scope = 'category' and is_active;
create unique index if not exists discounts_unique_active_coupon
  on public.discounts(lower(code)) where scope = 'coupon' and is_active;

drop trigger if exists set_updated_at_discounts on public.discounts;
create trigger set_updated_at_discounts
  before update on public.discounts
  for each row execute procedure public.set_updated_at();

-- Vincular la orden con el cupón aplicado (FK definida ahora que existe discounts)
alter table public.orders
  add column if not exists coupon_discount_id bigint references public.discounts(id) on delete set null;

-- --- RLS ----------------------------------------------------------
alter table public.discounts enable row level security;

-- Lectura pública SOLO de descuentos de producto/categoría vigentes
-- (los cupones no se listan; se validan por código en el checkout vía RPC).
create policy "discounts_public_read" on public.discounts
  for select using (
    is_active
    and scope in ('product', 'category')
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );

create policy "discounts_admin_all" on public.discounts
  for all using (public.is_admin());

grant select on public.discounts to anon, authenticated;

-- --- Validación de cupón (RPC) ------------------------------------
-- security definer: permite validar un cupón sin exponer la tabla
-- completa a anónimos. Devuelve el descuento si el código es válido
-- y está vigente; null en caso contrario.
create or replace function public.validate_coupon(p_code text)
returns table (
  id         bigint,
  value_type public.discount_value_type,
  value      numeric
)
language sql
security definer
stable
set search_path = ''
as $$
  select d.id, d.value_type, d.value
  from public.discounts d
  where d.scope = 'coupon'
    and d.is_active
    and lower(d.code) = lower(trim(p_code))
    and (d.starts_at is null or d.starts_at <= now())
    and (d.ends_at   is null or d.ends_at   >= now())
    and (d.max_uses  is null or d.uses_count < d.max_uses)
  limit 1;
$$;

grant execute on function public.validate_coupon(text) to anon, authenticated, service_role;

-- Incremento atómico de uso de cupón (lo llama el webhook al confirmar pago)
create or replace function public.redeem_coupon(p_discount_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.discounts
    set uses_count = uses_count + 1
    where id = p_discount_id and scope = 'coupon';
$$;

grant execute on function public.redeem_coupon(bigint) to service_role;

-- ============================================================
-- Notas de despliegue
-- ============================================================
-- 1. Al borrar las categorías demo, los productos previos quedan sin
--    categoría: reasignalos desde el panel admin.
-- 2. Recordá que tu prima debe ser admin (ver migración 003).
