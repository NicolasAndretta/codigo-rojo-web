import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "@/lib/admin/actions";
import { formatPrice } from "@/lib/utils/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ALL_ORDER_STATUSES,
} from "@/lib/utils/orderStatus";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import type { Order } from "@/lib/types/database";

export const metadata = { title: "Orden | Admin" };

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
