import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Qué puede recorrer Google. Ojo: mientras la tienda esté en la URL provisoria
// de Hostinger, Hostinger pisa este archivo con uno propio que bloquea todo.
// Empieza a valer el día que se conecta el dominio.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel, la API y el paso a paso de la compra no tienen nada que indexar.
      disallow: ["/admin", "/api/", "/checkout", "/carrito", "/login", "/auth/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
