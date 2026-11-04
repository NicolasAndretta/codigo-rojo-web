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

function entradasXFF(req: Request): string[] {
  return (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cuántas entradas agrega el proxy de Hostinger al final de x-forwarded-for. */
function saltosDelProxy(): number {
  const n = Number(process.env.IP_SALTOS_PROXY ?? "");
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * La IP del que pide. Detrás del proxy de Hostinger llega en x-forwarded-for.
 *
 * ⚠️ El PRIMER valor lo puede inventar el cliente: si manda su propio
 * x-forwarded-for, el proxy agrega la IP real al final y deja lo inventado
 * adelante (verificado en producción el 04/11/2026). Con eso, un robot podía
 * cambiar de "IP" en cada pedido y saltearse el tope.
 *
 * Lo correcto es contar desde la DERECHA las entradas que agrega el proxy
 * (IP_SALTOS_PROXY): esas no las controla el cliente. Mientras no esté
 * cargada se usa la primera, como antes: tomar una equivocada desde la derecha
 * podía meter a todos los clientes en el mismo cupo, que es peor. El número
 * sale de /api/conciliar?clave=…&diag=ip.
 */
export function ipDe(req: Request): string {
  const lista = entradasXFF(req);
  if (lista.length) {
    const saltos = saltosDelProxy();
    return saltos ? lista[Math.max(0, lista.length - saltos)] : lista[0];
  }
  return req.headers.get("x-real-ip") ?? "desconocida";
}

function enmascarar(ip: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(".")) return ip.split(".").slice(0, 2).join(".") + ".x.x";
  return ip.split(":").slice(0, 2).join(":") + ":…";
}

function esPrivada(ip: string): boolean {
  return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i.test(ip);
}

/**
 * Para configurar IP_SALTOS_PROXY: cómo llega el header, con las IP a medias
 * (no hace falta verlas enteras). Abriéndolo desde un navegador, que no manda
 * x-forwarded-for propio, `cantidad` es justo lo que agrega el proxy.
 */
export function diagnosticoIP(req: Request) {
  const lista = entradasXFF(req);
  return {
    cantidad: lista.length,
    entradas: lista.map((ip) => ({ ip: enmascarar(ip), privada: esPrivada(ip) })),
    x_real_ip: enmascarar(req.headers.get("x-real-ip")),
    saltos_configurados: saltosDelProxy(),
    ip_que_usa_el_limite: enmascarar(ipDe(req)),
  };
}

export const DEMASIADOS_INTENTOS = "Demasiados intentos seguidos. Probá de nuevo en unos minutos.";
