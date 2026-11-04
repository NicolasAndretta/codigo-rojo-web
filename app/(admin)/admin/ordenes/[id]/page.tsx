import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/lib/admin/actions";
import { formatFechaHora, formatPrice } from "@/lib/utils/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ALL_ORDER_STATUSES,
} from "@/lib/utils/orderStatus";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import type { Order } from "@/lib/types/database";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import { cancelarPedidoReservado, confirmarTransferencia } from "@/lib/admin/cobros";

export const metadata = { title: "Orden | Admin" };


/** El bloque de un pedido por transferencia o efectivo: cuánto, hasta cuándo, y los botones. */
function PagoManual({ order }: { order: Order }) {
  const efectivo = order.medio_pago === "efectivo";
  const monto = Number(order.monto_a_transferir ?? order.total);
  const resto = Math.max(0, Number(order.total) - monto);
  const pendiente = order.status === "pending";

  return (
    <section
      className={`rounded-lg border p-5 text-sm leading-relaxed ${
        pendiente ? "border-amber-600/60 bg-amber-950/20" : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-neutral-400">
        {efectivo ? "Efectivo con seña" : "Transferencia"}
      </h2>

      <p className="text-neutral-300">
        {efectivo ? "Seña por transferencia: " : "Tiene que transferir: "}
        <strong className="text-neutral-100">{formatPrice(monto)}</strong>
      </p>
      {resto > 0 && (
        <p className="text-neutral-300">
          En efectivo al retirar: <strong className="text-neutral-100">{formatPrice(resto)}</strong>
        </p>
      )}

      {pendiente ? (
        <>
          {order.vence_el && (
            <p className="mt-2 text-amber-200/90">
              Las prendas están reservadas hasta el {formatFechaHora(order.vence_el)}: si no llega la plata,
              el pedido se cancela solo y vuelven al stock.
            </p>
          )}
          <p className="mt-2 text-neutral-400">
            Cuando veas la transferencia en tu cuenta de Mercado Pago, tocá «Recibí la transferencia»: el
            pedido pasa a Pagada y al cliente le llega la confirmación.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <SavingForm action={confirmarTransferencia.bind(null, order.id)} successMessage="Pago confirmado">
              <SubmitButton
                pendingLabel="Confirmando…"
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-green-700"
              >
                Recibí la transferencia
              </SubmitButton>
            </SavingForm>
            <SavingForm
              action={cancelarPedidoReservado.bind(null, order.id)}
              successMessage="Pedido cancelado: las prendas volvieron al stock"
            >
              <SubmitButton
                pendingLabel="Cancelando…"
                className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-bold text-neutral-300 transition-colors hover:bg-neutral-800"
              >
                Cancelar y liberar las prendas
              </SubmitButton>
            </SavingForm>
          </div>
        </>
      ) : order.status === "cancelled" ? (
        <p className="mt-2 text-neutral-500">Cancelado: las prendas volvieron al stock.</p>
      ) : (
        <p className="mt-2 text-green-400">✓ Pago recibido.</p>
      )}
    </section>
  );
}

type ItemRow = {
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
  variant: { size: string } | null;
};

export default async function OrdenDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  const supabase = await createClient();

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!orderData) notFound();
  const order = orderData as Order;

  const { data: rawItems } = await supabase
    .from("order_items")
    .select("quantity, unit_price, product:products(name), variant:product_variants(size)")
    .eq("order_id", orderId)
    .returns<ItemRow[]>();

  const items = rawItems ?? [];

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/ordenes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} /> Volver
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl tracking-widest">ORDEN #{order.id}</h1>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${ORDER_STATUS_CLASSES[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {/* Sobreventa (migración 011): se pagó una prenda que ya no había. */}
        {order.stock_insuficiente && order.status !== "cancelled" ? (
          <section className="rounded-lg border border-red-500/60 bg-red-950/40 p-5 text-sm leading-relaxed">
            <p className="font-bold text-red-300">⚠ Se vendió sin stock</p>
            <p className="mt-1 text-neutral-300">
              Cuando se confirmó este pago, alguna de estas prendas ya no tenía unidades: dos
              personas compraron la última casi al mismo tiempo. El cliente ya pagó. Escribile
              y ofrecele esperar a que repongas, cambiarla por otra, o devolverle la plata desde
              Mercado Pago. Si la devolvés mientras la orden sigue en «Pagada», se cancela sola;
              si ya la habías pasado a otro estado, cancelala a mano acá abajo.
            </p>
          </section>
        ) : null}

        {/* Pago por transferencia o efectivo (migración 012) */}
        {order.medio_pago && order.medio_pago !== "mercadopago" ? (
          <PagoManual order={order} />
        ) : null}

        {/* Items */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Productos
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-neutral-300">
                  {it.product?.name ?? "Producto"}{" "}
                  <span className="text-neutral-500">
                    · {it.variant?.size ?? "—"} · x{it.quantity}
                  </span>
                </span>
                <span className="text-neutral-300">
                  {formatPrice(it.unit_price * it.quantity)}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-neutral-700 pt-3 font-bold">
              <span>Total</span>
              <span className="text-red-500">{formatPrice(order.total)}</span>
            </div>
          </div>
        </section>

        {/* Cliente + entrega */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Cliente y entrega
          </h2>

          <div className="mb-4 text-sm text-neutral-300 leading-relaxed">
            <span className="text-neutral-200">{order.customer_name || "Sin nombre"}</span>
            {order.customer_phone && (
              <>
                {" · "}
                <a
                  href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  {order.customer_phone}
                </a>
              </>
            )}
            {order.customer_email && (
              <>
                <br />
                <span className="text-neutral-500">{order.customer_email}</span>
              </>
            )}
          </div>

          <p className="text-sm text-neutral-300">
            <span className="text-neutral-500">Entrega: </span>
            {order.delivery_point ? DELIVERY_POINT_LABELS[order.delivery_point] : "—"}
          </p>
          {order.delivery_address && (
            <p className="mt-1 text-sm text-neutral-300">
              <span className="text-neutral-500">Dirección: </span>
              {order.delivery_address}
            </p>
          )}
          {order.delivery_notes && (
            <p className="mt-1 text-sm text-neutral-500">{order.delivery_notes}</p>
          )}
        </section>

        {/* Cambiar estado */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Cambiar estado
          </h2>
          <form
            action={updateOrderStatus.bind(null, order.id)}
            className="flex flex-wrap items-center gap-3"
          >
            <select
              name="status"
              defaultValue={order.status}
              className="rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            >
              {ALL_ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
            >
              Actualizar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
