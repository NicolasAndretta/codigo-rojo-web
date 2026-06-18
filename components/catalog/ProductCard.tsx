import Link from "next/link";
import Image from "next/image";
import type { ProductWithVariants } from "@/lib/types/database";
import type { PriceResult } from "@/lib/discounts/pricing";
import PriceTag, { DiscountBadge } from "./PriceTag";

type Props = {
  product: ProductWithVariants;
  price: PriceResult;
};

export default function ProductCard({ product, price }: Props) {
  const inStockSizes = product.variants
    .filter((v) => v.stock > 0)
    .map((v) => v.size);

  const hasStock = inStockSizes.length > 0;
  const lowStock = hasStock && inStockSizes.length <= 2;

  return (
    <Link
      href={`/producto/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/40 transition-all duration-300 hover:border-red-700/60 hover:shadow-[0_0_40px_-12px_rgba(220,38,38,0.45)]"
    >
      {/* Imagen */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950">
            <span className="font-display text-6xl tracking-widest text-neutral-800">
              CR
            </span>
          </div>
        )}

        {/* Overlay gradiente al hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* CTA que aparece al hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-3 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="inline-block rounded-md bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
            Ver producto
          </span>
        </div>

        {/* Badge de descuento (arriba izquierda) */}
        {hasStock && price.hasDiscount && (
          <span className="absolute left-3 top-3">
            <DiscountBadge percentOff={price.percentOff} />
          </span>
        )}

        {/* Estado de stock */}
        {!hasStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/75 backdrop-blur-[1px]">
            <span className="rounded border border-neutral-600 px-3 py-1 text-xs font-bold tracking-widest uppercase text-neutral-300">
              Agotado
            </span>
          </div>
        ) : lowStock ? (
          <span className="absolute right-3 top-3 rounded-full bg-neutral-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-200 backdrop-blur-sm">
            Últimas unidades
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-100 leading-tight">
          {product.name}
        </h3>

        {/* Talles disponibles */}
        {hasStock && (
          <div className="flex flex-wrap gap-1">
            {inStockSizes.map((size) => (
              <span
                key={size}
                className="rounded border border-neutral-700/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400"
              >
                {size}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-1">
          <PriceTag price={price} />
        </div>
      </div>
    </Link>
  );
}
