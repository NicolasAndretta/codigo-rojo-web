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

    const { data: changed, error } = await supabase.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_payment_id: String(paymentId),
    });

    if (error) {
      // Error transitorio → 500 para que MP reintente
      return NextResponse.json({ error: "rpc failed" }, { status: 500 });
    }

    // changed === true sólo la primera vez (idempotencia) → emails una sola vez
    if (changed) {
      await sendOrderEmails(orderId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
