/**
 * MÓDULO REUTILIZABLE — Acceso a descuentos desde el servidor.
 *
 * Trae los descuentos vigentes y valida cupones. Las consultas usan el
 * cliente Supabase del request (respeta RLS): la política pública ya
 * filtra por vigencia (is_active + fechas), así que lo que vuelve acá
 * es directamente aplicable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DiscountValueType } from "@/lib/types/database";
import { applyDiscountValue, type PricingDiscount } from "./pricing";

type DB = SupabaseClient<Database>;

/** Descuentos de producto/categoría vigentes (para precios de catálogo). */
export async function fetchActiveDiscounts(supabase: DB): Promise<PricingDiscount[]> {
  const { data } = await supabase
    .from("discounts")
    .select("scope, value_type, value, target_product_id, target_category_id")
    .in("scope", ["product", "category"]);
  return (data ?? []) as PricingDiscount[];
}

export type ValidatedCoupon = {
  id: number;
  value_type: DiscountValueType;
  value: number;
};

/**
 * Valida un código de cupón vía RPC (security definer: no expone la tabla).
 * Devuelve el cupón si es válido y está vigente, o null.
 */
export async function validateCoupon(
  supabase: DB,
  code: string
): Promise<ValidatedCoupon | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.rpc("validate_coupon", { p_code: trimmed });
  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return { id: row.id, value_type: row.value_type, value: row.value };
}

/** Monto que un cupón descuenta sobre un subtotal (nunca mayor al subtotal). */
export function couponAmountOff(subtotal: number, coupon: ValidatedCoupon): number {
  const final = applyDiscountValue(subtotal, coupon.value_type, coupon.value);
  return subtotal - final;
}
