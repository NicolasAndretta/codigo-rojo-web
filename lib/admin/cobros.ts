"use server";

import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/admin/sesion";
import { desconectar } from "@/lib/mercadopago/conexion";
import { createServiceClient } from "@/lib/supabase/admin";
import { cancelarReserva, confirmarPagoManual } from "@/lib/pagos/manual";

// Aparte de lib/admin/actions.ts porque estas actions usan el cliente de
// servicio (mp_conexion, tienda_config y las funciones de pago no las puede
// tocar nadie más), así que el permiso se chequea acá: la base no lo va a frenar.

async function soloAdmin() {
  if (!(await esAdmin())) throw new Error("No tenés permiso para hacer esto");
}

export async function desconectarMercadoPago() {
  await soloAdmin();
  await desconectar();
  revalidatePath("/admin/cobros");
  revalidatePath("/admin");
}

// ---------- Transferencia y efectivo (migración 012) ----------

function numero(formData: FormData, campo: string): number {
  const crudo = String(formData.get(campo) ?? "").trim().replace(",", ".");
  return crudo === "" ? NaN : Number(crudo);
}

export async function guardarConfigPagos(formData: FormData) {
  await soloAdmin();

  const transferencia = formData.get("transferencia_activa") === "on";
  const efectivo = formData.get("efectivo_activo") === "on";
  const descuento = numero(formData, "descuento_transferencia");
  const alias = String(formData.get("alias") ?? "").trim();
  const titular = String(formData.get("titular") ?? "").trim();
  const senaPct = numero(formData, "sena_porcentaje");
  const horas = numero(formData, "horas_para_pagar");

  // Los mensajes los lee Agustina: en criollo y diciendo qué corregir.
  if (!Number.isFinite(descuento) || descuento < 0 || descuento >= 100) {
    throw new Error("El descuento tiene que ser un número entre 0 y 99");
  }
  if (!Number.isInteger(senaPct) || senaPct < 1 || senaPct > 100) {
    throw new Error("La seña tiene que ser un porcentaje entre 1 y 100");
  }
  if (!Number.isInteger(horas) || horas < 1 || horas > 720) {
    throw new Error("El plazo para pagar tiene que ser entre 1 y 720 horas");
  }
  if ((transferencia || efectivo) && !alias) {
    throw new Error("Para activar la transferencia, cargá tu alias");
  }
  if (alias.length > 60 || titular.length > 80) {
    throw new Error("El alias o el nombre son demasiado largos");
  }

  const { error } = await createServiceClient()
    .from("tienda_config")
    .upsert({
      id: 1,
      transferencia_activa: transferencia,
      efectivo_activo: efectivo,
      descuento_transferencia: descuento,
      alias: alias || null,
      titular: titular || null,
      sena_porcentaje: senaPct,
      horas_para_pagar: horas,
      actualizada_el: new Date().toISOString(),
    });
  if (error) {
    console.error("[cobros] No se pudo guardar tienda_config:", error.message);
    throw new Error("No se pudo guardar. Probá de nuevo.");
  }

  revalidatePath("/admin/cobros");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[id]", "page");
  revalidatePath("/checkout");
}

export async function confirmarTransferencia(orderId: number) {
  await soloAdmin();
  const ok = await confirmarPagoManual(orderId);
  if (!ok) throw new Error("Este pedido ya no está esperando pago (¿ya lo confirmaste o se canceló?)");
  revalidatePath(`/admin/ordenes/${orderId}`);
  revalidatePath("/admin/ordenes");
}

// ---------- Botón de arrepentimiento (migración 013) ----------

export async function marcarArrepentimientoResuelto(id: number) {
  await soloAdmin();
  const { error } = await createServiceClient()
    .from("arrepentimientos")
    .update({ estado: "resuelto", resuelto_el: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[arrepentimiento] No se pudo marcar resuelto:", error.message);
    throw new Error("No se pudo guardar. Probá de nuevo.");
  }
  revalidatePath("/admin/arrepentimientos");
}

export async function cancelarPedidoReservado(orderId: number) {
  await soloAdmin();
  const ok = await cancelarReserva(orderId);
  if (!ok) throw new Error("Este pedido ya no está pendiente: no se canceló");
  revalidatePath(`/admin/ordenes/${orderId}`);
  revalidatePath("/admin/ordenes");
  revalidatePath("/catalogo");
}
