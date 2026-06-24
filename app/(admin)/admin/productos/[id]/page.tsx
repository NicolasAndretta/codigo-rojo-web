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
import CategorySelect from "@/components/admin/CategorySelect";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import { totalStock as sumStock } from "@/lib/utils/stock";
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
    supabase.from("categories").select("*").order("display_order"),
  ]);

  if (!productData) notFound();

  const product = productData as Product & { variants: ProductVariant[] };
  const categories = (rawCategories ?? []) as Category[];
  // Defensivo: si por datos inconsistentes faltan variantes o el array de
  // imágenes quedó con huecos, no debe romper la página (la prima vio un
  // "server error" en una de estas rutas). Normalizamos acá.
  const variants = [...(product.variants ?? [])].sort(
    (a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)
  );
  // En el editor las posiciones importan (slot 0 = prenda, slot 1 = modelo),
  // así que NO compactamos; solo nos aseguramos de tener un array (null-safe).
  const images = product.images ?? [];
  const outOfStock = sumStock(variants) === 0;
  const canPublish = !!images[0]; // requiere foto de la prenda (slot 0)

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
        {!product.is_active && !canPublish ? (
          <span
            className="shrink-0 cursor-not-allowed rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600"
            title="Subí la foto de la prenda para poder publicar"
          >
            Subí una foto para activar
          </span>
        ) : (
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
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Detalles */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Detalles
          </h2>
          <SavingForm
            action={updateProduct.bind(null, product.id)}
            successMessage="Detalles guardados"
            className="flex flex-col gap-4"
          >
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
                <CategorySelect categories={categories} defaultValue={product.category_id} />
              </div>
            </div>
            <SubmitButton className="mt-1 self-start rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors">
              Guardar detalles
            </SubmitButton>
          </SavingForm>
        </section>

        {/* Stock por talle */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
              Stock por talle
            </h2>
            {outOfStock && (
              <span className="inline-flex items-center rounded-full border border-red-700 bg-red-950/50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300">
                Sin stock — reponer
              </span>
            )}
          </div>
          {variants.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Este producto no tiene talles cargados.
            </p>
          ) : (
          <SavingForm
            action={setProductStock.bind(null, product.id)}
            successMessage="Stock actualizado"
          >
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
            <SubmitButton className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors">
              Guardar stock
            </SubmitButton>
          </SavingForm>
          )}
        </section>

        {/* Fotos */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Fotos
          </h2>
          <p className="mb-5 text-xs text-neutral-500">
            La foto de la prenda es obligatoria para publicar. La foto con modelo es opcional.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <PhotoSlot
              productId={product.id}
              slot={0}
              url={images[0]}
              title="Foto de la prenda"
              badge="Obligatoria"
              badgeClass="bg-red-600/15 text-red-300 border-red-900"
            />
            <PhotoSlot
              productId={product.id}
              slot={1}
              url={images[1]}
              title="Foto con modelo"
              badge="Opcional"
              badgeClass="bg-neutral-800 text-neutral-400 border-neutral-700"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function PhotoSlot({
  productId,
  slot,
  url,
  title,
  badge,
  badgeClass,
}: {
  productId: number;
  slot: number;
  url?: string;
  title: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-300">{title}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      {url ? (
        <div className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-neutral-700">
          <Image src={url} alt={title} fill className="object-cover" sizes="200px" />
          <form
            action={removeProductImage.bind(null, productId, slot)}
            className="absolute right-2 top-2"
          >
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded bg-neutral-950/80 text-red-400 transition-colors hover:bg-red-950 hover:text-red-300"
              aria-label={`Eliminar ${title}`}
            >
              <Trash2 size={14} />
            </button>
          </form>
        </div>
      ) : (
        <form
          action={uploadProductImage.bind(null, productId, slot)}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-700 p-4 text-center"
        >
          <Upload size={22} className="text-neutral-500" />
          <input
            name="image"
            type="file"
            accept="image/*"
            required
            className="block w-full text-xs text-neutral-400 file:mr-2 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-200 hover:file:bg-neutral-700"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700"
          >
            Subir foto
          </button>
        </form>
      )}
    </div>
  );
}
