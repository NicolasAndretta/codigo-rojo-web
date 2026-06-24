import type { ProductVariant } from "@/lib/types/database";

/**
 * Lógica de stock única para todo el sitio (catálogo, producto y admin),
 * para que "agotado" signifique lo mismo en todos lados.
 * Es 100% data-driven: cuando la prima repone stock, todo vuelve solo a normal.
 */

export function totalStock(variants: Pick<ProductVariant, "stock">[] | null | undefined): number {
  return (variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

export function inStockSizes(
  variants: Pick<ProductVariant, "size" | "stock">[] | null | undefined
) {
  return (variants ?? []).filter((v) => (v.stock ?? 0) > 0).map((v) => v.size);
}

/** true si NO queda ningún talle con stock. */
export function isSoldOut(variants: Pick<ProductVariant, "stock">[] | null | undefined): boolean {
  return totalStock(variants) <= 0;
}

/** Pocas unidades (2 talles o menos con stock) pero todavía hay. */
export function isLowStock(
  variants: Pick<ProductVariant, "size" | "stock">[] | null | undefined
): boolean {
  const sizes = inStockSizes(variants);
  return sizes.length > 0 && sizes.length <= 2;
}
