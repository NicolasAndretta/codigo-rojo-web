import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

// ============================================================
// Chequeo de salud + anti-pausa de Supabase.
//
// POR QUÉ EXISTE: el plan gratis de Supabase pausa un proyecto tras 7 días sin
// actividad. Ya pasó una vez con el proyecto de 369: se pausó solo, el panel
// dejó de andar, y nos enteramos de casualidad semanas después. Una tienda que
// recién arranca puede perfectamente pasar 7 días sin una sola visita.
//
// Este endpoint hace una consulta mínima a la base. Apuntándole UptimeRobot
// cada 5 minutos pasan dos cosas:
//   1. La base nunca queda 7 días quieta → no se vuelve a pausar.
//   2. Si la base se cae, devuelve 503 y UptimeRobot avisa en minutos, en vez
//      de que se descubra cuando un cliente no puede comprar.
//
// La consulta es un count con `head: true`: no baja ninguna fila, solo
// pregunta. Es lo más barato que se puede pedir.
// ============================================================

// Nunca cachear: si se sirviera de caché no tocaría la base y no serviría para
// ninguna de las dos cosas.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, db: "ok" });
  } catch {
    // Sin detalle del error a propósito: este endpoint es público y no tiene
    // por qué contarle a nadie cómo está armada la base ni por qué falló.
    return NextResponse.json({ ok: false, db: "sin-conexion" }, { status: 503 });
  }
}
