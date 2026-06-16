import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/catalog/ProductCard";
import CategoryPills from "@/components/catalog/CategoryPills";
import SizeFilter from "@/components/catalog/SizeFilter";
import type { Category, ProductWithVariants } from "@/lib/types/database";

type SearchParams = {
  category?: string;
  size?: string;
};

export const metadata = {
  title: "Catálogo | Código Rojo",
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { category, size } = await searchParams;
  const supabase = await createClient();

  const { data: rawCategories } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  const categories = (rawCategories ?? []) as Category[];

  // Obtener todos los productos activos con sus variantes y categoría
  let query = supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Filtro por categoría
  if (category && category !== "todos") {
    const cat = categories.find((c) => c.slug === category);
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  const { data: rawProducts } = await query;
  let products = (rawProducts ?? []) as ProductWithVariants[];

  // Filtro por talle con stock (client-side del servidor)
  if (size) {
    products = products.filter((p) =>
      p.variants.some((v) => v.size === size && v.stock > 0)
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-800/80">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
            Streetwear Argentina
          </p>
          <h1 className="font-display text-6xl leading-[0.9] tracking-tight text-neutral-50 sm:text-8xl md:text-9xl">
            VESTÍ EL<br />
            <span className="text-red-600">CÓDIGO.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-neutral-400">
            Prendas urbanas con identidad. Diseños limitados, hechos para la calle.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Filtros */}
        <div className="mb-8 flex flex-col gap-4 border-b border-neutral-800/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Suspense>
            <CategoryPills categories={categories} />
          </Suspense>
          <Suspense>
            <SizeFilter />
          </Suspense>
        </div>

        <p className="mb-6 text-xs font-medium uppercase tracking-widest text-neutral-500">
          {products.length} {products.length === 1 ? "producto" : "productos"}
        </p>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <p className="font-display text-4xl tracking-widest text-neutral-700">
              SIN RESULTADOS
            </p>
            <p className="text-sm text-neutral-500">
              Probá con otro talle o categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Sobre la marca */}
      <section
        id="sobre-la-marca"
        className="scroll-mt-20 border-t border-neutral-800/80 bg-neutral-950"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              La marca
            </p>
            <h2 className="font-display text-5xl tracking-tight text-neutral-50 sm:text-6xl">
              CÓDIGO ROJO
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-neutral-400">
              Nacimos en la calle, con la idea de que la ropa también habla. Cada
              prenda lleva una identidad: calaveras, ángeles y bandas que cuentan
              una historia. Producción limitada, calidad real, actitud urbana.
            </p>
            <a
              href="https://www.instagram.com/codigorojo.ind"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block text-sm font-semibold text-red-500 hover:text-red-400 transition-colors"
            >
              Seguinos en Instagram →
            </a>
          </div>

          {/* Envíos */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: "Retiro en local", d: "Coordinás por WhatsApp y retirás sin costo." },
              { t: "Envío a domicilio", d: "Envíos dentro de CABA. Coordinamos el envío con vos." },
              { t: "Pago seguro", d: "Pagás con MercadoPago: tarjeta, débito o efectivo." },
              { t: "Atención directa", d: "Te escribimos por WhatsApp en cada compra." },
            ].map((item) => (
              <div
                key={item.t}
                className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-neutral-100">
                  {item.t}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                  {item.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
