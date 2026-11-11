// Consultas del panel sobre productos. — SERVIDOR (no son actions).
import { createClient } from "@/lib/supabase/server";

/** Cuántos pedidos incluyen esta prenda. null si no se pudo saber. */
export async function pedidosDeProducto(id: number): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (error) {
    console.error(`[admin] No se pudieron contar los pedidos del producto ${id} — ${error.message}`);
    return null;
  }
  return count ?? 0;
}
