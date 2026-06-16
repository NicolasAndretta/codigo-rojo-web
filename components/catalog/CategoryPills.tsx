"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types/database";

type Props = {
  categories: Category[];
};

export default function CategoryPills({ categories }: Props) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "todos";
  const activeSize = searchParams.get("size");

  function buildUrl(categorySlug: string) {
    const params = new URLSearchParams();
    if (categorySlug !== "todos") params.set("category", categorySlug);
    if (activeSize) params.set("size", activeSize);
    const qs = params.toString();
    return `/catalogo${qs ? `?${qs}` : ""}`;
  }

  const all = [{ slug: "todos", name: "Todo" }, ...categories];

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((cat) => {
        const isActive = cat.slug === activeCategory;
        return (
          <Link
            key={cat.slug}
            href={buildUrl(cat.slug)}
            className={`rounded-full px-5 py-2 text-sm font-semibold tracking-wider uppercase transition-all ${
              isActive
                ? "bg-red-600 text-white"
                : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            }`}
          >
            {cat.name}
          </Link>
        );
      })}
    </div>
  );
}
