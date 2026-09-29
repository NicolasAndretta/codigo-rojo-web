// ============================================================
// Mercado Pago Connect (OAuth): la tienda cobra en SU cuenta. — SOLO SERVIDOR
//
// Agustina entra a /admin/cobros, toca "Conectar Mercado Pago" y autoriza con
// su cuenta. La aplicación de MP es de Nico (una sola, sirve para cualquier
// cliente); la plata cae en la cuenta de ella. Nico nunca ve su token.
//
// Portado de Roble (finos-barbers/src/lib/mp-oauth.ts). Allá nunca se llegó a
// conectar una cuenta real, así que acá hay tres cambios:
//
//   1. Se guarda CON QUIÉN se conectó (nickname y mail) y el panel lo muestra.
//      El 29/09/2026 se confundió la integración de la cuenta de Nico con la de
//      Agustina: con esto se ve a simple vista en qué cuenta cae la plata.
//   2. El token se renueva cuando le quedan menos de 30 días, no 5 minutos. Dura
//      180 días y solo se renueva cuando se usa: con 5 minutos de margen, una
//      tienda que pasa un tiempo sin ventas se quedaba sin poder cobrar.
//   3. La redirect URI sale de NEXT_PUBLIC_SITE_URL, la misma base que el
//      notification_url del webhook. Si cambia el dominio, cambian juntas, y hay
//      que registrar la nueva en la aplicación de MP.
//
// Variables de entorno (servidor): MP_CLIENT_ID y MP_CLIENT_SECRET, de la
// aplicación de MP de Nico. NUNCA importar este archivo desde un componente
// de cliente: maneja el token de la tienda.
// ============================================================
import { createServiceClient } from "@/lib/supabase/admin";

const AUTORIZAR = "https://auth.mercadopago.com.ar/authorization";
const TOKEN = "https://api.mercadopago.com/oauth/token";
const CUENTA = "https://api.mercadopago.com/users/me";

const DIA = 24 * 60 * 60 * 1000;
const RENOVAR_ANTES = 30 * DIA;
/** Desde cuántos días antes del vencimiento el panel avisa. */
export const AVISAR_ANTES_DIAS = 15;

type RespuestaToken = {
  access_token: string;
  refresh_token?: string;
  user_id?: number | string;
  expires_in?: number;
};

export type EstadoConexion =
  | { conectada: false }
  | {
      conectada: true;
      nickname: string | null;
      email: string | null;
      conectadaEl: string;
      venceEl: string | null;
      diasRestantes: number | null;
    };

export function mpConnectConfigurado(): boolean {
  return Boolean(
    process.env.MP_CLIENT_ID &&
      process.env.MP_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_SITE_URL
  );
}

function redirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  return `${base}/admin/cobros/callback`;
}

/** A dónde se manda a Agustina para que autorice. */
export function urlDeAutorizacion(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: redirectUri(),
  });
  return `${AUTORIZAR}?${params.toString()}`;
}

async function pedirToken(datos: Record<string, string>): Promise<RespuestaToken> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      ...datos,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // La respuesta de error de MP dice qué falló (código vencido, redirect URI
    // que no coincide…) y no trae secretos: va al log, recortada.
    const detalle = (await res.text()).slice(0, 300);
    throw new Error(`Mercado Pago rechazó el pedido de token (${res.status}): ${detalle}`);
  }
  return res.json();
}

/** Cambia el código que devuelve MP por el token de la tienda (servidor a servidor). */
export function canjearCodigo(code: string): Promise<RespuestaToken> {
  return pedirToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
}

function renovar(refreshToken: string): Promise<RespuestaToken> {
  return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function leerCuenta(accessToken: string) {
  const res = await fetch(CUENTA, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo leer la cuenta de Mercado Pago (${res.status})`);
  const u = (await res.json()) as { id: number | string; nickname?: string; email?: string };
  return { id: String(u.id), nickname: u.nickname ?? null, email: u.email ?? null };
}

function venceEl(t: RespuestaToken): string | null {
  return t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
}

/** Guarda la conexión recién autorizada. Reemplaza la anterior, si había. */
export async function guardarConexion(t: RespuestaToken): Promise<void> {
  const cuenta = await leerCuenta(t.access_token);
  const ahora = new Date().toISOString();
  const { error } = await createServiceClient()
    .from("mp_conexion")
    .upsert({
      id: 1,
      mp_user_id: cuenta.id,
      mp_nickname: cuenta.nickname,
      mp_email: cuenta.email,
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expires_at: venceEl(t),
      conectada_el: ahora,
      actualizada_el: ahora,
    });
  if (error) throw new Error(`No se pudo guardar la conexión: ${error.message}`);
}

async function leerConexion() {
  const { data, error } = await createServiceClient()
    .from("mp_conexion")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    // Si todavía no se corrió la migración 010, la tabla no existe: eso es
    // "no conectada", no una caída. Así el orden entre migrar y deployar no
    // rompe el checkout.
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(`No se pudo leer la conexión de Mercado Pago: ${error.message}`);
  }
  return data;
}

/** Para el panel. Nunca devuelve el token. */
export async function estadoConexion(): Promise<EstadoConexion> {
  const c = await leerConexion();
  if (!c) return { conectada: false };
  const dias = c.expires_at
    ? Math.floor((new Date(c.expires_at).getTime() - Date.now()) / DIA)
    : null;
  return {
    conectada: true,
    nickname: c.mp_nickname,
    email: c.mp_email,
    conectadaEl: c.conectada_el,
    venceEl: c.expires_at,
    diasRestantes: dias,
  };
}

/**
 * Token para cobrar en nombre de la tienda, o null si no conectó su cuenta.
 * Si le quedan menos de 30 días, primero lo renueva.
 */
export async function tokenDeLaTienda(): Promise<string | null> {
  const c = await leerConexion();
  if (!c) return null;

  const vence = c.expires_at ? new Date(c.expires_at).getTime() : Infinity;
  if (vence - Date.now() > RENOVAR_ANTES || !c.refresh_token) return c.access_token;

  try {
    const nuevo = await renovar(c.refresh_token);
    const { error } = await createServiceClient()
      .from("mp_conexion")
      .update({
        access_token: nuevo.access_token,
        refresh_token: nuevo.refresh_token ?? c.refresh_token,
        expires_at: venceEl(nuevo),
        actualizada_el: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) console.error(`[mp-connect] Se renovó el token pero no se pudo guardar: ${error.message}`);
    return nuevo.access_token;
  } catch (err) {
    // Si todavía no venció, se sigue cobrando con el actual y se reintenta en
    // el próximo uso. Si ya venció, no hay con qué cobrar: el checkout muestra
    // el aviso y el panel pide reconectar.
    console.error("[mp-connect] No se pudo renovar el token:", err instanceof Error ? err.message : err);
    return vence > Date.now() ? c.access_token : null;
  }
}

export async function desconectar(): Promise<void> {
  const { error } = await createServiceClient().from("mp_conexion").delete().eq("id", 1);
  if (error) throw new Error(`No se pudo desconectar: ${error.message}`);
}
