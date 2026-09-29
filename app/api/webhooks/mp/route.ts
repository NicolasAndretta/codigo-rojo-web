import { NextRequest, NextResponse } from "next/server";
import { getPaymentClient } from "@/lib/mercadopago/client";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/resend/order-emails";

// Webhook de MercadoPago. Fuente de verdad del pago (NO confiar en el
// redirect del cliente). MP puede reintentar y duplicar → todo es idempotente.
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => null);

    const type =
      body?.type ??
      url.searchParams.get("type") ??
      url.searchParams.get("topic");

    const paymentId =
      body?.data?.id ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id");

    // Sólo nos interesan notificaciones de pago
    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await getPaymentClient().get({ id: String(paymentId) });

    if (payment.status !== "approved" || !payment.external_reference) {
      return NextResponse.json({ ok: true });
    }

    const orderId = Number(payment.external_reference);
    const supabase = createServiceClient();

    // --- Antes de marcar pagado: que lo cobrado coincida con lo que vale ---
    // Sin esto, alcanzaba con que la orden dijera un total distinto del que MP
    // cobró para despachar mercadería casi gratis. Es el cinturón de la
    // migración 008, que cerró el camino por el que se podía tocar la orden.
    const { data: orden, error: ordenError } = await supabase
      .from("orders")
      .select("total, order_items(quantity, unit_price)")
      .eq("id", orderId)
      .single<{
        total: number | string;
        order_items: { quantity: number; unit_price: number | string }[];
      }>();

    if (ordenError || !orden) {
      // La orden tendría que existir: la crea /api/orders antes de mandar a MP.
      // 500 para que MP reintente por si es un problema momentáneo de la base.
      return NextResponse.json({ error: "orden no encontrada" }, { status: 500 });
    }

    const totalOrden = Number(orden.total);
    const cobrado = Number(payment.transaction_amount ?? 0);
    // Suma de los ítems al precio que se congeló al crear la orden. El total
    // puede ser MENOR si se usó un cupón, pero nunca mayor.
    const sumaItems = orden.order_items.reduce(
      (acc, it) => acc + Number(it.unit_price) * it.quantity,
      0
    );

    // Un peso de tolerancia: los numeric de Postgres y los montos de MP pueden
    // diferir en centavos por redondeo, y eso no es un fraude.
    const TOLERANCIA = 1;
    const cobradoNoCoincide = Math.abs(cobrado - totalOrden) > TOLERANCIA;
    const totalInflado = totalOrden - sumaItems > TOLERANCIA;

    if (cobradoNoCoincide || totalInflado) {
      // NO se marca pagada. 200 a propósito: reintentar no lo va a arreglar, y
      // dejar que MP reintente para siempre solo llena los logs de ruido.
      console.error(
        `[webhook] Monto inconsistente en la orden ${orderId} — NO se marcó pagada. ` +
          `cobrado=${cobrado} total=${totalOrden} suma_items=${sumaItems} pago=${paymentId}`
      );
      return NextResponse.json({ ok: true, revisar: true });
    }

    const { data: changed, error } = await supabase.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_payment_id: String(paymentId),
    });

    if (error) {
      // Error transitorio → 500 para que MP reintente
      return NextResponse.json({ error: "rpc failed" }, { status: 500 });
    }

    // changed === true sólo la primera vez (idempotencia) → emails + cupón una sola vez
    if (changed) {
      // Redimir cupón si la orden usó uno
      const { data: order } = await supabase
        .from("orders")
        .select("coupon_discount_id")
        .eq("id", orderId)
        .single<{ coupon_discount_id: number | null }>();

      if (order?.coupon_discount_id) {
        await supabase.rpc("redeem_coupon", { p_discount_id: order.coupon_discount_id });
      }

      await sendOrderEmails(orderId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
