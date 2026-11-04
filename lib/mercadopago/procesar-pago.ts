// ============================================================
// Qué hacer con un pago de Mercado Pago. — SOLO SERVIDOR
//
// Lo usan dos caminos, y tienen que hacer EXACTAMENTE lo mismo:
//   1. El webhook (app/api/webhooks/mp), cuando MP avisa que hubo un pago.
//   2. La conciliación (lib/mercadopago/conciliar.ts), que cada pocos minutos
//      le pregunta a MP por las órdenes que siguen pendientes, por si el aviso
//      se perdió (la tienda caída o deployando justo en ese momento).
//
// Antes esta lógica vivía dentro del webhook. Si la conciliación tuviera su
// propia copia, tarde o temprano una de las dos validaría distinto, y una orden
// podría quedar pagada con un monto que el webhook habría rechazado.
//
// Todo es idempotente: `mark_order_paid` solo cambia una orden que está en
// 'pending', así que procesar el mismo pago dos veces (el webhook y la
// conciliación, o MP reintentando) no descuenta stock ni manda mails de más.
// ============================================================
import { createServiceClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/resend/order-emails";

export type PagoMP = {
  id?: number | string | null;
  status?: string | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
};

export type ResultadoPago =
  | "sin-orden"
  | "no-aprobado"
  | "revertido"
  | "revisar-devolucion"
  | "monto-inconsistente"
  | "pagado"
  | "ya-estaba";

/** Un problema momentáneo (la base no respondió): el que llamó tiene que reintentar. */
export class ErrorTransitorio extends Error {}

// Un peso de tolerancia: los numeric de Postgres y los montos de MP pueden
// diferir en centavos por redondeo, y eso no es un fraude.
const TOLERANCIA = 1;

export async function procesarPago(payment: PagoMP): Promise<ResultadoPago> {
  if (!payment.external_reference) return "sin-orden";

  const orderId = Number(payment.external_reference);
  const paymentId = String(payment.id ?? "");
  const supabase = createServiceClient();

  // --- Devolución o contracargo: MP devolvió la plata ---
  if (payment.status === "refunded" || payment.status === "charged_back") {
    const { data: revertida, error } = await supabase.rpc("mark_order_refunded", {
      p_order_id: orderId,
    });
    if (error) throw new ErrorTransitorio(error.message);

    if (revertida) {
      console.warn(
        `[pagos] Orden ${orderId} revertida por ${payment.status}: cancelada y stock repuesto (pago ${paymentId}).`
      );
      return "revertido";
    }
    // La orden ya salió de 'paid': está en preparación, despachada o entregada.
    // NO se repone stock automáticamente porque la mercadería ya no está.
    console.error(
      `[pagos] ⚠️ REVISAR A MANO — la orden ${orderId} recibió ${payment.status} pero ya no ` +
        `estaba en 'paid'. No se repuso stock ni se canceló: la mercadería pudo haber salido. ` +
        `Pago ${paymentId}.`
    );
    return "revisar-devolucion";
  }

  if (payment.status !== "approved") return "no-aprobado";

  // --- Antes de marcar pagado: que lo cobrado coincida con lo que vale ---
  // Sin esto, alcanzaba con que la orden dijera un total distinto del que MP
  // cobró para despachar mercadería casi gratis (ver migración 008).
  const { data: orden, error: ordenError } = await supabase
    .from("orders")
    .select("total, coupon_discount_id, order_items(quantity, unit_price)")
    .eq("id", orderId)
    .single<{
      total: number | string;
      coupon_discount_id: number | null;
      order_items: { quantity: number; unit_price: number | string }[];
    }>();

  // La orden tendría que existir: la crea /api/orders antes de mandar a MP.
  if (ordenError || !orden) throw new ErrorTransitorio("orden no encontrada");

  const totalOrden = Number(orden.total);
  const cobrado = Number(payment.transaction_amount ?? 0);
  // Suma de los ítems al precio que se congeló al crear la orden. El total
  // puede ser MENOR si se usó un cupón, pero nunca mayor.
  const sumaItems = orden.order_items.reduce(
    (acc, it) => acc + Number(it.unit_price) * it.quantity,
    0
  );

  if (Math.abs(cobrado - totalOrden) > TOLERANCIA || totalOrden - sumaItems > TOLERANCIA) {
    console.error(
      `[pagos] Monto inconsistente en la orden ${orderId} — NO se marcó pagada. ` +
        `cobrado=${cobrado} total=${totalOrden} suma_items=${sumaItems} pago=${paymentId}`
    );
    return "monto-inconsistente";
  }

  const { data: cambio, error } = await supabase.rpc("mark_order_paid", {
    p_order_id: orderId,
    p_payment_id: paymentId,
  });
  if (error) throw new ErrorTransitorio(error.message);

  // cambio === true solo la primera vez: el cupón y los mails, una sola vez.
  if (!cambio) return "ya-estaba";

  if (orden.coupon_discount_id) {
    await supabase.rpc("redeem_coupon", { p_discount_id: orden.coupon_discount_id });
  }
  await sendOrderEmails(orderId);
  return "pagado";
}
