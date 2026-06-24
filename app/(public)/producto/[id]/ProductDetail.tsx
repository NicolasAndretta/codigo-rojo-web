"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, MessageCircle, Truck, Store, ShieldCheck } from "lucide-react";
import type { ProductWithVariants, ProductVariant } from "@/lib/types/database";
import type { PriceResult } from "@/lib/discounts/pricing";
import { formatWhatsAppUrl } from "@/lib/utils/format";
import { useCart } from "@/lib/hooks/useCart";
import PriceTag, { DiscountBadge } from "@/components/catalog/PriceTag";

type Props = {
  product: ProductWithVariants;
  price: PriceResult;
};

export default function ProductDetail({ product, price }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  // Imágenes válidas (descarta huecos/nulos por si el array quedó disperso).
  const images = product.images.filter(Boolean);
  // Sin stock = ningún talle disponible. 100% data-driven: si reponen, vuelve solo.
  const soldOut = product.variants.every((v) => v.stock <= 0);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const whatsappMsg = `Hola! Quiero comprar: ${product.name}${selectedVariant ? ` (Talle ${selectedVariant.size})` : ""}`;
  const whatsappUrl = formatWhatsAppUrl(whatsappNumber, whatsappMsg);

  function handleAddToCart() {
    if (!selectedVariant) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      size: selectedVariant.size,
      price: price.final, // precio con descuento aplicado
      image: images[0] ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back */}
      <Link
        href="/catalogo"
        className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Imágenes */}
        <div className="flex flex-col gap-3 md:sticky md:top-24 md:self-start">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-900">
            {images[activeImage] ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={`object-cover ${soldOut ? "opacity-50 grayscale" : ""}`}
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-display text-7xl tracking-widest text-neutral-700">
                  CR
                </span>
              </div>
            )}
            {soldOut && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className="absolute left-[-30%] top-10 w-[160%] rotate-[-45deg] bg-red-600/95 py-2 text-center text-sm font-black tracking-[0.45em] text-white shadow-lg">
                  AGOTADO
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded border transition-all ${
                    i === activeImage
                      ? "border-red-600"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          {product.category && (
            <Link
              href={`/catalogo?category=${product.category.slug}`}
              className="text-xs font-semibold tracking-widest uppercase text-red-600 hover:text-red-500"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="font-display text-4xl md:text-5xl tracking-wider text-neutral-50">
            {product.name.toUpperCase()}
          </h1>

          <div className="flex items-center gap-3">
            <PriceTag price={price} size="lg" />
            {price.hasDiscount && <DiscountBadge percentOff={price.percentOff} />}
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-neutral-400">
              {product.description}
            </p>
          )}

          {/* Aviso de sin stock */}
          {soldOut && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3">
              <p className="text-sm font-bold uppercase tracking-wide text-red-300">
                Producto sin stock disponible
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Por ahora no quedan talles. Consultanos por WhatsApp por la próxima reposición.
              </p>
            </div>
          )}

          {/* Selector de talle */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-neutral-500">
              Talle{selectedVariant && `: ${selectedVariant.size}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const hasStock = variant.stock > 0;
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    onClick={() => hasStock && setSelectedVariant(variant)}
                    disabled={!hasStock}
                    className={`h-11 w-11 rounded border text-sm font-bold transition-all ${
                      isSelected
                        ? "border-red-600 bg-red-600 text-white"
                        : hasStock
                        ? "border-neutral-600 text-neutral-200 hover:border-neutral-400"
                        : "cursor-not-allowed border-neutral-800 text-neutral-700 line-through"
                    }`}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
            {selectedVariant && (
              <p className="mt-2 text-xs text-neutral-500">
                {selectedVariant.stock === 1
                  ? "¡Último disponible!"
                  : `${selectedVariant.stock} disponibles`}
              </p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || soldOut}
              className={`flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4 text-sm font-bold tracking-wider uppercase transition-all ${
                !selectedVariant || soldOut
                  ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                  : added
                  ? "bg-green-700 text-white"
                  : "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]"
              }`}
            >
              <ShoppingBag size={18} />
              {soldOut
                ? "Sin stock"
                : !selectedVariant
                ? "Seleccioná un talle"
                : added
                ? "¡Agregado al carrito!"
                : "Agregar al carrito"}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 px-6 py-4 text-sm font-bold tracking-wider uppercase text-neutral-300 transition-all hover:border-neutral-500 hover:text-neutral-100"
            >
              <MessageCircle size={18} />
              Consultar por WhatsApp
            </a>
          </div>

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-3 border-t border-neutral-800 pt-5">
            <div className="text-center">
              <Store size={20} className="mx-auto mb-1.5 text-neutral-400" />
              <p className="text-[11px] leading-tight text-neutral-500">
                Retiro en Haedo o Ramos Mejía
              </p>
            </div>
            <div className="text-center">
              <Truck size={20} className="mx-auto mb-1.5 text-neutral-400" />
              <p className="text-[11px] leading-tight text-neutral-500">
                Envío a CABA y zona oeste
              </p>
            </div>
            <div className="text-center">
              <ShieldCheck size={20} className="mx-auto mb-1.5 text-neutral-400" />
              <p className="text-[11px] leading-tight text-neutral-500">
                Pago seguro MercadoPago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
