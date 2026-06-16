import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPreferenceClient } from "@/lib/mercadopago/client";
import type { CartItem } from "@/lib/hooks/useCart";
import type { Database } from "@/lib/types/database";

type OrderBody = {
  items: CartItem[];
  delivery_type: "pickup" | "delivery";
  shipping_address: {
    full_name: string;
    phone: string;
    street: string;
    number: string;
    floor_apt?: string;
    localidad: string;
    provincia: string;
    codigo_postal: string;
    notes?: string;
  } | null;
};

type VariantRow = { id: number; stock: number; size: string; product_id: number };

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json()) as OrderBody;
  const { items, delivery_type, shipping_address } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  if (delivery_type === "delivery" && !shipping_address) {
    return NextResponse.json(
      { error: "Dirección de envío requerida" },
      { status: 400 }
    );
  }

  // Verificar stock actualizado
  const variantIds = items.map((i) => i.variantId);
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, stock, size, product_id")
    .in("id", variantIds)
    .returns<VariantRow[]>();

  if (variantsError || !variants) {
    return NextResponse.json({ error: "Error verificando stock" }, { status: 500 });
  }

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant || variant.stock < item.quantity) {
      return NextResponse.json(
        { error: `Sin stock suficiente para "${item.name}" talle ${item.size}` },
        { status: 409 }
      );
    }
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Crear orden — cast explícito para evitar inferencia incorrecta de supabase-js
  type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
  const orderInsert: OrderInsert = {
    user_id: user.id,
    status: "pending",
    total,
    delivery_type,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id")
    .single<{ id: number }>();

  if (orderError || !order) {
    return NextResponse.json({ error: "Error creando orden" }, { status: 500 });
  }

  // Insertar items
  type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];
  const orderItems: OrderItemInsert[] = items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    return NextResponse.json({ error: "Error guardando items" }, { status: 500 });
  }

  // Insertar dirección si es delivery
  if (delivery_type === "delivery" && shipping_address) {
    type ShippingInsert = Database["public"]["Tables"]["shipping_addresses"]["Insert"];
    const addrInsert: ShippingInsert = {
      order_id: order.id,
      full_name: shipping_address.full_name,
      phone: shipping_address.phone,
      street: shipping_address.street,
      number: shipping_address.number,
      floor_apt: shipping_address.floor_apt ?? null,
      localidad: shipping_address.localidad,
      provincia: shipping_address.provincia,
      codigo_postal: shipping_address.codigo_postal,
      notes: shipping_address.notes ?? null,
    };

    const { error: addrError } = await supabase
      .from("shipping_addresses")
      .insert(addrInsert);

    if (addrError) {
      return NextResponse.json(
        { error: "Error guardando dirección" },
        { status: 500 }
      );
    }
  }

  // Crear preference de MercadoPago (Checkout Pro)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const preference = await getPreferenceClient().create({
      body: {
        items: items.map((item) => ({
          id: String(item.variantId),
          title: `${item.name} (Talle ${item.size})`,
          quantity: item.quantity,
          unit_price: item.price,
          currency_id: "ARS",
        })),
        external_reference: String(order.id),
        back_urls: {
          success: `${siteUrl}/checkout/success`,
          failure: `${siteUrl}/checkout/failure`,
          pending: `${siteUrl}/checkout/pending`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/webhooks/mp`,
      },
    });

    // Guardar el id de preference (dato de sistema → service client)
    if (preference.id) {
      const service = createServiceClient();
      await service
        .from("orders")
        .update({ mp_preference_id: preference.id })
        .eq("id", order.id);
    }

    const initPoint = preference.init_point ?? preference.sandbox_init_point;
    return NextResponse.json({ order_id: order.id, mp_init_point: initPoint });
  } catch {
    // Si MP falla, la orden queda 'pending'; el cliente ve el error inline
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intentá de nuevo." },
      { status: 502 }
    );
  }
}
