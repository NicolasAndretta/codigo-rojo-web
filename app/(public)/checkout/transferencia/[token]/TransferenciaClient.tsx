"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, Copy, Check, MessageCircle, XCircle } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { formatFechaHora, formatPrice, formatWhatsAppUrl } from "@/lib/utils/format";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export type PedidoTransferencia = {
  id: number;
  estado: "esperando" | "pagado" | "cancelado";
  medio: "transferencia" | "efectivo";
  total: number;
  /** Lo que hay que transferir ahora (el total, o la seña). */
  monto: number;
  /** Lo que queda para pagar en efectivo al retirar. */
  resto: number;
  venceEl: string | null;
  alias: string | null;
  titular: string | null;
  nombre: string | null;
  items: { nombre: string; talle: string; cantidad: number; subtotal: number }[];
};


function BotonCopiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Sin permiso de portapapeles: el dato está a la vista para copiarlo a mano.
        }
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-neutral-500"
      aria-label={`Copiar ${etiqueta}`}
    >
      {copiado ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

export default function TransferenciaClient({ pedido }: { pedido: PedidoTransferencia }) {
  const { clearCart } = useCart();

  // El pedido ya está hecho: el carrito se vacía (el checkout también lo hace,
  // esto cubre que se llegue acá de otra forma).
  useEffect(() => {
    if (pedido.estado === "esperando") clearCart();
  }, [clearCart, pedido.estado]);

  const mensaje = [
    `¡Hola! Soy ${pedido.nombre ?? ""}. Hice el pedido #${pedido.id} 🛒`,
    pedido.medio === "efectivo"
      ? `Te mando el comprobante de la seña: ${formatPrice(pedido.monto)}.`
      : `Te mando el comprobante de la transferencia: ${formatPrice(pedido.monto)}.`,
  ].join("\n");
  const whatsappUrl = WHATSAPP_NUMBER ? formatWhatsAppUrl(WHATSAPP_NUMBER, mensaje) : null;

  if (pedido.estado === "pagado") {
    return (
      <Marco>
        <CheckCircle size={56} className="text-green-500" />
        <h1 className="font-display text-5xl tracking-widest">¡LISTO!</h1>
        <p className="text-neutral-400">
          Recibimos tu pago del pedido <span className="text-neutral-200">#{pedido.id}</span>.
          {pedido.resto > 0 && (
            <>
              {" "}Te queda pagar <strong className="text-neutral-100">{formatPrice(pedido.resto)}</strong> en
              efectivo cuando retirás.
            </>
          )}
        </p>
        <SeguirComprando />
      </Marco>
    );
  }

  if (pedido.estado === "cancelado") {
    return (
      <Marco>
        <XCircle size={56} className="text-neutral-500" />
        <h1 className="font-display text-4xl tracking-widest">PEDIDO CANCELADO</h1>
        <p className="text-neutral-400">
          El pedido #{pedido.id} se canceló porque no llegó la transferencia a tiempo, y las prendas
          volvieron a estar a la venta. Si ya transferiste, escribinos por WhatsApp y lo resolvemos.
        </p>
        {whatsappUrl && <BotonWhatsApp url={whatsappUrl} texto="Escribinos por WhatsApp" />}
        <SeguirComprando />
      </Marco>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 text-center">
        <Clock size={48} className="mx-auto text-red-500" />
        <h1 className="mt-4 font-display text-4xl tracking-widest sm:text-5xl">TU PEDIDO ESTÁ RESERVADO</h1>
        <p className="mt-3 text-sm text-neutral-400">
          Pedido <span className="text-neutral-200">#{pedido.id}</span>. Apartamos tus prendas: solo falta
          {pedido.medio === "efectivo" ? " la seña." : " la transferencia."}
        </p>
      </div>

      <section className="rounded-xl border border-red-600/60 bg-neutral-900 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          {pedido.medio === "efectivo" ? "Transferí la seña" : "Transferí"}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-display text-4xl tracking-wider text-red-500">{formatPrice(pedido.monto)}</span>
          <BotonCopiar texto={String(Math.round(pedido.monto))} etiqueta="el monto" />
        </div>
        {pedido.resto > 0 && (
          <p className="mt-2 text-sm text-neutral-400">
            El resto, <strong className="text-neutral-200">{formatPrice(pedido.resto)}</strong>, lo pagás en
            efectivo cuando retirás.
          </p>
        )}

        <div className="mt-5 border-t border-neutral-800 pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Al alias</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="min-w-0 break-all text-xl font-bold text-neutral-100">{pedido.alias ?? "—"}</span>
            {pedido.alias && <BotonCopiar texto={pedido.alias} etiqueta="el alias" />}
          </div>
          {pedido.titular && (
            <p className="mt-1 text-sm text-neutral-400">A nombre de {pedido.titular}</p>
          )}
        </div>

        {pedido.venceEl && (
          <p className="mt-5 rounded-lg bg-neutral-950/60 p-3 text-xs leading-relaxed text-neutral-400">
            Tenés tiempo hasta el{" "}
            <strong className="text-neutral-200">{formatFechaHora(pedido.venceEl)}</strong>: si no llega, el
            pedido se cancela solo y las prendas vuelven a estar a la venta.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
        <p className="text-sm text-neutral-300">
          Cuando transfieras, mandanos el comprobante por WhatsApp y te confirmamos el pedido.
        </p>
        {whatsappUrl && <BotonWhatsApp url={whatsappUrl} texto="Mandar el comprobante" />}
      </section>

      <section className="mt-6 rounded-xl border border-neutral-800 p-5 text-sm sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">Tu pedido</p>
        <div className="flex flex-col gap-2">
          {pedido.items.map((i, n) => (
            <div key={n} className="flex justify-between gap-3">
              <span className="min-w-0 text-neutral-400">
                {i.nombre} <span className="text-xs text-neutral-600">{i.talle} ×{i.cantidad}</span>
              </span>
              <span className="shrink-0 text-neutral-300">{formatPrice(i.subtotal)}</span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-neutral-800 pt-3 font-bold">
            <span>Total</span>
            <span className="text-red-500">{formatPrice(pedido.total)}</span>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-xs text-neutral-600">
        Guardá esta página: con este link podés volver a ver los datos para transferir.
      </p>
    </div>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-24 text-center">{children}</div>
  );
}

function BotonWhatsApp({ url, texto }: { url: string; texto: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-95 active:scale-[0.98]"
    >
      <MessageCircle size={18} />
      {texto}
    </a>
  );
}

function SeguirComprando() {
  return (
    <Link
      href="/catalogo"
      className="rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
    >
      Seguir comprando
    </Link>
  );
}
