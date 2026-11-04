// ============================================================
// Pedidos por transferencia o efectivo: confirmar y cancelar. — SOLO SERVIDOR
//
// Usan el cliente de servicio (las funciones de la base son solo de
// service_role), así que NO chequean permisos: eso lo hace la action que las
// llama (lib/admin/cobros.ts y lib/admin/actions.ts), con esAdmin().
// ============================================================
import { createServiceClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/resend/order-emails";

/**
 * Agustina vio la plata en su cuenta. Pasa el pedido a pagado (una sola vez),
 * usa el cupón si tenía, y le manda la confirmación al cliente.
 * Devuelve false si el pedido ya no estaba pendiente.
 */
export async function confirmarPagoManual(orderId: number): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: cambio, error } = await supabase.rpc("confirmar_pago_manual", { p_order_id: orderId });
  if (error) throw new Error(`No se pudo confirmar el pago: ${error.message}`);
  if (!cambio) return false;

  const { data: orden } = await supabase
    .from("orders")
    .select("coupon_discount_id")
    .eq("id", orderId)
    .single<{ coupon_discount_id: number | null }>();
  if (orden?.coupon_discount_id) {
    await supabase.rpc("redeem_coupon", { p_discount_id: orden.coupon_discount_id });
  }

  // A la tienda no: la confirmó ella misma.
  await sendOrderEmails(orderId, { tienda: false });
  return true;
}

/**
 * Cancela un pedido pendiente con las prendas reservadas y las devuelve al
 * stock. false si ya no estaba pendiente (o no tenía reserva).
 */
export async function cancelarReserva(orderId: number): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("cancelar_reserva", { p_order_id: orderId });
  if (error) throw new Error(`No se pudo cancelar el pedido: ${error.message}`);
  return Boolean(data);
}
