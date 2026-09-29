import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { ProductWithVariants } from "@/lib/types/database";
import { fetchActiveDiscounts } from "@/lib/discounts/server";
import { effectivePrice } from "@/lib/discounts/pricing";
import ProductDetail from "./ProductDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // Solo productos activos: antes esto devolvía el nombre de un producto oculto
  // a cualquiera que probara su número en la URL.
  const { data } = await supabase
    .from("products")
    .select("name, description, images")
    .eq("id", Number(id))
    .eq("is_active", true)
    .single<{ name: string; description: string | null; images: string[] | null }>();

  if (!data) return { title: "Producto no encontrado" };

  const descripcion = data.description ?? `${data.name}. Streetwear argentino en Código Rojo.`;
  // La foto de la prenda es lo que se ve cuando alguien comparte el link por
  // WhatsApp o Instagram. Sin foto, queda la imagen general de la marca.
  const foto = (data.images ?? []).find(Boolean);

  return {
    title: `${data.name} | Código Rojo`,
    description: descripcion,
    alternates: { canonical: `/producto/${id}` },
    openGraph: {
      title: `${data.name} | Código Rojo`,
      description: descripcion,
      url: `/producto/${id}`,
      ...(foto ? { images: [{ url: foto, alt: data.name }] } : {}),
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, category:categories(*), variants:product_variants(*)")
    .eq("id", Number(id))
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  // Ordenar variantes por talle
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
  const sorted = {
    ...(product as ProductWithVariants),
    variants: [...(product as ProductWithVariants).variants].sort(
      (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
    ),
  };

  const discounts = await fetchActiveDiscounts(supabase);
  const price = effectivePrice(sorted, discounts, sorted.id);

  return <ProductDetail product={sorted} price={price} />;
}
