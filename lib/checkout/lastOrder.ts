import type { DeliveryPoint } from "@/lib/types/database";

// Snapshot mínimo del pedido recién creado. Se guarda en localStorage al
// confirmar el checkout para poder armar el mensaje de WhatsApp en la
// pantalla de éxito (las órdenes de invitado no son legibles vía RLS, así
// que NO dependemos de leerlas desde el servidor). Sobrevive el redirect
// a MercadoPago porque vive en el mismo origen.

const KEY = "cr_last_order";

export type LastOrderItem = {
  name: string;
  size: string;
  quantity: number;
};

export type LastOrder = {
  orderId: number;
  customerName: string;
  deliveryPoint: DeliveryPoint;
  deliveryAddress: string | null;
  total: number;
  items: LastOrderItem[];
};

export function saveLastOrder(order: LastOrder): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // sin localStorage (modo privado, etc.): el éxito muestra un fallback
  }
}

export function loadLastOrder(orderId?: number): LastOrder | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastOrder;
    // Si la URL trae un order id, exigimos que coincida (evita mostrar un
    // pedido viejo si el usuario vuelve a /success con otro id).
    if (orderId != null && parsed.orderId !== orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastOrder(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
