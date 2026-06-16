"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";

export default function SuccessClient() {
  const { clearCart } = useCart();

  // Pago aprobado → vaciar carrito (el redirect viene de MercadoPago)
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-32 text-center">
      <CheckCircle size={56} className="text-green-500" />
      <div>
        <h1 className="font-display text-5xl tracking-widest">¡GRACIAS!</h1>
        <p className="mt-3 text-neutral-400">
          Tu pago fue aprobado y tu pedido está confirmado. Te enviamos un email
          con el detalle y te vamos a contactar por WhatsApp para coordinar la
          entrega.
        </p>
      </div>
      <Link
        href="/catalogo"
        className="rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold tracking-wider uppercase text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
