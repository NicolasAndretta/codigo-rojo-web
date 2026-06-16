import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { ProductWithVariants } from "@/lib/types/database";
import ProductDetail from "./ProductDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", Number(id))
    .single<{ name: string; description: string | null }>();

  if (!data) return { title: "Producto no encontrado" };

  return {
    title: `${data.name} | Código Rojo`,
    description: data.description ?? undefined,
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

  return <ProductDetail product={sorted} />;
}
