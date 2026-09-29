import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin/sesion";
import { mpConnectConfigurado, urlDeAutorizacion } from "@/lib/mercadopago/conexion";

export const dynamic = "force-dynamic";

// Arranca la conexión con Mercado Pago. Genera un `state` al azar, lo deja en
// una cookie y manda a Agustina a MP a autorizar con su cuenta. Cuando vuelve,
// el callback compara el `state`: si no coincide, el pedido no salió de acá
// (protección contra que otro sitio le conecte una cuenta ajena a la tienda).
//
// Los redirects internos van con Location relativo: detrás del proxy de
// Hostinger, `req.url` puede traer el host interno y no el público.
function irA(ruta: string) {
  return new NextResponse(null, { status: 303, headers: { Location: ruta } });
}

export async function GET() {
  if (!(await esAdmin())) return irA("/login?redirect=/admin/cobros");
  if (!mpConnectConfigurado()) return irA("/admin/cobros?error=config");

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(urlDeAutorizacion(state), 303);
  res.cookies.set("mp_connect_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/admin/cobros",
  });
  return res;
}
