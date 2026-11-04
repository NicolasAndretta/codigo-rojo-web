// ============================================================
// Tope de intentos por dirección IP, en memoria.
//
// POR QUÉ EXISTE: la validación de cupones es pública y no tenía límite, así
// que se podían probar miles de códigos hasta dar con uno (hay un cupón de 20%
// activo). Y crear órdenes tampoco tenía límite: cualquiera podía llenar el
// panel de Agustina de pedidos falsos.
//
// En memoria alcanza: la tienda corre en un solo proceso (`next start` en
// Hostinger). Si algún día corre en varios, cada uno lleva su cuenta y el
// límite real se multiplica, pero sigue frenando a un robot.
// ============================================================

const intentos = new Map<string, number[]>();
let llamadas = 0;

/**
 * true si todavía puede; false si ya hizo `max` intentos en los últimos
 * `ventanaMs`. Cada llamada que devuelve true cuenta como un intento.
 */
export function permitir(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const desde = ahora - ventanaMs;
  const previos = (intentos.get(clave) ?? []).filter((t) => t > desde);

  // Cada tanto se limpian las IP que ya no aparecen, para que el mapa no crezca solo.
  if (++llamadas % 500 === 0) {
    for (const [k, v] of intentos) {
      if (v.every((t) => t <= desde)) intentos.delete(k);
    }
  }

  if (previos.length >= max) {
    intentos.set(clave, previos);
    return false;
  }
  previos.push(ahora);
  intentos.set(clave, previos);
  return true;
}

/** La IP del que pide. Detrás del proxy de Hostinger llega en x-forwarded-for. */
export function ipDe(req: Request): string {
  const reenviada = req.headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconocida";
}

export const DEMASIADOS_INTENTOS = "Demasiados intentos seguidos. Probá de nuevo en unos minutos.";
