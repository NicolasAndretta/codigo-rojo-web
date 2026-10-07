/**
 * URL pública del sitio, sin barra final. Sale de NEXT_PUBLIC_SITE_URL, la misma
 * variable que arma el notification_url del webhook (ver la guarda en
 * app/api/orders/route.ts). Cuando cambie el dominio, cambia en un solo lugar:
 * el hPanel, y después un redeploy.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "Código Rojo";
