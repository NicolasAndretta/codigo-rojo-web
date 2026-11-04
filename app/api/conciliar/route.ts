import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { conciliar } from "@/lib/mercadopago/conciliar";

// ============================================================
// Conciliación de pagos, para que la llame UptimeRobot cada 5 minutos.
//
// Busca en Mercado Pago los pagos de las órdenes que siguen pendientes y
// confirma las que estén pagadas (por si el webhook no llegó). Detalle en
// lib/mercadopago/conciliar.ts.
//
// Pide una clave (?clave=...) que vive en CONCILIAR_CLAVE: sin ella cualquiera
// podría hacer que la tienda le pegue a la API de MP sin parar.
//
// Respuestas:
//   200 → corrió (aunque no haya confirmado nada).
//   503 → no pudo correr: MP desconectado o la base sin conexión. UptimeRobot
//         avisa.
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 0;

function claveValida(recibida: string | null): boolean {
  const esperada = process.env.CONCILIAR_CLAVE;
  if (!esperada || !recibida) return false;
  // Comparación en tiempo constante, sobre hashes para que el largo no importe.
  const a = crypto.createHash("sha256").update(esperada).digest();
  const b = crypto.createHash("sha256").update(recibida).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!process.env.CONCILIAR_CLAVE) {
    return NextResponse.json({ ok: false, error: "no-configurada" }, { status: 503 });
  }
  if (!claveValida(req.nextUrl.searchParams.get("clave"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const r = await conciliar();
    if (!r.corrio) {
      return NextResponse.json({ ok: false, motivo: r.motivo }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      revisadas: r.revisadas,
      confirmadas: r.confirmadas.length,
      a_revisar: r.aRevisar.length,
      errores: r.errores,
    });
  } catch (err) {
    console.error("[conciliar] Falló la corrida:", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
