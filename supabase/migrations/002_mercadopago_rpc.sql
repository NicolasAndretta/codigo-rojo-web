-- ============================================================
-- Código Rojo — RPC de confirmación de pago (MercadoPago)
-- Ejecutar en Supabase SQL Editor después de 001.
-- ============================================================

-- mark_order_paid: marca la orden como pagada y descuenta stock,
-- de forma IDEMPOTENTE (los webhooks de MP pueden llegar duplicados).
-- security definer = corre con privilegios del owner, bypassa RLS.
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
    update public.product_variants
      set stock = greatest(stock - v_item.quantity, 0)
      where id = v_item.variant_id;
  end loop;

  return true;
end;
$$;

grant execute on function public.mark_order_paid(bigint, text)
  to anon, authenticated, service_role;
