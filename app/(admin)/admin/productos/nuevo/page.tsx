import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createProduct } from "@/lib/admin/actions";
import type { Category } from "@/lib/types/database";

export const metadata = { title: "Nuevo producto | Admin" };

export default async function NuevoProductoPage() {
  const supabase = await createClient();
  const { data: rawCategories } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  const categories = (rawCategories ?? []) as Category[];

  return (
    <div className="max-w-xl">
      <Link
        href="/admin/productos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} /> Volver
      </Link>

      <h1 className="mb-6 font-display text-4xl tracking-widest">NUEVO PRODUCTO</h1>

      <form action={createProduct} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Nombre
          </label>
          <input
            name="name"
            required
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Descripción
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full resize-none rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Precio (ARS)
            </label>
            <input
              name="price"
              type="number"
              min="0"
              step="1"
              required
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Categoría
            </label>
            <select
              name="category_id"
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Se crea oculto. Después cargás stock por talle y fotos, y lo activás.
        </p>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
        >
          Crear producto
        </button>
      </form>
    </div>
  );
}
