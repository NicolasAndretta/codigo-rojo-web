import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { leerConfigPagos } from "@/lib/pagos/config";
import TransferenciaClient, { type PedidoTransferencia } from "./TransferenciaClient";

// ============================================================
// "Cómo transferir": a donde llega el cliente después de pedir por
// transferencia o efectivo (migración 012).
//
// Se entra con el token_publico del pedido, no con el número: el número se
// puede adivinar y acá se ven el monto y lo que compró. El cliente la puede
// volver a abrir (desde el mail) y ve el estado al día: esperando, pagado o
// vencido.
// ============================================================

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tu pedido | Código Rojo",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ItemRow = {
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
  variant: { size: string } | null;
};

export default async function TransferenciaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();

  // Service client: los pedidos de invitado no se pueden leer con RLS, y el
  // token es lo que prueba que quien mira es quien compró.
  const supabase = createServiceClient();
  const { data: orden } = await supabase
    .from("orders")
    .select("id, status, total, medio_pago, monto_a_transferir, vence_el, delivery_point, customer_name")
    .eq("token_publico", token)
    .maybeSingle<{
      id: number;
      status: string;
      total: number;
      medio_pago: string;
      monto_a_transferir: number | null;
      vence_el: string | null;
      delivery_point: string | null;
      customer_name: string | null;
    }>();

  if (!orden || orden.medio_pago === "mercadopago") notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, unit_price, product:products(name), variant:product_variants(size)")
    .eq("order_id", orden.id)
    .returns<ItemRow[]>();

  const config = await leerConfigPagos(supabase);
  const monto = Number(orden.monto_a_transferir ?? orden.total);

  const pedido: PedidoTransferencia = {
    id: orden.id,
    estado:
      orden.status === "pending" ? "esperando" : orden.status === "cancelled" ? "cancelado" : "pagado",
    medio: orden.medio_pago === "efectivo" ? "efectivo" : "transferencia",
    total: Number(orden.total),
    monto,
    resto: Math.max(0, Number(orden.total) - monto),
    venceEl: orden.vence_el,
    alias: config.alias,
    titular: config.titular,
    nombre: orden.customer_name?.split(" ")[0] ?? null,
    items: (items ?? []).map((i) => ({
      nombre: i.product?.name ?? "Producto",
      talle: i.variant?.size ?? "",
      cantidad: i.quantity,
      subtotal: Number(i.unit_price) * i.quantity,
    })),
  };

  return <TransferenciaClient pedido={pedido} />;
}
