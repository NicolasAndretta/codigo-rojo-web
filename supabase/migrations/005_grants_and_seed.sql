-- ============================================================
-- Código Rojo — Migración 005
-- Grants faltantes para service_role + datos de prueba (seed)
-- Ejecutar en Supabase SQL Editor DESPUÉS de 004.
-- ============================================================
-- Contexto: las migraciones 001–004 otorgan privilegios solo a
-- anon/authenticated. Las escrituras de sistema (creación de orden en
-- /api/orders y el webhook de MercadoPago) usan el cliente service_role,
-- que sin grants explícitos recibe "permission denied for table ..." (42501).
-- En SQL crudo los grants a service_role hay que darlos a mano (el
-- dashboard de Supabase los aplica solo; el SQL Editor no).

-- ============================================================
-- 1) GRANTS para service_role (escrituras de sistema)
-- ============================================================
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables    in schema public to service_role;
grant usage, select                  on all sequences  in schema public to service_role;
grant execute                        on all functions  in schema public to service_role;

-- Que también aplique a objetos futuros creados por el rol actual
alter default privileges in schema public
  grant select, insert, update, delete on tables    to service_role;
alter default privileges in schema public
  grant usage, select                  on sequences to service_role;
alter default privileges in schema public
  grant execute                        on functions to service_role;

-- ============================================================
-- 2) SEED de productos de prueba
-- ============================================================
-- Reasignar el producto demo existente a la categoría Remeras (la
-- migración 004 borró las categorías viejas → quedó sin categoría).
update public.products p
  set category_id = (select id from public.categories where slug = 'remeras')
  where p.name = 'Remera Perception' and p.category_id is null;

-- Productos nuevos (guardados por nombre → re-ejecutable sin duplicar).
-- images vacío a propósito: ProductCard muestra un fallback limpio.
insert into public.products (name, description, price, category_id, images, is_active)
select v.name, v.description, v.price,
       (select id from public.categories where slug = v.slug), '{}', true
from (values
  ('Jean Cargo Shadow',  'Jean cargo de corte recto, denim pesado.',           38000, 'jean'),
  ('Jean Slim Eclipse',  'Jean slim negro con lavado oscuro.',                 35000, 'jean'),
  ('Joggin Tactical',    'Joggin de frisa con bolsillos cargo.',               29000, 'joggin'),
  ('Joggin Core Black',  'Joggin clásico de algodón, calce regular.',          26000, 'joggin'),
  ('Remera Oversize Cult','Remera oversize 100% algodón, estampa frontal.',    25000, 'remeras')
) as v(name, description, price, slug)
where not exists (select 1 from public.products p where p.name = v.name);

-- Variantes (talles + stock) por producto, guardadas por (producto, talle).
insert into public.product_variants (product_id, size, stock)
select p.id, s.size::public.product_size, s.stock
from public.products p
join (values
  ('Jean Cargo Shadow','S',5), ('Jean Cargo Shadow','M',8), ('Jean Cargo Shadow','L',4), ('Jean Cargo Shadow','XL',2),
  ('Jean Slim Eclipse','S',3), ('Jean Slim Eclipse','M',6), ('Jean Slim Eclipse','L',5),
  ('Joggin Tactical','S',7), ('Joggin Tactical','M',9), ('Joggin Tactical','L',6), ('Joggin Tactical','XL',3),
  ('Joggin Core Black','M',10), ('Joggin Core Black','L',8), ('Joggin Core Black','XL',4),
  ('Remera Oversize Cult','S',6), ('Remera Oversize Cult','M',6), ('Remera Oversize Cult','L',6)
) as s(pname, size, stock) on s.pname = p.name
where not exists (
  select 1 from public.product_variants pv
  where pv.product_id = p.id and pv.size = s.size::public.product_size
);

-- ============================================================
-- 3) Descuento de ejemplo (scope = product) para ver el módulo activo
-- ============================================================
-- 20% off en "Joggin Tactical". Guardado por target_product_id → re-ejecutable.
insert into public.discounts (scope, value_type, value, target_product_id, is_active)
select 'product', 'percent', 20, p.id, true
from public.products p
where p.name = 'Joggin Tactical'
  and not exists (
    select 1 from public.discounts d
    where d.scope = 'product' and d.target_product_id = p.id and d.is_active
  );

-- ============================================================
-- Listo. Después de correr esto:
--  - service_role puede crear órdenes (checkout invitado funciona)
--  - hay productos en Pantalones→Jean/Joggin con stock
--  - "Joggin Tactical" tiene 20% off visible en la tienda
-- ============================================================
