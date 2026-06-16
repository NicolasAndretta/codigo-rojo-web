import type { OrderStatus } from "@/lib/types/database";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente de pago",
  paid: "Pagada",
  preparing: "En preparación",
  shipped: "Enviada",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

// Clases Tailwind para el badge de cada estado
export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "border-amber-800 bg-amber-950/40 text-amber-300",
  paid: "border-green-800 bg-green-950/40 text-green-300",
  preparing: "border-blue-800 bg-blue-950/40 text-blue-300",
  shipped: "border-indigo-800 bg-indigo-950/40 text-indigo-300",
  delivered: "border-neutral-700 bg-neutral-800 text-neutral-300",
  cancelled: "border-red-900 bg-red-950/40 text-red-400",
};

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];
