import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { SITE_URL } from "@/lib/site";

// Se arma en cada pedido y no al compilar: así no depende de que la base
// responda durante el build en Hostinger, y siempre tiene los productos del día.
export const dynamic = "force-dynamic";

// El mapa de páginas para Google: el catálogo, cada categoría y cada producto
// activo. Usa la clave pública, así que RLS ya deja afuera los ocultos.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginas: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/catalogo`, changeFrequency: "daily", priority: 1 },
  ];

  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const [{ data: categorias }, { data: productos }] = await Promise.all([
      supabase.from("categories").select("slug"),
      supabase.from("products").select("id, updated_at").eq("is_active", true),
    ]);

    for (const c of categorias ?? []) {
      paginas.push({ url: `${SITE_URL}/catalogo?category=${c.slug}`, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const p of productos ?? []) {
      paginas.push({ url: `${SITE_URL}/producto/${p.id}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.8 });
    }
  } catch (err) {
    // Si la base no responde, mejor un sitemap corto que un error: Google vuelve a pasar.
    console.error("[sitemap]", err instanceof Error ? err.message : err);
  }

  return paginas;
}
