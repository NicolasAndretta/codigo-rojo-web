import { createServiceClient } from "@/lib/supabase/admin";
import { getResend } from "./client";
import {
  orderConfirmationHtml,
  adminNotificationHtml,
  type OrderEmailData,
  type OrderEmailItem,
  type OrderEmailAddress,
} from "./templates";

type OrderRow = {
  id: number;
  total: number;
  delivery_type: "pickup" | "delivery";
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
      .select("id, total, delivery_type, user_id")
      .eq("id", orderId)
      .single<OrderRow>();

    if (!order) return;

    let customerEmail = "";
    let customerName = "";
    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", order.user_id)
        .single<{ email: string; full_name: string | null }>();
      customerEmail = profile?.email ?? "";
      customerName = profile?.full_name ?? "";
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

    let address: OrderEmailAddress | null = null;
    if (order.delivery_type === "delivery") {
      const { data: addr } = await supabase
        .from("shipping_addresses")
        .select("full_name, phone, street, number, floor_apt, localidad, provincia, codigo_postal, notes")
        .eq("order_id", orderId)
        .maybeSingle<OrderEmailAddress>();
      address = addr ?? null;
    }

    const data: OrderEmailData = {
      orderId,
      customerName,
      customerEmail,
      total: order.total,
      deliveryType: order.delivery_type,
      items,
      address,
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
