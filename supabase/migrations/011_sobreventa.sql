-- ============================================================
-- Código Rojo — 011: avisar cuando se vende algo que ya no había
-- Ejecutar en Supabase SQL Editor después de 010.
-- ============================================================
--
-- EL PROBLEMA
--
-- El stock se controla al CREAR la orden (/api/orders), pero se descuenta
-- recién al PAGAR (mark_order_paid). En el medio el cliente está en Mercado
-- Pago, a veces varios minutos. Si queda una sola remera y dos personas la
-- compran casi a la vez, las dos pasan el control, las dos pagan, y la 002
-- descontaba con `greatest(stock - cantidad, 0)`: el stock quedaba en 0 y la
-- segunda venta entraba como si nada. Agustina se enteraba al ir a buscar la
-- prenda al estante.
--
-- QUÉ CAMBIA
--
-- El pago se sigue confirmando igual: la plata ya entró y rechazarlo no la
-- devuelve. Lo que cambia es que la orden queda MARCADA con
-- `stock_insuficiente = true`, y el panel la muestra en rojo con el aviso
-- "se vendió sin stock: reponé o devolvé la plata". El problema se ve el mismo
-- día, no cuando el cliente reclama.
--
-- El `for update` bloquea la fila de la variante mientras se descuenta, así
-- dos pagos simultáneos de la última unidad no leen los dos "queda 1".
-- ============================================================

alter table public.orders
  add column if not exists stock_insuficiente boolean not null default false;

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
  -- Sólo transiciona si estaba 'pending' → garantiza una sola ejecución real
  update public.orders
    set status = 'paid', mp_payment_id = p_payment_id
    where id = p_order_id and status = 'pending';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false; -- ya estaba pagada (o no existe): no descontar de nuevo
  end if;

  -- Descontar stock por cada item de la orden
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
    update public.orders
      set stock_insuficiente = true
      where id = p_order_id;
  end if;

  return true;
end;
$$;

-- `create or replace` conserva los permisos de la función, pero se vuelven a
-- aplicar los de la 008 por las dudas: esta función NUNCA puede quedar
-- expuesta a anon (ver la 008).
revoke execute on function public.mark_order_paid(bigint, text) from public, anon, authenticated;
grant  execute on function public.mark_order_paid(bigint, text) to service_role;
