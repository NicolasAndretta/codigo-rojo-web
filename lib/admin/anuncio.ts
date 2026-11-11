"use server";

import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/admin/sesion";
import { createServiceClient } from "@/lib/supabase/admin";
import { ANUNCIO_MAX_LARGO, ANUNCIO_MAX_MENSAJES } from "@/lib/tienda/anuncio";

// La franja de anuncios (migración 014). Usa el cliente de servicio, igual que
// Cobros (tienda_config solo la escribe el servidor), así que el permiso de
// admin se chequea acá: la base no lo va a frenar.

export type ResultadoAnuncio = { ok: true } | { ok: false; motivo: string };

/**
 * Devuelve el resultado en vez de lanzar: el mensaje de un error lanzado desde
 * una action no llega al navegador en producción, y estos los lee Agustina.
 */
export async function guardarAnuncio(formData: FormData): Promise<ResultadoAnuncio> {
  if (!(await esAdmin())) return { ok: false, motivo: "No tenés permiso para hacer esto" };

  const activo = formData.get("anuncio_activo") === "on";
  const descuento = formData.get("anuncio_descuento") === "on";
  const mensajes = String(formData.get("anuncio_mensajes") ?? "")
    .split(/\r?\n/)
    .map((m) => m.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  // Los mensajes los lee Agustina: en criollo y diciendo qué corregir.
  if (mensajes.length > ANUNCIO_MAX_MENSAJES) {
    return { ok: false, motivo: `Como mucho ${ANUNCIO_MAX_MENSAJES} mensajes (uno por renglón)` };
  }
  const largo = mensajes.find((m) => m.length > ANUNCIO_MAX_LARGO);
  if (largo) {
    return {
      ok: false,
      motivo: `Un mensaje es muy largo (máximo ${ANUNCIO_MAX_LARGO} letras): "${largo.slice(0, 30)}…"`,
    };
  }
  if (activo && !mensajes.length) {
    return { ok: false, motivo: "Para mostrar tus mensajes, escribí al menos uno" };
  }

  const { error } = await createServiceClient()
    .from("tienda_config")
    .update({
      anuncio_activo: activo,
      anuncio_mensajes: mensajes,
      anuncio_descuento: descuento,
      actualizada_el: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    console.error("[anuncio] No se pudo guardar:", error.message);
    return { ok: false, motivo: "No se pudo guardar. Probá de nuevo." };
  }

  // La franja está en el layout de toda la tienda.
  revalidatePath("/", "layout");
  revalidatePath("/admin/anuncio");
  return { ok: true };
}
