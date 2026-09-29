"use server";

import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/admin/sesion";
import { desconectar } from "@/lib/mercadopago/conexion";

// Aparte de lib/admin/actions.ts porque esta action usa el cliente de servicio
// (la tabla mp_conexion no la puede tocar nadie más), así que el permiso se
// chequea acá: la base no lo va a frenar.
export async function desconectarMercadoPago() {
  if (!(await esAdmin())) throw new Error("No tenés permiso para hacer esto");
  await desconectar();
  revalidatePath("/admin/cobros");
  revalidatePath("/admin");
}
