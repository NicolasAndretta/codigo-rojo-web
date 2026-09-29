import { NextResponse, type NextRequest } from "next/server";
import { esAdmin } from "@/lib/admin/sesion";
import { canjearCodigo, guardarConexion } from "@/lib/mercadopago/conexion";

export const dynamic = "force-dynamic";

// Vuelta de Mercado Pago después de que Agustina autoriza. Valida el `state`,
// cambia el código por el token (servidor a servidor, el navegador nunca lo ve)
// y guarda la conexión. Esta URL es la que se registra en la aplicación de MP,
// y tiene que coincidir carácter por carácter.
function irA(ruta: string) {
  const res = new NextResponse(null, { status: 303, headers: { Location: ruta } });
  res.cookies.delete({ name: "mp_connect_state", path: "/admin/cobros" });
  return res;
}

export async function GET(req: NextRequest) {
  if (!(await esAdmin())) return irA("/login?redirect=/admin/cobros");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const guardado = req.cookies.get("mp_connect_state")?.value;

  // Sin código: canceló en Mercado Pago, o MP devolvió un error.
  if (!code) return irA("/admin/cobros?error=cancelado");
  if (!state || !guardado || state !== guardado) return irA("/admin/cobros?error=state");

  try {
    await guardarConexion(await canjearCodigo(code));
    return irA("/admin/cobros?mp=ok");
  } catch (err) {
    console.error("[mp-connect] No se pudo completar la conexión:", err instanceof Error ? err.message : err);
    return irA("/admin/cobros?error=token");
  }
}
