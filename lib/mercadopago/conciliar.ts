// ============================================================
// Conciliación: le pregunta a Mercado Pago por las órdenes que siguen
// pendientes, por si el aviso del webhook se perdió. — SOLO SERVIDOR
//
// POR QUÉ EXISTE: el webhook es la única forma en que la tienda se entera de
// que alguien pagó. Si justo en ese momento la tienda estaba caída o
// deployando, MP reintenta un rato y después se rinde. Resultado: el cliente
// pagó, la plata está en la cuenta de Agustina, y la orden queda en
// 'pending' para siempre — sin mail, sin stock descontado, sin aviso.
//
// Esto lo cierra desde el otro lado: cada pocos minutos (UptimeRobot llama a
// /api/conciliar) y cada vez que Agustina abre /admin/ordenes, se buscan en MP
// los pagos de las órdenes pendientes de los últimos días. Si alguno está
// aprobado, pasa por procesarPago — exactamente la misma validación que el
// webhook — y la orden se confirma como si el aviso hubiera llegado.
//
// Solo mira pagos APROBADOS. Una devolución de una orden que nunca se
// confirmó no tiene nada que revertir.
// ============================================================
import { createServiceClient } from "@/lib/supabase/admin";
import { tokenDeLaTienda } from "@/lib/mercadopago/conexion";
import { procesarPago, type PagoMP } from "@/lib/mercadopago/procesar-pago";

// Un pago en efectivo (Rapipago, Pago Fácil) se puede hacer días después de
// generar el cupón, así que se mira una semana para atrás.
const VENTANA_DIAS = 7;
// Tope por corrida: las más nuevas primero. Una tienda chica no llega ni cerca.
const MAX_ORDENES = 50;
// Si se llama de nuevo antes de esto (Agustina refrescando el panel), se
// devuelve el resultado anterior en vez de volver a preguntarle todo a MP.
const INTERVALO_MINIMO_MS = 60 * 1000;
const TIMEOUT_MP_MS = 8000;

export type ResumenConciliacion = {
  /** false si no se pudo ni empezar (sin conexión a MP o a la base). */
  corrio: boolean;
  revisadas: number;
  /** Órdenes que estaban pendientes y resultaron pagadas. */
  confirmadas: number[];
  /** Pagadas en MP pero con un monto que no coincide: NO se confirmaron. */
  aRevisar: number[];
  errores: number;
  motivo?: string;
};

let enCurso: Promise<ResumenConciliacion> | null = null;
let ultima: { cuando: number; resumen: ResumenConciliacion } | null = null;

/**
 * Corre la conciliación. Si ya hay una en curso, espera esa; si hubo una hace
 * menos de un minuto, devuelve ese resultado. Nunca corren dos a la vez: dos
 * corridas simultáneas podrían procesar el mismo pago en paralelo (no haría
 * daño — mark_order_paid es idempotente — pero son llamadas de más a MP).
 */
export function conciliar(): Promise<ResumenConciliacion> {
  if (enCurso) return enCurso;
  if (ultima && Date.now() - ultima.cuando < INTERVALO_MINIMO_MS) {
    return Promise.resolve(ultima.resumen);
  }
  enCurso = correr()
    .then((resumen) => {
      ultima = { cuando: Date.now(), resumen };
      return resumen;
    })
    .finally(() => {
      enCurso = null;
    });
  return enCurso;
}

async function correr(): Promise<ResumenConciliacion> {
  const resumen: ResumenConciliacion = {
    corrio: false,
    revisadas: 0,
    confirmadas: [],
    aRevisar: [],
    errores: 0,
  };

  const token = (await tokenDeLaTienda().catch(() => null)) ?? process.env.MP_ACCESS_TOKEN;
  if (!token) {
    resumen.motivo = "mp-sin-conexion";
    return resumen;
  }

  const desde = new Date(Date.now() - VENTANA_DIAS * 24 * 60 * 60 * 1000).toISOString();
  const { data: pendientes, error } = await createServiceClient()
    .from("orders")
    .select("id")
    .eq("status", "pending")
    // Sin preferencia, la orden nunca llegó a MP: no hay pago que buscar.
    .not("mp_preference_id", "is", null)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(MAX_ORDENES)
    .returns<{ id: number }[]>();

  if (error || !pendientes) {
    resumen.motivo = "base-sin-conexion";
    return resumen;
  }

  resumen.corrio = true;
  const base = process.env.MP_API_BASE ?? "https://api.mercadopago.com";

  for (const { id } of pendientes) {
    resumen.revisadas++;
    try {
      const pagos = await buscarPagos(base, token, id);
      const aprobados = pagos.filter((p) => p.status === "approved");
      if (aprobados.length === 0) continue;

      if (aprobados.length > 1) {
        console.error(
          `[conciliar] ⚠️ REVISAR A MANO — la orden ${id} tiene ${aprobados.length} pagos ` +
            `aprobados en MP (${aprobados.map((p) => p.id).join(", ")}). Se confirma con el ` +
            `primero; el resto habría que devolverlo desde Mercado Pago.`
        );
      }

      const resultado = await procesarPago(aprobados[0]);
      if (resultado === "pagado") {
        resumen.confirmadas.push(id);
        console.warn(
          `[conciliar] La orden ${id} estaba pagada en MP y el webhook no había llegado. ` +
            `Confirmada ahora (pago ${aprobados[0].id}).`
        );
      } else if (resultado === "monto-inconsistente") {
        resumen.aRevisar.push(id);
      }
    } catch (err) {
      resumen.errores++;
      console.error(
        `[conciliar] No se pudo revisar la orden ${id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return resumen;
}

async function buscarPagos(base: string, token: string, orderId: number): Promise<PagoMP[]> {
  const url =
    `${base}/v1/payments/search?external_reference=${encodeURIComponent(String(orderId))}` +
    `&sort=date_created&criteria=asc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MP_MS),
  });
  if (!res.ok) throw new Error(`MP respondió ${res.status}`);
  const cuerpo = (await res.json()) as { results?: PagoMP[] };
  // Por las dudas: que el pago sea de ESTA orden, no de otra con referencia parecida.
  return (cuerpo.results ?? []).filter((p) => p.external_reference === String(orderId));
}
