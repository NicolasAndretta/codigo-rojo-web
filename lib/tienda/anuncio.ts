// La franja de anuncios de arriba de la tienda (migración 014).
import { configDesdeFila, textoDescuento, type ConfigPagos } from "@/lib/pagos/precios";
import type { TiendaConfig } from "@/lib/types/database";

/** Topes de lo que se puede escribir en el panel. */
export const ANUNCIO_MAX_MENSAJES = 5;
export const ANUNCIO_MAX_LARGO = 120;

/**
 * Lo que dice la franja: primero el descuento por transferencia (si está
 * activo y ella no lo apagó), después sus mensajes (si los prendió).
 * Lista vacía = no hay franja.
 *
 * Sin la 014 los campos del anuncio no vienen: queda solo el del descuento.
 */
export function mensajesAnuncio(fila: TiendaConfig | null, config?: ConfigPagos): string[] {
  const c = config ?? configDesdeFila(fila);
  const mensajes: string[] = [];

  const descuento = textoDescuento(c);
  if (descuento && (fila?.anuncio_descuento ?? true)) mensajes.push(descuento);

  if (fila?.anuncio_activo) {
    for (const m of fila.anuncio_mensajes ?? []) {
      const limpio = m.trim();
      if (limpio) mensajes.push(limpio.slice(0, ANUNCIO_MAX_LARGO));
    }
  }
  return mensajes.slice(0, ANUNCIO_MAX_MENSAJES + 1);
}
