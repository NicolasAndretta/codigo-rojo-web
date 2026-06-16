import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  updateProduct,
  setProductStock,
  uploadProductImage,
  removeProductImage,
  toggleProductActive,
} from "@/lib/admin/actions";
import type { Category, Product, ProductVariant, ProductSize } from "@/lib/types/database";

export const metadata = { title: "Editar producto | Admin" };

const SIZE_ORDER: ProductSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const supabase = await createClient();

  const [{ data: productData }, { data: rawCategories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .eq("id", productId)
      .single(),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!productData) notFound();

  const product = productData as Product & { variants: ProductVariant[] };
  const categories = (rawCategories ?? []) as Category[];
  const variants = [...product.variants].sort(
    (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
  );

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/productos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-200 transition-colors"
      >
        <ArrowLeft size={16} /> Volver
      </Link>

      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl tracking-widest">{product.name.toUpperCase()}</h1>
        <form action={toggleProductActive.bind(null, product.id, !product.is_active)}>
          <button
            type="submit"
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              product.is_active
                ? "border-green-800 bg-green-950/40 text-green-300 hover:bg-green-950/70"
                : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            {product.is_active ? "Activo — ocultar" : "Oculto — activar"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-8">
        {/* Detalles */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Detalles
          </h2>
          <form action={updateProduct.bind(null, product.id)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Nombre
              </label>
              <input
                name="name"
                defaultValue={product.name}
                required
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Descripción
              </label>
              <textarea
                name="description"
                defaultValue={product.description ?? ""}
                rows={3}
                className="w-full resize-none rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
                  defaultValue={product.price}
                  required
                  className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Categoría
                </label>
                <select
                  name="category_id"
                  defaultValue={product.category_id ?? ""}
                  className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
            <button
              type="submit"
              className="mt-1 self-start rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
            >
              Guardar detalles
            </button>
          </form>
        </section>

        {/* Stock por talle */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Stock por talle
          </h2>
          <form action={setProductStock.bind(null, product.id)}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {variants.map((v) => (
                <div key={v.id}>
                  <label className="mb-1 block text-center text-xs font-bold text-neutral-400">
                    {v.size}
                  </label>
                  <input
                    name={`stock_${v.id}`}
                    type="number"
                    min="0"
                    defaultValue={v.stock}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-center text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
            >
              Guardar stock
            </button>
          </form>
        </section>

        {/* Fotos */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Fotos
          </h2>

          {product.images.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              {product.images.map((url) => (
                <div key={url} className="relative h-28 w-24 overflow-hidden rounded border border-neutral-700">
                  <Image src={url} alt={product.name} fill className="object-cover" sizes="96px" />
                  <form
                    action={removeProductImage.bind(null, product.id, url)}
                    className="absolute right-1 top-1"
                  >
                    <button
                      type="submit"
                      className="flex h-6 w-6 items-center justify-center rounded bg-neutral-950/80 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors"
                      aria-label="Eliminar foto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={uploadProductImage.bind(null, product.id)} className="flex items-center gap-3">
            <input
              name="image"
              type="file"
              accept="image/*"
              required
              className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-200 hover:file:bg-neutral-700"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-neutral-500 transition-colors"
            >
              <Upload size={16} /> Subir
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
