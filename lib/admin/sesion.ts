import { createClient } from "@/lib/supabase/server";

/**
 * true si hay sesión y el perfil es admin. Es el mismo criterio que usan el
 * proxy y el layout de /admin.
 *
 * Hace falta repetirlo en las rutas y actions que usan el cliente de servicio
 * (como las de cobros): ese cliente saltea RLS, así que la base no frena a
 * nadie y el chequeo tiene que estar en el código.
 */
export async function esAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  return profile?.role === "admin";
}
