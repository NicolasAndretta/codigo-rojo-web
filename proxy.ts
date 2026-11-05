import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { SITE_URL } from "@/lib/site";

// La tienda vive en un solo dominio: el de NEXT_PUBLIC_SITE_URL. Quien entra
// por "www." se manda ahí. No es solo prolijidad: la sesión y la conexión con
// Mercado Pago guardan cookies por dominio, y la vuelta de MP llega siempre al
// de SITE_URL. Empezar en www y volver sin www rompía "Conectar Mercado Pago".
function redireccionAlDominio(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host.startsWith("www.")) return null;
  let destino: URL;
  try {
    destino = new URL(SITE_URL);
  } catch {
    return null;
  }
  if (destino.hostname.toLowerCase() !== host.slice(4)) return null;
  const { pathname, search } = request.nextUrl;
  // 308: permanente y conserva el método (un POST sigue siendo POST).
  return NextResponse.redirect(`${destino.origin}${pathname}${search}`, 308);
}

export async function proxy(request: NextRequest) {
  const alDominio = redireccionAlDominio(request);
  if (alDominio) return alDominio;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    return await updateSession(request);
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos los archivos estáticos que arma Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
