import { createServiceClient } from "@/lib/supabase/admin";
import { getResend } from "./client";
import {
  orderConfirmationHtml,
  adminNotificationHtml,
  instruccionesTransferenciaHtml,
  pedidoTransferenciaAdminHtml,
  type OrderEmailData,
  type OrderEmailItem,
  type DeliveryPoint,
  type PagoManualEmail,
} from "./templates";

type OrderRow = {
  id: number;
  total: number;
  delivery_point: DeliveryPoint | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  user_id: string | null;
};

type ItemRow = {
  quantity: number;
  unit_price: number;
  product: { name: string } | null;
  variant: { size: string } | null;
};

type PagoRow = {
  medio_pago: "mercadopago" | "transferencia" | "efectivo";
  monto_a_transferir: number | null;
  vence_el: string | null;
  token_publico: string;
};

/**
 * Escapa lo que escribió el cliente (nombre, dirección, notas…) antes de
 * meterlo en el HTML del mail. Sin esto, un nombre como `<a href=…>` llegaba
 * como un link de verdad al mail de Agustina.
 */
function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Arma los datos del mail de una orden. null si la orden no existe. */
async function cargarDatos(orderId: number): Promise<OrderEmailData | null> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, total, delivery_point, delivery_address, delivery_notes, customer_name, customer_phone, customer_email, user_id"
    )
    .eq("id", orderId)
    .single<OrderRow>();

  if (!order) return null;

  // Contacto: prioriza los datos cargados en el checkout invitado;
  // cae al perfil si la orden estuviera asociada a una cuenta.
  let customerEmail = order.customer_email ?? "";
  let customerName = order.customer_name ?? "";
  if (order.user_id && (!customerEmail || !customerName)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .single<{ email: string; full_name: string | null }>();
    customerEmail = customerEmail || (profile?.email ?? "");
    customerName = customerName || (profile?.full_name ?? "");
  }

  const { data: rawItems } = await supabase
    .from("order_items")
    .select("quantity, unit_price, product:products(name), variant:product_variants(size)")
    .eq("order_id", orderId)
    .returns<ItemRow[]>();

  const items: OrderEmailItem[] = (rawItems ?? []).map((r) => ({
    name: esc(r.product?.name ?? "Producto"),
    size: esc(r.variant?.size ?? ""),
    quantity: r.quantity,
    unitPrice: r.unit_price,
  }));

  // Aparte y tolerante a propósito: si la migración 011 todavía no corrió, la
  // columna no existe y esta consulta falla. Metida en la de arriba, ese error
  // dejaba la orden en null y NO salía ningún mail.
  const { data: marca } = await supabase
    .from("orders")
    .select("stock_insuficiente")
    .eq("id", orderId)
    .maybeSingle<{ stock_insuficiente: boolean }>();

  // Lo mismo con las columnas de la 012 (pago por transferencia).
  const { data: pago } = await supabase
    .from("orders")
    .select("medio_pago, monto_a_transferir, vence_el, token_publico")
    .eq("id", orderId)
    .maybeSingle<PagoRow>();

  let pagoManual: PagoManualEmail | undefined;
  if (pago && pago.medio_pago !== "mercadopago") {
    const { data: config } = await supabase
      .from("tienda_config")
      .select("alias, titular")
      .eq("id", 1)
      .maybeSingle<{ alias: string | null; titular: string | null }>();
    const monto = Number(pago.monto_a_transferir ?? order.total);
    const sitio = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
    pagoManual = {
      medio: pago.medio_pago,
      monto,
      resto: Math.max(0, Number(order.total) - monto),
      alias: config?.alias ? esc(config.alias) : null,
      titular: config?.titular ? esc(config.titular) : null,
      venceEl: pago.vence_el,
      url: sitio ? `${sitio}/checkout/transferencia/${pago.token_publico}` : null,
    };
  }

  return {
    orderId,
    customerName: esc(customerName),
    customerPhone: esc(order.customer_phone ?? ""),
    // El mail sin escapar es el destinatario; escapado, el que se muestra.
    customerEmail,
    total: order.total,
    deliveryPoint: order.delivery_point ?? "haedo",
    deliveryAddress: order.delivery_address ? esc(order.delivery_address) : null,
    deliveryNotes: order.delivery_notes ? esc(order.delivery_notes) : null,
    items,
    sinStock: marca?.stock_insuficiente === true,
    pagoManual,
  };
}

function remitente() {
  return process.env.EMAIL_FROM ?? "Código Rojo <onboarding@resend.dev>";
}

/**
 * Mails de una orden PAGADA: confirmación al cliente y aviso a la tienda.
 * Best-effort: nunca lanza. Si falla el envío, no rompe el webhook (el pago ya
 * quedó confirmado de forma idempotente).
 *
 * `tienda: false` cuando la confirmó Agustina a mano (transferencia): ella ya
 * sabe, no hace falta avisarle de su propio clic.
 */
export async function sendOrderEmails(
  orderId: number,
  { tienda = true }: { tienda?: boolean } = {}
): Promise<void> {
  try {
    const data = await cargarDatos(orderId);
    if (!data) return;

    const adminEmail = process.env.ADMIN_EMAIL;
    const resend = getResend();

    if (data.customerEmail) {
      await resend.emails.send({
        from: remitente(),
        to: data.customerEmail,
        subject: `Tu pedido #${orderId} — Código Rojo`,
        html: orderConfirmationHtml({ ...data, customerEmail: esc(data.customerEmail) }),
      });
    }

    if (tienda && adminEmail) {
      await resend.emails.send({
        from: remitente(),
        to: adminEmail,
        subject: data.sinStock
          ? `⚠️ Nueva orden #${orderId} — SE VENDIÓ SIN STOCK`
          : `🛒 Nueva orden #${orderId}`,
        html: adminNotificationHtml({ ...data, customerEmail: esc(data.customerEmail) }),
      });
    }
  } catch (err) {
    console.error("[emails] fallo al enviar emails de orden:", err);
  }
}

/**
 * Mails de un pedido por transferencia o efectivo RECIÉN HECHO (todavía sin
 * pagar): al cliente, los datos para transferir; a la tienda, que hay un pedido
 * esperando plata. Best-effort: nunca lanza.
 */
export async function sendPedidoTransferenciaEmails(orderId: number): Promise<void> {
  try {
    const data = await cargarDatos(orderId);
    if (!data?.pagoManual) return;

    const adminEmail = process.env.ADMIN_EMAIL;
    const resend = getResend();
    const mostrado = { ...data, customerEmail: esc(data.customerEmail) };

    if (data.customerEmail) {
      await resend.emails.send({
        from: remitente(),
        to: data.customerEmail,
        subject: `Tu pedido #${orderId} está reservado — cómo transferir`,
        html: instruccionesTransferenciaHtml(mostrado),
      });
    }
    if (adminEmail) {
      await resend.emails.send({
        from: remitente(),
        to: adminEmail,
        subject: `🕓 Pedido #${orderId} por ${data.pagoManual.medio === "efectivo" ? "efectivo (seña)" : "transferencia"}: esperando la plata`,
        html: pedidoTransferenciaAdminHtml(mostrado),
      });
    }
  } catch (err) {
    console.error("[emails] fallo al enviar emails del pedido por transferencia:", err);
  }
}
