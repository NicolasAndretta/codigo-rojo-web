"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export default function SizeFilter() {
  const searchParams = useSearchParams();
  const activeSize = searchParams.get("size");
  const activeCategory = searchParams.get("category");

  function buildUrl(size: string) {
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    // Toggle: si ya está activo ese talle, lo quita
    if (size !== activeSize) params.set("size", size);
    const qs = params.toString();
    return `/catalogo${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mr-1">
        Talle
      </span>
      {SIZES.map((size) => {
        const isActive = size === activeSize;
        return (
          <Link
            key={size}
            href={buildUrl(size)}
            className={`h-9 w-9 flex items-center justify-center rounded border text-xs font-bold tracking-wider transition-all ${
              isActive
                ? "border-red-600 bg-red-600 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            }`}
          >
            {size}
          </Link>
        );
      })}
      {activeSize && (
        <Link
          href={buildUrl("")}
          className="ml-1 text-xs text-neutral-500 hover:text-red-500 underline underline-offset-2 transition-colors"
        >
          Limpiar
        </Link>
      )}
    </div>
  );
}
