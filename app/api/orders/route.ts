import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPreferenceClient } from "@/lib/mercadopago/client";
import { fetchActiveDiscounts, validateCoupon, couponAmountOff } from "@/lib/discounts/server";
import { effectivePrice } from "@/lib/discounts/pricing";
import type { CartItem } from "@/lib/hooks/useCart";
import type { Database, DeliveryPoint, MedioPago } from "@/lib/types/database";
import { DEMASIADOS_INTENTOS, ipDe, permitir } from "@/lib/limite";
import { leerConfigPagos } from "@/lib/pagos/config";
import { precioTransferencia, sena } from "@/lib/pagos/precios";
import { sendPedidoTransferenciaEmails } from "@/lib/resend/order-emails";

const MEDIOS: MedioPago[] = ["mercadopago", "transferencia", "efectivo"];

type OrderBody = {
  /** Cómo paga. Sin esto, Mercado Pago (como siempre). */
  medio_pago?: MedioPago;
  items: Pick<CartItem, "productId" | "variantId" | "quantity">[];
  delivery_point: DeliveryPoint;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_address?: string;
  delivery_notes?: string;
  coupon_code?: string;
};

type VariantRow = { id: number; stock: number; size: string; product_id: number };
type ProductRow = {
  id: number;
  name: string;
  price: number;
  category_id: number | null;
  /** Migración 012. undefined si todavía no se corrió. */
  precio_transferencia?: number | null;
};

const DELIVERY_POINTS: DeliveryPoint[] = ["haedo", "ramos_mejia", "domicilio"];

