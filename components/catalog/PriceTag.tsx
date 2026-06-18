import { formatPrice } from "@/lib/utils/format";
import type { PriceResult } from "@/lib/discounts/pricing";

type Props = {
  price: PriceResult;
  size?: "sm" | "lg";
  className?: string;
};

/**
 * Muestra el precio de un producto. Si tiene descuento, tacha el precio
 * original y resalta el final. Reutilizable en catálogo y detalle.
 */
export default function PriceTag({ price, size = "sm", className = "" }: Props) {
  const finalClass = size === "lg" ? "text-2xl font-bold" : "text-lg font-bold";
  const origClass = size === "lg" ? "text-base" : "text-xs";

  if (!price.hasDiscount) {
    return (
      <span className={`${finalClass} text-neutral-50 ${className}`}>
        {formatPrice(price.final)}
      </span>
    );
  }

  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`${finalClass} text-red-500`}>{formatPrice(price.final)}</span>
      <span className={`${origClass} text-neutral-500 line-through`}>
        {formatPrice(price.original)}
      </span>
    </span>
  );
}

/** Badge "-XX%" para superponer sobre la imagen del producto. */
export function DiscountBadge({ percentOff }: { percentOff: number }) {
  if (percentOff <= 0) return null;
  return (
    <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
      −{percentOff}%
    </span>
  );
}
