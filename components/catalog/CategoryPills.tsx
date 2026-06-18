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

  // Árbol: raíces (parent_id null) y sus hijas, ordenadas por display_order.
  const roots = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.display_order - b.display_order);
  const childrenOf = (parentId: number) =>
    categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.display_order - b.display_order);

  // Determinar la raíz activa (sea porque está seleccionada ella o una hija).
  const activeCat = categories.find((c) => c.slug === activeCategory);
  const activeRoot =
    activeCat?.parent_id != null
      ? categories.find((c) => c.id === activeCat.parent_id)
      : activeCat ?? null;
  const subcategories = activeRoot ? childrenOf(activeRoot.id) : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Categorías raíz */}
      <div className="flex flex-wrap gap-2">
        <Pill href={buildUrl("todos")} label="Todo" active={activeCategory === "todos"} />
        {roots.map((cat) => (
          <Pill
            key={cat.id}
            href={buildUrl(cat.slug)}
            label={cat.name}
            active={activeRoot?.id === cat.id}
          />
        ))}
      </div>

      {/* Subcategorías de la raíz activa */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-l-2 border-red-600/40 pl-3">
          <Pill
            href={buildUrl(activeRoot!.slug)}
            label={`Todo ${activeRoot!.name}`}
            active={activeCategory === activeRoot!.slug}
            small
          />
          {subcategories.map((sub) => (
            <Pill
              key={sub.id}
              href={buildUrl(sub.slug)}
              label={sub.name}
              active={activeCategory === sub.slug}
              small
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({
  href,
  label,
  active,
  small = false,
}: {
  href: string;
  label: string;
  active: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full font-semibold uppercase tracking-wider transition-all ${
        small ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm"
      } ${
        active
          ? "bg-red-600 text-white"
          : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
      }`}
    >
      {label}
    </Link>
  );
}
