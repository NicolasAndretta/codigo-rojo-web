export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * "viernes 6/11 a las 14:20", en hora de Argentina (el servidor puede estar en
 * otro huso). Para plazos: hasta cuándo hay para transferir.
 */
export function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  const tz = "America/Argentina/Buenos_Aires";
  const dia = d.toLocaleDateString("es-AR", { timeZone: tz, weekday: "long" });
  const fecha = d.toLocaleDateString("es-AR", { timeZone: tz, day: "numeric", month: "numeric" });
  const hora = d.toLocaleTimeString("es-AR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${dia} ${fecha} a las ${hora}`;
}