export async function POST(req: NextRequest) {
  // 6 pedidos cada 10 minutos por IP. Una persona real no arma más; un robot
  // que quiere llenar el panel de pedidos falsos (o probar cupones por acá) sí.
  if (!permitir(`orden:${ipDe(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json({ error: DEMASIADOS_INTENTOS }, { status: 429 });
  }

  // Cliente del request: respeta RLS. La compra es anónima (user_id null);
  // si hubiera sesión (admin probando), se asocia igual.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = (await req.json()) as OrderBody;
  const { items, delivery_point, customer, delivery_address, delivery_notes, coupon_code } = body;
  const medio: MedioPago = body.medio_pago ?? "mercadopago";

  // --- Validaciones de entrada ---
  if (!items?.length) {
    return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
  }
  if (!MEDIOS.includes(medio)) {
    return NextResponse.json({ error: "Medio de pago inválido" }, { status: 400 });
  }
  if (!DELIVERY_POINTS.includes(delivery_point)) {
    return NextResponse.json({ error: "Punto de entrega inválido" }, { status: 400 });
  }
  if (!customer?.name?.trim() || !customer?.phone?.trim()) {
    return NextResponse.json(
      { error: "Necesitamos tu nombre y teléfono para coordinar la entrega" },
      { status: 400 }
    );
  }
  if (delivery_point === "domicilio" && !delivery_address?.trim()) {
    return NextResponse.json(
      { error: "Indicá tu dirección para el envío a domicilio" },
      { status: 400 }
    );
  }

  // --- La URL del sitio, y la guardia que evita cobrar sin poder confirmar ---
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // MP rechaza `auto_return` si back_urls.success no es una URL pública
  // (con http/localhost devuelve 400 invalid_auto_return). En desarrollo
  // local lo omitimos para poder probar el flujo de pago; en producción
  // (dominio https público) se activa el retorno automático tras aprobar.
  const isPublicUrl =
    /^https:\/\//.test(siteUrl) && !/localhost|127\.0\.0\.1/.test(siteUrl);

  // ⚠️ EL FALLO MÁS CARO Y MÁS SILENCIOSO DEL SISTEMA
  //
  // `siteUrl` alimenta el `notification_url`: la dirección a la que MercadoPago
  // avisa que se pagó. Si NEXT_PUBLIC_SITE_URL no está cargada en el hosting, el
  // `??` de arriba cae en localhost y el notification_url termina apuntando a
  // http://localhost:3000, que MP no puede alcanzar desde internet.
  //
  // Lo que pasaba entonces: el cliente paga, la plata entra a la cuenta de MP, y
  // la orden queda en 'pending' para siempre. El stock no se descuenta, no sale
  // el mail de confirmación, y NO HAY NINGÚN ERROR EN NINGUNA PANTALLA. Se
  // descubre cuando alguien reclama que pagó y no le llegó nada.
  //
  // Por eso en producción se corta ACÁ, antes de escribir la orden: fallar en el
  // checkout se nota en el primer intento y nadie pierde plata. Seguir adelante
  // con una URL inalcanzable es cobrar sin poder confirmar.
  // (Solo aplica a Mercado Pago: una transferencia no depende del webhook.)
  if (medio === "mercadopago" && process.env.NODE_ENV === "production" && !isPublicUrl) {
    console.error(
      "[orders] NEXT_PUBLIC_SITE_URL no es una URL pública https " +
        `(vale "${siteUrl}"). El webhook de MercadoPago sería inalcanzable y ningún ` +
        "pago se confirmaría. Revisar la variable en el panel del hosting."
    );
    return NextResponse.json(
      {
        error:
          "No podemos procesar el pago en este momento. Escribinos por WhatsApp y lo resolvemos.",
      },
      { status: 503 }
    );
  }

  // --- Traer datos reales de variantes y productos (NO confiar en el cliente) ---
  const variantIds = [...new Set(items.map((i) => i.variantId))];
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("id, stock, size, product_id")
    .in("id", variantIds)
    .returns<VariantRow[]>();

  if (variantsError || !variants) {
    return NextResponse.json({ error: "Error verificando stock" }, { status: 500 });
  }

  // --- Transferencia / efectivo: ¿está habilitado? ---
  const config = await leerConfigPagos(supabase);
  const pagoManual = medio !== "mercadopago";
  if (medio === "transferencia" && !config.transferenciaActiva) {
    return NextResponse.json(
      { error: "El pago por transferencia no está disponible ahora. Elegí otro medio." },
      { status: 409 }
    );
  }
  if (medio === "efectivo") {
    if (!config.efectivoActivo) {
      return NextResponse.json(
        { error: "El pago en efectivo no está disponible ahora. Elegí otro medio." },
        { status: 409 }
      );
    }
    // El resto se paga en mano al retirar: con envío a domicilio no hay retiro.
    if (delivery_point === "domicilio") {
      return NextResponse.json(
        { error: "El efectivo es solo para retirar en Haedo o Ramos Mejía." },
        { status: 400 }
      );
    }
  }

  const productIds = [...new Set(variants.map((v) => v.product_id))];
  // "*" y no la lista de columnas: precio_transferencia es de la migración 012,
  // y pedirla por nombre antes de correrla rompería TODAS las compras.
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds)
    .eq("is_active", true)
    .returns<ProductRow[]>();

  if (productsError || !products) {
    return NextResponse.json({ error: "Error verificando productos" }, { status: 500 });
  }

  // Descuentos vigentes de producto/categoría (RLS ya filtra por validez)
  const discounts = await fetchActiveDiscounts(supabase);

  // --- Recalcular precios autoritativos + validar stock ---
  type PricedItem = {
    productId: number;
    variantId: number;
    name: string;
    size: string;
    quantity: number;
    unitPrice: number;
  };

  const priced: PricedItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    const product = variant && products.find((p) => p.id === variant.product_id);

    if (!variant || !product) {
      return NextResponse.json(
        { error: "Uno de los productos ya no está disponible" },
        { status: 409 }
      );
    }
    const qty = Math.max(1, Math.floor(item.quantity));
    if (variant.stock < qty) {
      return NextResponse.json(
        { error: `Sin stock suficiente para "${product.name}" talle ${variant.size}` },
        { status: 409 }
      );
    }

    const precioMP = effectivePrice(product, discounts, product.id).final;
    const unitPrice = pagoManual
      ? precioTransferencia(precioMP, product.precio_transferencia, config)
      : precioMP;
    priced.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      size: variant.size,
      quantity: qty,
      unitPrice,
    });
    subtotal += unitPrice * qty;
  }

  // --- Cupón (opcional) ---
  let couponDiscountId: number | null = null;
  let couponOff = 0;
  if (coupon_code?.trim()) {
    const coupon = await validateCoupon(supabase, coupon_code);
    if (!coupon) {
      return NextResponse.json(
        { error: "El cupón no es válido o está vencido" },
        { status: 422 }
      );
    }
    couponOff = couponAmountOff(subtotal, coupon);
    couponDiscountId = coupon.id;
  }

  const total = Math.max(0, subtotal - couponOff);

  // --- Crear la orden (service client: escritura de sistema, evita
  //     fricciones de RLS y permite asociar invitado con user_id null) ---
  const service = createServiceClient();
  type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
  const orderInsert: OrderInsert = {
    user_id: user?.id ?? null,
    status: "pending",
    total,
    delivery_point,
    delivery_address: delivery_point === "domicilio" ? delivery_address?.trim() ?? null : null,
    delivery_notes: delivery_notes?.trim() || null,
    customer_name: customer.name.trim(),
    customer_phone: customer.phone.trim(),
    customer_email: customer.email?.trim() || null,
    coupon_discount_id: couponDiscountId,
    // Las columnas de la 012 van SOLO en pedidos por transferencia: así una
    // compra con Mercado Pago no depende de que la migración esté corrida.
    ...(pagoManual
      ? {
          medio_pago: medio,
          monto_a_transferir: medio === "efectivo" ? sena(total, config) : total,
          vence_el: new Date(Date.now() + config.horasParaPagar * 60 * 60 * 1000).toISOString(),
        }
      : {}),
  };

  const { data: order, error: orderError } = await service
    .from("orders")
    .insert(orderInsert)
    .select(pagoManual ? "id, token_publico" : "id")
    .single<{ id: number; token_publico?: string }>();

  if (orderError || !order) {
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }

  // Items con el precio autoritativo
  type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];
  const orderItems: OrderItemInsert[] = priced.map((p) => ({
    order_id: order.id,
    product_id: p.productId,
    variant_id: p.variantId,
    quantity: p.quantity,
    unit_price: p.unitPrice,
  }));

  const { error: itemsError } = await service.from("order_items").insert(orderItems);
  if (itemsError) {
    return NextResponse.json({ error: "Error guardando los productos del pedido" }, { status: 500 });
  }

  // --- Transferencia / efectivo: reservar las prendas y listo ---
  // Sin Mercado Pago no hay preferencia ni webhook: el pedido queda pendiente
  // con las prendas apartadas hasta que Agustina confirme que le llegó la
  // plata, o hasta que venza (lo cancela la conciliación y devuelve el stock).
  if (pagoManual) {
    const { data: reservado, error: reservaError } = await service.rpc("reservar_stock", {
      p_order_id: order.id,
    });
    if (reservaError || !reservado) {
      // Sin reserva no es un pedido: se borra (los ítems se van en cascada).
      await service.from("orders").delete().eq("id", order.id);
      if (reservaError) {
        console.error(`[orders] No se pudo reservar el stock de la orden ${order.id}:`, reservaError.message);
        return NextResponse.json({ error: "No se pudo crear el pedido. Probá de nuevo." }, { status: 500 });
      }
      // Alguien se llevó la última unidad entre que armaste el carrito y ahora.
      return NextResponse.json(
        { error: "Una de las prendas se acaba de agotar. Revisá tu carrito." },
        { status: 409 }
      );
    }

    await sendPedidoTransferenciaEmails(order.id);
    return NextResponse.json({
      order_id: order.id,
      pago_url: `/checkout/transferencia/${order.token_publico}`,
    });
  }

  // --- Preference de MercadoPago (Checkout Pro: tarjeta, débito, efectivo) ---
  // MP no admite ítems con monto negativo. Sin cupón mandamos el detalle
  // por ítem; con cupón mandamos un único ítem consolidado por el total
  // exacto (el desglose completo queda en la orden y en los emails).
  const mpItems =
    couponOff > 0
      ? [
          {
            id: `order-${order.id}`,
            title: `Pedido #${order.id} — Código Rojo (cupón aplicado)`,
            quantity: 1,
            unit_price: total,
            currency_id: "ARS",
          },
        ]
      : priced.map((p) => ({
          id: String(p.variantId),
          title: `${p.name} (Talle ${p.size})`,
          quantity: p.quantity,
          unit_price: p.unitPrice,
          currency_id: "ARS",
        }));

  try {
    const preference = await (await getPreferenceClient()).create({
      body: {
        items: mpItems,
        external_reference: String(order.id),
        back_urls: {
          success: `${siteUrl}/checkout/success?order=${order.id}`,
          failure: `${siteUrl}/checkout/failure`,
          pending: `${siteUrl}/checkout/pending`,
        },
        ...(isPublicUrl ? { auto_return: "approved" } : {}),
        notification_url: `${siteUrl}/api/webhooks/mp`,
      },
    });

    if (preference.id) {
      await service
        .from("orders")
        .update({ mp_preference_id: preference.id })
        .eq("id", order.id);
    }

    const initPoint = preference.init_point ?? preference.sandbox_init_point;
    return NextResponse.json({ order_id: order.id, mp_init_point: initPoint });
  } catch (err) {
    // No tragamos el error: queda en logs del server para diagnosticar
    // (credenciales, body inválido, MP caído, etc.).
    console.error("Error creando preferencia de MercadoPago:", err);

    // Limpiar la orden que quedó colgada. Se insertó unas líneas más arriba,
    // pero el cliente nunca llegó a ver un link de pago: no es una venta, es
    // basura. Sin esto, /admin/ordenes se va llenando de pedidos en 'pending'
    // que nunca existieron y Agustina no puede distinguir cuáles son reales.
    // Best-effort: si la limpieza falla, el error que importa es el de arriba.
    try {
      await service.from("order_items").delete().eq("order_id", order.id);
      await service.from("orders").delete().eq("id", order.id);
    } catch (limpiezaErr) {
      console.error(
        `No se pudo limpiar la orden huérfana ${order.id}:`,
        limpiezaErr
      );
    }

    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intentá de nuevo." },
      { status: 502 }
    );
  }
}
