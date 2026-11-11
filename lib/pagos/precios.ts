// ============================================================
// Precio pagando por transferencia o en efectivo (migración 012).
//
// Lógica pura: la usan el catálogo, la ficha, el checkout y /api/orders, para
// que lo que se muestra y lo que se cobra salgan de la misma cuenta. El
// servidor siempre recalcula: el navegador nunca decide cuánto se cobra.
//
// Cómo sale el precio de una prenda:
//   1. Si Agustina le cargó un precio por transferencia a mano, ese.
//   2. Si no, el precio de Mercado Pago (ya con los descuentos de producto o
//      categoría) menos el % de la tienda.
//   3. Redondeado PARA ABAJO a $100: queda un precio prolijo ($21.000 y no
//      $21.015) y el cliente siempre ahorra al menos el % anunciado.
//   4. Nunca más caro que con Mercado Pago (por si un descuento de producto
//      deja el precio de MP por debajo del cargado a mano).
// ============================================================
import type { MedioPago, TiendaConfig } from "@/lib/types/database";

/** Lo que la parte pública necesita saber de la configuración de cobros. */
export type ConfigPagos = {
  transferenciaActiva: boolean;
  efectivoActivo: boolean;
  /** % de descuento (0 a 99). */
  descuento: number;
  alias: string | null;
  titular: string | null;
  senaPorcentaje: number;
  horasParaPagar: number;
};

export const CONFIG_APAGADA: ConfigPagos = {
  transferenciaActiva: false,
  efectivoActivo: false,
  descuento: 0,
  alias: null,
  titular: null,
  senaPorcentaje: 50,
  horasParaPagar: 48,
};

export function configDesdeFila(f: TiendaConfig | null): ConfigPagos {
  if (!f) return CONFIG_APAGADA;
  // Sin alias no se le puede decir a nadie adónde transferir: aunque esté
  // "activa", la opción no se ofrece.
  const conAlias = Boolean(f.alias?.trim());
  return {
    transferenciaActiva: f.transferencia_activa && conAlias,
    efectivoActivo: f.efectivo_activo && conAlias,
    descuento: Number(f.descuento_transferencia) || 0,
    alias: f.alias?.trim() || null,
    titular: f.titular?.trim() || null,
    senaPorcentaje: f.sena_porcentaje,
    horasParaPagar: f.horas_para_pagar,
  };
}

/** ¿Se ofrece pagar sin Mercado Pago? (transferencia o efectivo). */
export function hayPagoSinMP(c: ConfigPagos): boolean {
  return c.transferenciaActiva || c.efectivoActivo;
}

/**
 * Precio unitario pagando por transferencia o efectivo.
 * @param precioMP precio con Mercado Pago (ya con descuentos de producto/categoría)
 * @param precioAMano products.precio_transferencia (null si no se cargó)
 */
export function precioTransferencia(
  precioMP: number,
  precioAMano: number | null | undefined,
  c: ConfigPagos
): number {
  const base =
    precioAMano != null && Number(precioAMano) > 0
      ? Number(precioAMano)
      : precioMP * (1 - c.descuento / 100);
  const redondeado = Math.floor(base / 100) * 100;
  return Math.max(0, Math.min(precioMP, redondeado > 0 ? redondeado : Math.round(base)));
}

/** true si pagando por transferencia sale más barato que con MP. */
export function conviene(precioMP: number, precioAMano: number | null | undefined, c: ConfigPagos) {
  return hayPagoSinMP(c) && precioTransferencia(precioMP, precioAMano, c) < precioMP;
}

/** "con transferencia o efectivo", "con transferencia" o "en efectivo". */
function medios(c: ConfigPagos): string {
  return c.transferenciaActiva && c.efectivoActivo
    ? "con transferencia o efectivo"
    : c.efectivoActivo
      ? "en efectivo"
      : "con transferencia";
}

/** 10 → "10", 7.5 → "7,5". */
function porcentaje(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/**
 * Lo que muestra la tienda debajo del precio: el de transferencia y su
 * aclaración ("10% OFF con transferencia o efectivo"), o null si no conviene
 * (o no está habilitado).
 *
 * El % es el de Cobros. Si la prenda tiene un precio por transferencia cargado
 * a mano, se calcula el real y se redondea PARA ABAJO: nunca se anuncia más
 * descuento del que hay.
 */
export function etiquetaTransferencia(
  precioMP: number,
  precioAMano: number | null | undefined,
  c: ConfigPagos
): { precio: number; etiqueta: string } | null {
  if (!conviene(precioMP, precioAMano, c)) return null;
  const precio = precioTransferencia(precioMP, precioAMano, c);
  const aMano = precioAMano != null && Number(precioAMano) > 0;
  const pct = aMano ? Math.floor((1 - precio / precioMP) * 100) : c.descuento;
  const etiqueta = pct > 0 ? `${porcentaje(pct)}% OFF ${medios(c)}` : medios(c);
  return { precio, etiqueta };
}

/**
 * El mensaje del descuento para la franja de arriba de la tienda
 * ("10% OFF pagando con transferencia o efectivo"), o null si no hay.
 */
export function textoDescuento(c: ConfigPagos): string | null {
  if (!hayPagoSinMP(c) || c.descuento <= 0) return null;
  return `${porcentaje(c.descuento)}% OFF pagando ${medios(c)}`;
}

/** La seña del efectivo: lo que se transfiere ahora. El resto, al retirar. */
export function sena(total: number, c: ConfigPagos): number {
  return Math.round((total * c.senaPorcentaje) / 100);
}

export const MEDIO_PAGO_LABELS: Record<MedioPago, string> = {
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
  efectivo: "Efectivo (con seña)",
};
