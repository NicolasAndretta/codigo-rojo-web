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
import type { Order, ShippingAddress } from "@/lib/types/database";

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

  const [{ data: rawItems }, { data: address }, { data: profile }] = await Promise.all([
    supabase
      .from("order_items")
      .select("quantity, unit_price, product:products(name), variant:product_variants(size)")
      .eq("order_id", orderId)
      .returns<ItemRow[]>(),
    supabase
      .from("shipping_addresses")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle<ShippingAddress>(),
    order.user_id
      ? supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", order.user_id)
          .single<{ email: string; full_name: string | null }>()
      : Promise.resolve({ data: null }),
  ]);

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

        {/* Entrega */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Entrega — {order.delivery_type === "pickup" ? "Retiro en local" : "Envío a domicilio"}
          </h2>
          {profile && (
            <p className="mb-3 text-sm text-neutral-400">
              Cliente: <span className="text-neutral-200">{profile.full_name || "—"}</span> ·{" "}
              {profile.email}
            </p>
          )}
          {order.delivery_type === "delivery" && address ? (
            <p className="text-sm text-neutral-300 leading-relaxed">
              {address.full_name} · {address.phone}
              <br />
              {address.street} {address.number}
              {address.floor_apt ? `, ${address.floor_apt}` : ""}
              <br />
              {address.localidad}, {address.provincia} (CP {address.codigo_postal})
              {address.notes && (
                <>
                  <br />
                  <span className="text-neutral-500">{address.notes}</span>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Retiro coordinado por WhatsApp.</p>
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
