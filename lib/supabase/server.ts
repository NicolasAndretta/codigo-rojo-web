import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies se setean en proxy.ts
          }
        },
      },
    }
  );
}

// Acá vivía `createAdminClient`, borrada el 29/09/2026. No la usaba nadie (0
// referencias en todo el repo) y era una trampa: creaba un cliente con la
// SERVICE ROLE key enganchado a las cookies de sesión del visitante. Cualquiera
// que la importara por error desde un Server Component —creyendo que era "el
// cliente de admin"— le daba permisos de service_role a una petición del
// navegador.
//
// Para escrituras de sistema (webhook de pagos, creación de órdenes) está
// `createServiceClient()` en `lib/supabase/admin.ts`, que no toca cookies.
