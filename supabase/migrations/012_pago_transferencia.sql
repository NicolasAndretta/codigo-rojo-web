-- ============================================================
-- Código Rojo — 012: pagar por transferencia o en efectivo, más barato
-- Ejecutar en Supabase SQL Editor después de 011.
-- ============================================================
--
-- POR QUÉ
--
-- Mercado Pago le cobra a Agustina ~8% de cada venta (6,6% + IVA en Provincia
-- de Buenos Aires, cobrando al instante). Por transferencia esa comisión no
-- existe, así que quiere ofrecer un precio más barato. Lo que decidió
-- (WhatsApp, 03/11/2026):
--   · precio normal tachado y el de transferencia más grande;
--   · efectivo = seña por transferencia (la mitad) y el resto al retirar;
--   · si no transfiere, el pedido se cancela solo a las 48 horas.
-- Todavía no eligió si el descuento es un % general o un precio a mano por
-- prenda: esto soporta las dos cosas (un % en tienda_config y, si se carga,
-- products.precio_transferencia gana sobre el %).
--
-- EL STOCK SE RESERVA AL HACER EL PEDIDO
--
-- Con Mercado Pago el stock se descuenta al pagar, porque el pedido vive unos
-- minutos. Uno por transferencia vive hasta 48 horas: sin reservar, dos
-- personas podían pedir la última prenda y las dos transferir. Así que
-- reservar_stock() la descuenta al crear el pedido (o rechaza el pedido si ya
-- no hay), y si se cancela o vence, vuelve al stock.
-- ============================================================

-- 1. La configuración de cobros de la tienda (una sola fila).
create table if not exists public.tienda_config (
  id                       smallint primary key default 1 check (id = 1),
  transferencia_activa     boolean not null default false,
  efectivo_activo          boolean not null default false,
  -- % de descuento pagando por transferencia o efectivo (0 = sin descuento).
  descuento_transferencia  numeric(5, 2) not null default 0
                             check (descuento_transferencia >= 0 and descuento_transferencia < 100),
  alias                    text,
  titular                  text,
  -- Efectivo: qué parte se adelanta por transferencia como seña.
  sena_porcentaje          smallint not null default 50 check (sena_porcentaje between 1 and 100),
  -- Cuánto tiempo hay para transferir antes de que el pedido se cancele solo.
  horas_para_pagar         smallint not null default 48 check (horas_para_pagar between 1 and 720),
  actualizada_el           timestamptz not null default now()
);

insert into public.tienda_config (id) values (1) on conflict (id) do nothing;

alter table public.tienda_config enable row level security;

-- La tienda pública necesita leerla (el %, y el alias para quien ya pidió).
-- Nada de esto es secreto: el alias se le muestra a cada comprador.
drop policy if exists "tienda_config: lectura publica" on public.tienda_config;
create policy "tienda_config: lectura publica" on public.tienda_config for select using (true);

-- Escribe solo el servidor (la action del panel chequea que sea admin).
revoke all on public.tienda_config from public, anon, authenticated;
grant select on public.tienda_config to anon, authenticated;
grant select, insert, update on public.tienda_config to service_role;

-- 2. Precio por transferencia a mano, por prenda (opcional; gana sobre el %).
alter table public.products
  add column if not exists precio_transferencia numeric(10, 2)
    check (precio_transferencia is null or precio_transferencia > 0);

-- 3. El pedido sabe cómo se paga.
alter table public.orders
  add column if not exists medio_pago text not null default 'mercadopago'
    check (medio_pago in ('mercadopago', 'transferencia', 'efectivo')),
  -- Lo que hay que transferir: el total, o la seña si es efectivo.
  add column if not exists monto_a_transferir numeric(10, 2),
  -- Hasta cuándo hay para transferir. Pasado esto, se cancela solo.
  add column if not exists vence_el timestamptz,
  add column if not exists stock_reservado boolean not null default false,
  -- Para la página "cómo transferir" del cliente: el número de orden se puede
  -- adivinar, esto no.
  add column if not exists token_publico uuid not null default gen_random_uuid();

create unique index if not exists orders_token_publico_idx on public.orders (token_publico);
create index if not exists orders_reservas_pendientes_idx
  on public.orders (vence_el) where status = 'pending' and stock_reservado;

