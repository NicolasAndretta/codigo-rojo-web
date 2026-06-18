import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from "@/lib/utils/orderStatus";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import type { Order } from "@/lib/types/database";

export const metadata = { title: "Órdenes | Admin" };

export default async function OrdenesAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as Order[];

  return (
    <div>
      <h1 className="mb-8 font-display text-4xl tracking-widest">ÓRDENES</h1>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">Todavía no hay órdenes.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/ordenes/${o.id}`}
              className="flex items-center gap-4 border-b border-neutral-800 bg-neutral-900 p-4 last:border-b-0 hover:bg-neutral-800/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-100">
                  Orden #{o.id}
                  {o.customer_name ? (
                    <span className="ml-2 font-normal text-neutral-400">· {o.customer_name}</span>
                  ) : null}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(o.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {o.delivery_point ? DELIVERY_POINT_LABELS[o.delivery_point] : "—"}
                </p>
              </div>

              <span className="shrink-0 text-sm font-semibold text-neutral-200">
                {formatPrice(o.total)}
              </span>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${ORDER_STATUS_CLASSES[o.status]}`}
              >
                {ORDER_STATUS_LABELS[o.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
