import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { leerConfigPagos } from "@/lib/pagos/config";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | Código Rojo",
};

// La configuración de cobros (transferencia, %, seña) la cambia Agustina desde
// el panel: se lee en cada visita, no en el build.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const config = await leerConfigPagos(await createClient());
  return <CheckoutClient config={config} />;
}
