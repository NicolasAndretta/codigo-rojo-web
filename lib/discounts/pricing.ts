/**
 * ┌──────────────────────────────────────────────────────────────┐
 * │ MÓDULO REUTILIZABLE — Cálculo de precios con descuento         │
 * │                                                                │
 * │ Lógica pura, sin dependencias de framework ni de la base de    │
 * │ datos. Portable a cualquier e-commerce: solo necesita el       │
 * │ precio del producto, su category_id y la lista de descuentos   │
 * │ activos (scope product/category). El cálculo de cupones vive   │
 * │ en `coupons.ts`.                                                │
 * │                                                                │
 * │ Regla de precedencia: un descuento de PRODUCTO siempre gana    │
 * │ sobre uno de CATEGORÍA (más específico = más prioritario).     │
 * └──────────────────────────────────────────────────────────────┘
 */

import type { Discount, DiscountValueType } from "@/lib/types/database";

export type PriceResult = {
  /** Precio de lista, sin descuento. */
  original: number;
  /** Precio final a cobrar (redondeado, nunca negativo). */
  final: number;
  /** Monto descontado en pesos (original - final). */
  amountOff: number;
  /** true si hay un descuento aplicado. */
  hasDiscount: boolean;
  /** Porcentaje de ahorro redondeado (para mostrar "-20%"). */
  percentOff: number;
};

/** Aplica un valor de descuento (porcentaje o monto fijo) a un precio. */
export function applyDiscountValue(
  price: number,
  valueType: DiscountValueType,
  value: number
): number {
  const final =
    valueType === "percent" ? price * (1 - value / 100) : price - value;
  return Math.max(0, Math.round(final));
}

/** Tipo mínimo de producto que el módulo necesita conocer. */
type PricedProduct = { price: number; category_id: number | null };

/**
 * Calcula el precio efectivo de un producto dada la lista de descuentos
 * de producto/categoría vigentes. El descuento de producto tiene prioridad.
 */
export function effectivePrice(
  product: PricedProduct,
  discounts: PricingDiscount[],
  productId: number
): PriceResult {
  const productDiscount = discounts.find(
    (d) => d.scope === "product" && d.target_product_id === productId
  );
  const categoryDiscount =
    product.category_id != null
      ? discounts.find(
          (d) =>
            d.scope === "category" &&
            d.target_category_id === product.category_id
        )
      : undefined;

  const applied = productDiscount ?? categoryDiscount;

  if (!applied) {
    return {
      original: product.price,
      final: product.price,
      amountOff: 0,
      hasDiscount: false,
      percentOff: 0,
    };
  }

  const final = applyDiscountValue(product.price, applied.value_type, applied.value);
  const amountOff = product.price - final;

  return {
    original: product.price,
    final,
    amountOff,
    hasDiscount: amountOff > 0,
    percentOff:
      product.price > 0 ? Math.round((amountOff / product.price) * 100) : 0,
  };
}

/** Subconjunto de campos de descuento que el cálculo necesita. */
export type PricingDiscount = Pick<
  Discount,
  "scope" | "value_type" | "value" | "target_product_id" | "target_category_id"
>;
