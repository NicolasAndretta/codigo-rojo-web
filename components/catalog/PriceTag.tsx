import { formatPrice } from "@/lib/utils/format";
import type { PriceResult } from "@/lib/discounts/pricing";

/** Precio pagando por transferencia, si sale más barato (migración 012). */
export type PrecioTransferenciaTag = {
  precio: number;
  /** "con transferencia" o "con transferencia o efectivo". */
  etiqueta: string;
};

type Props = {
  price: PriceResult;
  size?: "sm" | "lg";
  className?: string;
  transfer?: PrecioTransferenciaTag | null;
};

/**
 * Muestra el precio de un producto. Si tiene descuento, tacha el precio
 * original y resalta el final. Reutilizable en catálogo y detalle.
 *
 * Con precio por transferencia (lo que eligió Agustina el 03/11): el de
 * Mercado Pago va tachado y el de transferencia grande, con la aclaración
 * abajo para que nadie piense que el tachado ya no existe.
 */
export default function PriceTag({ price, size = "sm", className = "", transfer }: Props) {
  const finalClass = size === "lg" ? "text-2xl font-bold" : "text-lg font-bold";
  const origClass = size === "lg" ? "text-base" : "text-xs";

  if (transfer && transfer.precio < price.final) {
    return (
      <span className={`flex flex-col gap-0.5 ${className}`}>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`${finalClass} text-red-500`}>{formatPrice(transfer.precio)}</span>
          <span className={`${origClass} text-neutral-500 line-through`}>{formatPrice(price.final)}</span>
        </span>
        <span className={`${size === "lg" ? "text-xs" : "text-[10px]"} font-semibold uppercase tracking-wider text-green-400`}>
          {transfer.etiqueta}
        </span>
      </span>
    );
  }

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
