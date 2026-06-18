import { Trash2, Tag, Package, FolderTree, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { setDiscountActive, deleteDiscount } from "@/lib/admin/discounts";
import DiscountForm from "@/components/admin/DiscountForm";
import { formatPrice } from "@/lib/utils/format";
import type { Category, Discount } from "@/lib/types/database";

export const metadata = { title: "Descuentos | Admin" };

type DiscountRow = Discount & {
  product: { name: string } | null;
  category: { name: string } | null;
};

export default async function DescuentosAdminPage() {
  const supabase = await createClient();

  const [{ data: rawProducts }, { data: rawCategories }, { data: rawDiscounts }] =
    await Promise.all([
      supabase.from("products").select("id, name").order("name"),
      supabase.from("categories").select("*").order("display_order"),
      supabase
        .from("discounts")
        .select("*, product:products(name), category:categories(name)")
        .order("created_at", { ascending: false }),
    ]);

  const products = (rawProducts ?? []) as { id: number; name: string }[];
  const categories = (rawCategories ?? []) as Category[];
  const discounts = (rawDiscounts ?? []) as DiscountRow[];

  return (
    <div className="max-w-4xl">
      <h1 className="mb-2 font-display text-4xl tracking-widest">DESCUENTOS</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Aplicá descuentos a un producto, a una categoría entera o creá cupones para
        tus clientes. El precio rebajado se muestra solo en la tienda.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Crear */}
        <section className="lg:col-span-2">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
              <Tag size={16} /> Nuevo descuento
            </h2>
            <DiscountForm products={products} categories={categories} />
          </div>
        </section>

        {/* Listado */}
        <section className="lg:col-span-3">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Descuentos activos y pasados
          </h2>
          {discounts.length === 0 ? (
            <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-500">
              Todavía no creaste ningún descuento.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {discounts.map((d) => (
                <DiscountItem key={d.id} discount={d} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function DiscountItem({ discount: d }: { discount: DiscountRow }) {
  const Icon = d.scope === "product" ? Package : d.scope === "category" ? FolderTree : Ticket;

  const target =
    d.scope === "product"
      ? d.product?.name ?? "Producto eliminado"
      : d.scope === "category"
        ? d.category?.name ?? "Categoría eliminada"
        : (d.code ?? "").toUpperCase();

  const valueLabel =
    d.value_type === "percent" ? `${d.value}% OFF` : `${formatPrice(d.value)} OFF`;

  const couponMeta =
    d.scope === "coupon"
      ? [
          d.ends_at ? `vence ${new Date(d.ends_at).toLocaleDateString("es-AR")}` : null,
          d.max_uses ? `${d.uses_count}/${d.max_uses} usos` : `${d.uses_count} usos`,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border bg-neutral-900 p-4 ${
        d.is_active ? "border-neutral-800" : "border-neutral-800/50 opacity-60"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          d.is_active ? "bg-red-600/15 text-red-400" : "bg-neutral-800 text-neutral-500"
        }`}
      >
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-100">
          {target} <span className="ml-1 text-red-500">{valueLabel}</span>
        </p>
        <p className="text-xs text-neutral-500">
          {d.scope === "product" ? "Producto" : d.scope === "category" ? "Categoría" : "Cupón"}
          {couponMeta ? ` · ${couponMeta}` : ""}
        </p>
      </div>

      <form action={setDiscountActive.bind(null, d.id, !d.is_active)}>
        <button
          type="submit"
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
            d.is_active
              ? "border-green-800 bg-green-950/40 text-green-300 hover:bg-green-950/70"
              : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          {d.is_active ? "Activo" : "Pausado"}
        </button>
      </form>

      <form action={deleteDiscount.bind(null, d.id)}>
        <button
          type="submit"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-red-950 hover:text-red-300"
          aria-label="Eliminar descuento"
        >
          <Trash2 size={14} />
        </button>
      </form>
    </li>
  );
}
