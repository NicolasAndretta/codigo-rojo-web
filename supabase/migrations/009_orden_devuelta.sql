-- ============================================================
-- Código Rojo — 009: revertir una orden cuando MercadoPago devuelve la plata
-- Ejecutar en Supabase SQL Editor después de 008.
-- ============================================================
--
-- EL PROBLEMA
--
-- El webhook sólo miraba `status === 'approved'`. Si después MP devolvía la
-- plata (`refunded`) o el comprador hacía un contracargo (`charged_back`), la
-- orden quedaba 'paid' y el stock descontado PARA SIEMPRE. Agustina veía un
-- pedido pagado que en realidad no le entró, y las prendas seguían figurando
-- como vendidas.
--
-- LA DECISIÓN DE NEGOCIO QUE HAY ACÁ, Y POR QUÉ
--
-- Reponer el stock automáticamente sólo es correcto si la mercadería NO salió.
-- Si el pedido ya está en 'preparing', 'shipped' o 'delivered', las prendas se
-- entregaron: reponerlas al inventario sería contar dos veces algo que ya no
-- está, y Agustina terminaría vendiendo lo que no tiene.
--
-- Por eso esta función sólo actúa cuando la orden está en 'paid' — cobrada pero
-- todavía sin preparar. En cualquier otro estado devuelve false y NO toca nada:
-- eso necesita que una persona mire el caso y decida. El webhook lo registra
-- con un log explícito para que no pase desapercibido.
--
-- Es idempotente por la misma vía que mark_order_paid: el `where status = 'paid'`
-- más `row_count`. MP puede reintentar la notificación y sólo la primera corre.
-- ============================================================

create or replace function public.mark_order_refunded(
  p_order_id bigint
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
  -- Sólo revierte si estaba 'paid'. Si ya se preparó o se despachó, no se toca.
  update public.orders
    set status = 'cancelled'
    where id = p_order_id and status = 'paid';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false; -- ya revertida, o en un estado que necesita decisión humana
  end if;

  -- Devolver al stock lo que se había descontado al cobrar.
  for v_item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.product_variants
      set stock = stock + v_item.quantity
      where id = v_item.variant_id;
  end loop;

  return true;
end;
$$;

-- Igual que redeem_coupon y que mark_order_paid después de la 008: sólo el
-- servidor. Esta función es security definer y saltea RLS, así que NUNCA va
-- concedida a anon ni a authenticated.
revoke execute on function public.mark_order_refunded(bigint) from public;
grant execute on function public.mark_order_refunded(bigint) to service_role;
