import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPaymentClient } from "@/lib/mercadopago/client";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendOrderEmails } from "@/lib/resend/order-emails";

/**
 * Verifica la firma con la que MercadoPago firma cada notificación.
 *
 * MP manda dos headers: `x-signature` (con `ts=...,v1=...`) y `x-request-id`.
 * El v1 es un HMAC-SHA256 de la plantilla
 *     id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * usando la clave secreta que se genera en el panel de MP, en la configuración
 * del webhook.
 *
 * DECISIÓN IMPORTANTE — por qué esto no rechaza cuando falta el secreto:
 * si `MP_WEBHOOK_SECRET` no está cargada y acá devolviéramos 401, NINGÚN pago
 * se confirmaría. Sería provocar exactamente el desastre que este archivo
 * intenta evitar, y encima en silencio. Así que sin secreto se deja pasar y se
 * avisa por log; con secreto se valida en serio. De esa forma cargar la
 * variable es un endurecimiento que se puede hacer cuando se quiera, sin
 * riesgo de cortar las ventas en el medio.
 *
 * La defensa que YA existía sigue en pie igual: más abajo se vuelve a consultar
 * el pago contra la API de MP con el token del vendedor y se exige que esté
 * 'approved'. Un id inventado no pasa. Esto suma, no reemplaza.
 */
function firmaValida(req: NextRequest, dataId: string): boolean {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) {
    console.warn(
      "[webhook] MP_WEBHOOK_SECRET no está cargada: no se verifica la firma. " +
        "Generala en el panel de MercadoPago (configuración del webhook) y cargala " +
        "en las variables de entorno del hosting."
    );
    return true;
  }

  const firma = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!firma || !requestId) return false;

  // "ts=1704908010,v1=618c85..." → { ts, v1 }
  const partes = Object.fromEntries(
    firma.split(",").map((p) => {
      const [k, ...resto] = p.split("=");
      return [k.trim(), resto.join("=").trim()];
    })
  );
  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  // MP pide el id en minúsculas cuando es alfanumérico.
  const plantilla = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", secreto).update(plantilla).digest("hex");

  // Comparación en tiempo constante: comparar con === filtra información por
  // el tiempo que tarda en encontrar la primera diferencia.
  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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

    if (!firmaValida(req, String(paymentId))) {
      console.error(`[webhook] Firma inválida para el pago ${paymentId}. Descartado.`);
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }

    const payment = await getPaymentClient().get({ id: String(paymentId) });

    if (!payment.external_reference) {
      return NextResponse.json({ ok: true });
    }

    const orderId = Number(payment.external_reference);
    const supabase = createServiceClient();

    // --- Devolución o contracargo: MP devolvió la plata ---
    // Antes sólo se miraba 'approved', así que estos casos no hacían nada y la
    // orden quedaba cobrada y el stock descontado para siempre.
    if (payment.status === "refunded" || payment.status === "charged_back") {
      const { data: revertida, error: revertirError } = await supabase.rpc(
        "mark_order_refunded",
        { p_order_id: orderId }
      );

      if (revertirError) {
        return NextResponse.json({ error: "rpc failed" }, { status: 500 });
      }

      if (revertida) {
        console.warn(
          `[webhook] Orden ${orderId} revertida por ${payment.status}: ` +
            `cancelada y stock repuesto (pago ${paymentId}).`
        );
      } else {
        // La orden ya salió de 'paid': está en preparación, despachada o
        // entregada. NO se repone stock automáticamente porque la mercadería
        // ya no está. Necesita que alguien mire el caso.
        console.error(
          `[webhook] ⚠️ REVISAR A MANO — la orden ${orderId} recibió ${payment.status} ` +
            `pero ya no estaba en 'paid'. No se repuso stock ni se canceló: la ` +
            `mercadería pudo haber salido. Pago ${paymentId}.`
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

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