-- 4. Reservar el stock de un pedido por transferencia. Todo o nada: si una
--    sola prenda no alcanza, no se toca nada y devuelve false.
create or replace function public.reservar_stock(p_order_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  -- Primero se bloquean y revisan TODAS las variantes (en orden de id, para
  -- que dos pedidos simultáneos no se traben entre sí).
  for v_item in
    select oi.variant_id, sum(oi.quantity)::integer as cantidad, pv.stock
    from public.order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = p_order_id
    group by oi.variant_id, pv.stock
    order by oi.variant_id
  loop
    perform 1 from public.product_variants where id = v_item.variant_id for update;
    if (select stock from public.product_variants where id = v_item.variant_id) < v_item.cantidad then
      return false;
    end if;
  end loop;

  update public.product_variants pv
    set stock = pv.stock - t.cantidad
    from (
      select variant_id, sum(quantity)::integer as cantidad
      from public.order_items
      where order_id = p_order_id
      group by variant_id
    ) t
    where pv.id = t.variant_id;

  update public.orders set stock_reservado = true where id = p_order_id;
  return true;
end;
$$;

-- 5. Agustina confirma que le llegó la transferencia. Solo pedidos por
--    transferencia/efectivo que siguen pendientes. El stock ya se descontó al
--    reservar: acá no se toca.
create or replace function public.confirmar_pago_manual(p_order_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
    set status = 'paid', updated_at = now()
    where id = p_order_id
      and status = 'pending'
      and medio_pago in ('transferencia', 'efectivo');
  return found;
end;
$$;

-- 6. Cancelar un pedido con stock reservado y devolver las prendas.
create or replace function public.cancelar_reserva(p_order_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
    set status = 'cancelled', stock_reservado = false, updated_at = now()
    where id = p_order_id and status = 'pending' and stock_reservado;
  if not found then
    return false;
  end if;

  update public.product_variants pv
    set stock = pv.stock + t.cantidad
    from (
      select variant_id, sum(quantity)::integer as cantidad
      from public.order_items
      where order_id = p_order_id
      group by variant_id
    ) t
    where pv.id = t.variant_id;

  return true;
end;
$$;

-- 7. Cancelar los pedidos que pasaron el plazo sin transferir. Lo llama la
--    conciliación (UptimeRobot, cada 5 minutos). Devuelve cuántos canceló.
create or replace function public.vencer_reservas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_n integer := 0;
begin
  for v_id in
    select id from public.orders
    where status = 'pending' and stock_reservado and vence_el < now()
    order by id
  loop
    if public.cancelar_reserva(v_id) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- 8. mark_order_paid (el del webhook de MP) no tiene que tocar nunca un
--    pedido por transferencia: su stock ya está reservado y lo descontaría dos
--    veces. Igual que la 011, con una condición más en el update.
create or replace function public.mark_order_paid(
  p_order_id bigint,
  p_payment_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_item record;
  v_stock integer;
  v_falto boolean := false;
begin
  update public.orders
    set status = 'paid', mp_payment_id = p_payment_id
    where id = p_order_id and status = 'pending' and medio_pago = 'mercadopago';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false;
  end if;

  for v_item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    select stock into v_stock
      from public.product_variants
      where id = v_item.variant_id
      for update;

    if v_stock is null or v_stock < v_item.quantity then
      v_falto := true;
    end if;

    update public.product_variants
      set stock = greatest(stock - v_item.quantity, 0)
      where id = v_item.variant_id;
  end loop;

  if v_falto then
    update public.orders set stock_insuficiente = true where id = p_order_id;
  end if;

  return true;
end;
$$;

-- 9. Permisos: todas son security definer y escriben, así que SOLO el
--    servidor (ver la 008: PUBLIC hereda EXECUTE en toda función nueva).
revoke execute on function public.reservar_stock(bigint)        from public, anon, authenticated;
revoke execute on function public.confirmar_pago_manual(bigint) from public, anon, authenticated;
revoke execute on function public.cancelar_reserva(bigint)      from public, anon, authenticated;
revoke execute on function public.vencer_reservas()             from public, anon, authenticated;
revoke execute on function public.mark_order_paid(bigint, text) from public, anon, authenticated;
grant  execute on function public.reservar_stock(bigint)        to service_role;
grant  execute on function public.confirmar_pago_manual(bigint) to service_role;
grant  execute on function public.cancelar_reserva(bigint)      to service_role;
grant  execute on function public.vencer_reservas()             to service_role;
grant  execute on function public.mark_order_paid(bigint, text) to service_role;
