-- ============================================================
-- Código Rojo — Schema inicial
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Enums
create type public.user_role as enum ('admin', 'client');
create type public.product_size as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL');
create type public.order_status as enum (
  'pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'
);
create type public.delivery_type as enum ('pickup', 'delivery');

-- ============================================================
-- profiles (extiende auth.users)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- Auto-crear perfil al registrar usuario
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- categories
-- ============================================================
create table public.categories (
  id         bigint primary key generated always as identity,
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- products
-- ============================================================
create table public.products (
  id          bigint primary key generated always as identity,
  name        text not null,
  description text,
  price       numeric(10, 2) not null check (price >= 0),
  category_id bigint references public.categories(id) on delete set null,
  images      text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- product_variants (stock por talle)
-- ============================================================
create table public.product_variants (
  id         bigint primary key generated always as identity,
  product_id bigint not null references public.products(id) on delete cascade,
  size       public.product_size not null,
  stock      integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);

-- ============================================================
-- orders
-- ============================================================
create table public.orders (
  id              bigint primary key generated always as identity,
  user_id         uuid references public.profiles(id) on delete set null,
  status          public.order_status not null default 'pending',
  total           numeric(10, 2) not null check (total >= 0),
  delivery_type   public.delivery_type not null,
  mp_payment_id   text,
  mp_preference_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- order_items
-- ============================================================
create table public.order_items (
  id         bigint primary key generated always as identity,
  order_id   bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id) on delete restrict,
  variant_id bigint not null references public.product_variants(id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

-- ============================================================
-- shipping_addresses (one-to-one con orders)
-- ============================================================
create table public.shipping_addresses (
  id           bigint primary key generated always as identity,
  order_id     bigint not null unique references public.orders(id) on delete cascade,
  full_name    text not null,
  phone        text not null,
  street       text not null,
  number       text not null,
  floor_apt    text,
  localidad    text not null,
  provincia    text not null,
  codigo_postal text not null,
  notes        text
);

-- ============================================================
-- updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_products
  before update on public.products
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_variants
  before update on public.product_variants
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Helper para chequeo de rol admin sin recursión RLS
-- CRÍTICO: security definer = ejecuta sin RLS en profiles,
-- evitando el loop infinito que ocurre cuando las políticas
-- de otras tablas consultan profiles y profiles se consulta a sí misma.
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;

-- profiles
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- categories: públicas para lectura, solo admin escribe
create policy "categories_public_read" on public.categories
  for select using (true);

create policy "categories_admin_write" on public.categories
  for all using (public.is_admin());

-- products: activos son públicos; admin ve/edita todos
create policy "products_public_read" on public.products
  for select using (is_active = true);

create policy "products_admin_all" on public.products
  for all using (public.is_admin());

-- product_variants: públicas para lectura
create policy "variants_public_read" on public.product_variants
  for select using (true);

create policy "variants_admin_all" on public.product_variants
  for all using (public.is_admin());

-- orders: cada user ve solo las suyas; admin ve todas
create policy "orders_self_read" on public.orders
  for select using (auth.uid() = user_id);

create policy "orders_self_insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "orders_admin_all" on public.orders
  for all using (public.is_admin());

-- order_items: via orders
create policy "order_items_self_read" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_items_self_insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin());

-- shipping_addresses: via orders
create policy "shipping_self_read" on public.shipping_addresses
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "shipping_self_insert" on public.shipping_addresses
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "shipping_admin_all" on public.shipping_addresses
  for all using (public.is_admin());

-- ============================================================
-- Permisos de roles (CRÍTICO: crear tablas vía SQL no otorga
-- permisos automáticamente — el dashboard sí lo hace)
-- ============================================================

-- Lectura pública sin auth
grant select on public.categories        to anon, authenticated;
grant select on public.products          to anon, authenticated;
grant select on public.product_variants  to anon, authenticated;

-- Usuarios autenticados
grant select, insert         on public.orders             to authenticated;
grant select, insert         on public.order_items        to authenticated;
grant select, insert         on public.shipping_addresses to authenticated;
grant select, update         on public.profiles           to authenticated;
grant insert                 on public.profiles           to anon;

-- Sequences para IDs autogenerados
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================
-- Datos iniciales (categorías)
-- ============================================================
insert into public.categories (name, slug) values
  ('Remeras', 'remeras'),
  ('Hoodies', 'hoodies'),
  ('Pantalones', 'pantalones'),
  ('Accesorios', 'accesorios');
