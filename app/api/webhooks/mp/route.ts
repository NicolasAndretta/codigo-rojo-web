import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPaymentClient } from "@/lib/mercadopago/client";
import { procesarPago } from "@/lib/mercadopago/procesar-pago";

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
 * avisa por log; con secreto se valida en serio.
 *
 * ⚠️ Cargarla SÍ tiene riesgo: con un secreto equivocado (o si MP no firmara
 * estas notificaciones) se rechazan TODAS, y ningún pago se confirma. Por eso
 * se carga el mismo día que se hace un pago real de prueba, nunca suelta.
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

    const payment = await (await getPaymentClient()).get({ id: String(paymentId) });

    // La validación (monto, devoluciones, idempotencia) vive en procesarPago:
    // la conciliación usa la misma, para que los dos caminos nunca difieran.
    const resultado = await procesarPago(payment);

    if (resultado === "monto-inconsistente") {
      // NO se marcó pagada. 200 a propósito: reintentar no lo va a arreglar, y
      // dejar que MP reintente para siempre solo llena los logs de ruido.
      return NextResponse.json({ ok: true, revisar: true });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Error transitorio (la base o MP no respondieron) → 500 para que MP reintente.
    console.error("[webhook] Error procesando la notificación:", err);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
