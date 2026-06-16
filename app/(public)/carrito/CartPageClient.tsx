"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";
import { formatPrice } from "@/lib/utils/format";

export default function CartPageClient() {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-32 text-center">
        <ShoppingBag size={48} className="text-neutral-700" />
        <div>
          <p className="font-display text-4xl tracking-widest text-neutral-600">
            CARRITO VACÍO
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Todavía no agregaste ningún producto.
          </p>
        </div>
        <Link
          href="/catalogo"
          className="rounded-lg bg-red-600 px-8 py-3 text-sm font-bold tracking-widest uppercase text-white hover:bg-red-700 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-5xl tracking-widest">
          CARRITO
          <span className="ml-4 text-2xl text-neutral-500">({totalItems})</span>
        </h1>
        <button
          onClick={clearCart}
          className="text-xs text-neutral-600 hover:text-red-500 underline underline-offset-2 transition-colors"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="flex gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              {/* Imagen */}
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded bg-neutral-800">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-display text-xl text-neutral-700">CR</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-neutral-100">{item.name}</p>
                    <p className="text-xs text-neutral-500">Talle: {item.size}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-neutral-600 hover:text-red-500 transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Cantidad */}
                  <div className="flex items-center gap-2 rounded border border-neutral-700">
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      className="px-2 py-1 text-neutral-400 hover:text-neutral-100 transition-colors"
                      aria-label="Restar"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      className="px-2 py-1 text-neutral-400 hover:text-neutral-100 transition-colors"
                      aria-label="Sumar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <p className="font-bold text-red-500">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 font-display text-2xl tracking-wider">RESUMEN</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal ({totalItems} items)</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Envío</span>
                <span>A coordinar</span>
              </div>
              <div className="my-2 border-t border-neutral-700" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-red-500">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-4 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors active:scale-[0.98]"
            >
              Finalizar compra
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/catalogo"
              className="mt-3 block text-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
