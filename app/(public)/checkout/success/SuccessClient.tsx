"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice, formatWhatsAppUrl } from "@/lib/utils/format";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import { loadLastOrder, clearLastOrder, type LastOrder } from "@/lib/checkout/lastOrder";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function buildWhatsAppMessage(order: LastOrder): string {
  const lines = [
    `¡Hola! Soy ${order.customerName}. Acabo de hacer el pedido #${order.orderId} 🛒`,
    "",
    "*Mi pedido:*",
    ...order.items.map((i) => `• ${i.name} — Talle ${i.size} ×${i.quantity}`),
    "",
    `*Entrega:* ${DELIVERY_POINT_LABELS[order.deliveryPoint]}`,
    ...(order.deliveryAddress ? [`*Dirección:* ${order.deliveryAddress}`] : []),
    `*Total:* ${formatPrice(order.total)}`,
    "",
    "Quería coordinar día y horario. ¡Gracias!",
  ];
  return lines.join("\n");
}

export default function SuccessClient({ orderId }: { orderId?: number }) {
  const { clearCart } = useCart();
  const [order, setOrder] = useState<LastOrder | null>(null);

  // Pago aprobado → vaciar carrito y recuperar el snapshot para el WhatsApp.
  useEffect(() => {
    setOrder(loadLastOrder(orderId));
    clearCart();
  }, [clearCart, orderId]);

  const whatsappUrl = order
    ? formatWhatsAppUrl(WHATSAPP_NUMBER, buildWhatsAppMessage(order))
    : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-24 text-center">
      <CheckCircle size={56} className="text-green-500" />
      <div>
        <h1 className="font-display text-5xl tracking-widest">¡GRACIAS!</h1>
        <p className="mt-3 text-neutral-400">
          Tu pago fue aprobado y tu pedido
          {order ? <span className="text-neutral-200"> #{order.orderId}</span> : ""} está
          confirmado.
        </p>
      </div>

      {whatsappUrl ? (
        <div className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-300">
            Último paso: escribinos por WhatsApp para coordinar día y horario de la
            entrega. Ya te dejamos el mensaje armado con el detalle de tu pedido.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-95 active:scale-[0.98]"
          >
            <MessageCircle size={18} />
            Coordinar por WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Te vamos a contactar por WhatsApp para coordinar la entrega.
        </p>
      )}

      <Link
        href="/catalogo"
        onClick={() => clearLastOrder()}
        className="rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
