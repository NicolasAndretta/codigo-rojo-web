import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from "@/lib/utils/orderStatus";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import type { Order } from "@/lib/types/database";
import { esAdmin } from "@/lib/admin/sesion";
import { conciliar } from "@/lib/mercadopago/conciliar";

export const metadata = { title: "Órdenes | Admin" };

// Antes de listar, se le pregunta a Mercado Pago por las órdenes pendientes:
// si alguna se pagó y el aviso no llegó, aparece confirmada acá mismo
// (lib/mercadopago/conciliar.ts). Con tope de tiempo: si MP tarda, la lista
// se muestra igual y la conciliación termina sola en segundo plano.
const ESPERA_CONCILIACION_MS = 4000;

export default async function OrdenesAdminPage() {
  // El layout ya frena a quien no es admin, pero la página arranca en paralelo
  // con el layout: sin este chequeo, cualquiera dispararía la conciliación.
  if (await esAdmin()) {
    await Promise.race([
      conciliar().catch(() => null),
      new Promise((r) => setTimeout(r, ESPERA_CONCILIACION_MS)),
    ]);
  }

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
                {/* Va abajo del nombre y no como otro cartel al costado: en el celu
                    no entran tres carteles en la misma fila. */}
                {o.medio_pago && o.medio_pago !== "mercadopago" ? (
                  <p className="mt-1 text-xs font-semibold text-amber-300">
                    {o.medio_pago === "efectivo" ? "Efectivo con seña" : "Transferencia"}
                    {o.status === "pending" && o.vence_el
                      ? ` · espera hasta el ${new Date(o.vence_el).toLocaleString("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </p>
                ) : null}
                {o.stock_insuficiente && o.status !== "cancelled" ? (
                  <p className="mt-1 text-xs font-bold text-red-400">
                    ⚠ Se vendió sin stock
                  </p>
                ) : null}
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
