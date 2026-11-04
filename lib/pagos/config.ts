// Lee la configuración de cobros (tienda_config, migración 012). — SERVIDOR
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG_APAGADA, configDesdeFila, type ConfigPagos } from "@/lib/pagos/precios";
import type { Database, TiendaConfig } from "@/lib/types/database";

/**
 * Nunca lanza. Si la tabla todavía no existe (no se corrió la 012) o la base no
 * responde, devuelve todo apagado: la tienda sigue vendiendo con Mercado Pago
 * como siempre. Así el orden entre migrar y deployar no rompe nada.
 */
export async function leerConfigPagos(supabase: SupabaseClient<Database>): Promise<ConfigPagos> {
  try {
    const { data, error } = await supabase
      .from("tienda_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle<TiendaConfig>();
    if (error) {
      if (error.code !== "42P01" && error.code !== "PGRST205") {
        console.error("[pagos] No se pudo leer tienda_config:", error.message);
      }
      return CONFIG_APAGADA;
    }
    return configDesdeFila(data);
  } catch {
    return CONFIG_APAGADA;
  }
}
