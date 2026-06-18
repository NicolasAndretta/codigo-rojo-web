import { createServiceClient } from "@/lib/supabase/admin";
import { getResend } from "./client";
import {
  orderConfirmationHtml,
  adminNotificationHtml,
  type OrderEmailData,
  type OrderEmailItem,
  type DeliveryPoint,
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

// Best-effort: nunca lanza. Si falla el envío, no rompe el webhook
// (el pago ya quedó confirmado de forma idempotente).
export async function sendOrderEmails(orderId: number): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, total, delivery_point, delivery_address, delivery_notes, customer_name, customer_phone, customer_email, user_id"
      )
      .eq("id", orderId)
      .single<OrderRow>();

    if (!order) return;

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
      name: r.product?.name ?? "Producto",
      size: r.variant?.size ?? "",
      quantity: r.quantity,
      unitPrice: r.unit_price,
    }));

    const data: OrderEmailData = {
      orderId,
      customerName,
      customerPhone: order.customer_phone ?? "",
      customerEmail,
      total: order.total,
      deliveryPoint: order.delivery_point ?? "haedo",
      deliveryAddress: order.delivery_address,
      deliveryNotes: order.delivery_notes,
      items,
    };

    const from = process.env.EMAIL_FROM ?? "Código Rojo <onboarding@resend.dev>";
    const adminEmail = process.env.ADMIN_EMAIL;
    const resend = getResend();

    if (customerEmail) {
      await resend.emails.send({
        from,
        to: customerEmail,
        subject: `Tu pedido #${orderId} — Código Rojo`,
        html: orderConfirmationHtml(data),
      });
    }

    if (adminEmail) {
      await resend.emails.send({
        from,
        to: adminEmail,
        subject: `🛒 Nueva orden #${orderId}`,
        html: adminNotificationHtml(data),
      });
    }
  } catch (err) {
    console.error("[emails] fallo al enviar emails de orden:", err);
  }
}
