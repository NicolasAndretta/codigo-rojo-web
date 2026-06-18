"use server";

/**
 * MÓDULO REUTILIZABLE — Acciones de administración de descuentos.
 * Crea/activa/borra descuentos de producto, categoría o cupón.
 * Devuelve estado para mostrar errores inline (sin alert).
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, DiscountScope, DiscountValueType } from "@/lib/types/database";

export type DiscountFormState = { error?: string; ok?: boolean };

type DiscountInsert = Database["public"]["Tables"]["discounts"]["Insert"];

export async function createDiscount(
  _prev: DiscountFormState,
  formData: FormData
): Promise<DiscountFormState> {
  const supabase = await createClient();

  const scope = String(formData.get("scope") ?? "") as DiscountScope;
  const valueType = String(formData.get("value_type") ?? "") as DiscountValueType;
  const value = Number(formData.get("value") ?? 0);

  if (!["product", "category", "coupon"].includes(scope)) {
    return { error: "Elegí qué querés descontar" };
  }
  if (!["percent", "fixed"].includes(valueType)) {
    return { error: "Elegí el tipo de descuento" };
  }
  if (!Number.isFinite(value) || value <= 0) {
    return { error: "El valor del descuento debe ser mayor a 0" };
  }
  if (valueType === "percent" && value > 100) {
    return { error: "Un porcentaje no puede superar 100%" };
  }

  const insert: DiscountInsert = {
    scope,
    value_type: valueType,
    value,
    is_active: true,
  };

  if (scope === "product") {
    const id = Number(formData.get("target_product_id"));
    if (!id) return { error: "Elegí el producto a descontar" };
    insert.target_product_id = id;
  } else if (scope === "category") {
    const id = Number(formData.get("target_category_id"));
    if (!id) return { error: "Elegí la categoría a descontar" };
    insert.target_category_id = id;
  } else {
    const code = String(formData.get("code") ?? "").trim();
    if (!code) return { error: "Ingresá un código de cupón" };
    insert.code = code;

    const endsAt = String(formData.get("ends_at") ?? "").trim();
    if (endsAt) insert.ends_at = new Date(endsAt).toISOString();

    const maxUses = Number(formData.get("max_uses"));
    if (Number.isFinite(maxUses) && maxUses > 0) insert.max_uses = maxUses;
  }

  const { error } = await supabase.from("discounts").insert(insert);

  if (error) {
    // El índice único bloquea dos descuentos activos sobre lo mismo
    if (error.code === "23505") {
      return {
        error:
          scope === "coupon"
            ? "Ya existe un cupón activo con ese código"
            : "Ese producto/categoría ya tiene un descuento activo",
      };
    }
    return { error: "No se pudo crear el descuento" };
  }

  revalidatePath("/admin/descuentos");
  revalidatePath("/catalogo");
  return { ok: true };
}

export async function setDiscountActive(id: number, next: boolean) {
  const supabase = await createClient();
  await supabase.from("discounts").update({ is_active: next }).eq("id", id);
  revalidatePath("/admin/descuentos");
  revalidatePath("/catalogo");
}

export async function deleteDiscount(id: number) {
  const supabase = await createClient();
  await supabase.from("discounts").delete().eq("id", id);
  revalidatePath("/admin/descuentos");
  revalidatePath("/catalogo");
}
