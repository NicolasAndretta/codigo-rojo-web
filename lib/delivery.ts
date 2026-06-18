import type { DeliveryPoint } from "@/lib/types/database";

/** Etiqueta completa de cada punto de entrega (única fuente de verdad). */
export const DELIVERY_POINT_LABELS: Record<DeliveryPoint, string> = {
  haedo: "Retiro en Estación Haedo",
  ramos_mejia: "Retiro en Estación Ramos Mejía",
  domicilio: "Envío a domicilio",
};

/** Aclaración corta que acompaña cada opción en el checkout. */
export const DELIVERY_POINT_HINTS: Record<DeliveryPoint, string> = {
  haedo: "Coordinás día y hora por WhatsApp",
  ramos_mejia: "Coordinás día y hora por WhatsApp",
  domicilio: "CABA y zona oeste · costo a coordinar",
};

export type DeliveryPointOption = {
  value: DeliveryPoint;
  label: string;
  hint: string;
};

/** Opciones en orden de presentación para el selector del checkout. */
export const DELIVERY_POINT_OPTIONS: DeliveryPointOption[] = (
  ["haedo", "ramos_mejia", "domicilio"] as DeliveryPoint[]
).map((value) => ({
  value,
  label: DELIVERY_POINT_LABELS[value],
  hint: DELIVERY_POINT_HINTS[value],
}));
