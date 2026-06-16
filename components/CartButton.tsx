"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/hooks/useCart";

export default function CartButton() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
      aria-label={`Carrito — ${totalItems} items`}
    >
      <ShoppingBag size={22} />
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </Link>
  );
}
