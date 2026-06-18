import type { Category } from "@/lib/types/database";

type Props = {
  categories: Category[];
  defaultValue?: number | null;
  name?: string;
};

/**
 * Selector de categoría con jerarquía visual: las categorías madre
 * aparecen primero y sus subcategorías indentadas debajo. Todas son
 * seleccionables (un producto puede ir en la madre o en una subcategoría).
 */
export default function CategorySelect({
  categories,
  defaultValue,
  name = "category_id",
}: Props) {
  const roots = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
    >
      <option value="">Sin categoría</option>
      {roots.map((root) => {
        const children = categories
          .filter((c) => c.parent_id === root.id)
          .sort((a, b) => a.display_order - b.display_order);
        return (
          <optgroup key={root.id} label={root.name}>
            <option value={root.id}>{root.name}</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                &nbsp;&nbsp;└ {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
