import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { DEMASIADOS_INTENTOS, ipDe, permitir } from "@/lib/limite";
import { avisarArrepentimiento } from "@/lib/resend/arrepentimiento";

// ============================================================
// Botón de arrepentimiento (Resolución 424/2020) — migración 013.
//
// El comprador pide revocar su compra sin registrarse. Se guarda el pedido y
// se le devuelve en el momento el código de trámite (la norma pide darlo
// dentro de las 24 horas: así no depende de que alguien lo mande a mano).
// ============================================================

// Sin letras que se confundan (0/O, 1/I/L): el código se dicta por WhatsApp.
const LETRAS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function nuevoCodigo(): string {
  const bytes = crypto.randomBytes(6);
  return "CR-" + Array.from(bytes, (b) => LETRAS[b % LETRAS.length]).join("");
}

function texto(v: unknown, max: number): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  // 3 cada 10 minutos por IP: alcanza para quien se equivoca y frena al que
  // quiere llenar la lista de Agustina de pedidos falsos.
  if (!permitir(`arrepentimiento:${ipDe(req)}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json({ error: DEMASIADOS_INTENTOS }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const nombre = texto(body?.nombre, 120);
  const telefono = texto(body?.telefono, 40);
  if (!nombre || !telefono) {
    return NextResponse.json(
      { error: "Necesitamos tu nombre y un teléfono para contactarte" },
      { status: 400 }
    );
  }
  const fila = {
    nombre,
    telefono,
    email: texto(body?.email, 160),
    numero_pedido: texto(body?.numero_pedido, 40),
    motivo: texto(body?.motivo, 1000),
  };

  const supabase = createServiceClient();
  // Un código repetido es casi imposible (31^6), pero si pasa, se prueba otro.
  for (let intento = 0; intento < 3; intento++) {
    const codigo = nuevoCodigo();
    const { error } = await supabase.from("arrepentimientos").insert({ codigo, ...fila });
    if (!error) {
      await avisarArrepentimiento({ codigo, ...fila });
      return NextResponse.json({ codigo });
    }
    if (error.code !== "23505") {
      console.error("[arrepentimiento] No se pudo guardar:", error.message);
      break;
    }
  }

  return NextResponse.json(
    { error: "No pudimos registrar el pedido. Escribinos por WhatsApp y lo hacemos por ahí." },
    { status: 503 }
  );
}
