import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/format";
import type { Product, ProductVariant } from "@/lib/types/database";

export const metadata = { title: "Productos | Admin" };

type Row = Product & { variants: ProductVariant[] };

export default async function ProductosAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Row[];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-4xl tracking-widest">PRODUCTOS</h1>
        <Link
          href="/admin/productos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
        >
          <Plus size={16} /> Nuevo
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">
          Todavía no hay productos. Creá el primero.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          {products.map((p) => {
            const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
            return (
              <Link
                key={p.id}
                href={`/admin/productos/${p.id}`}
                className="flex items-center gap-4 border-b border-neutral-800 bg-neutral-900 p-3 last:border-b-0 hover:bg-neutral-800/60 transition-colors"
              >
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded bg-neutral-800">
                  {p.images[0] ? (
                    <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-600">
                      —
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-neutral-100">{p.name}</p>
                  <p className="text-sm text-neutral-500">{formatPrice(p.price)}</p>
                </div>

                <div className="text-right text-sm">
                  <p className={totalStock > 0 ? "text-neutral-300" : "text-red-400"}>
                    {totalStock} en stock
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                    p.is_active
                      ? "border-green-800 bg-green-950/40 text-green-300"
                      : "border-neutral-700 bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {p.is_active ? "Activo" : "Oculto"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
