"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProductSize, OrderStatus } from "@/lib/types/database";

const ALL_SIZES: ProductSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
];

// ---------- Productos ----------

export async function createProduct(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const categoryRaw = formData.get("category_id");
  const categoryId = categoryRaw ? Number(categoryRaw) : null;

  if (!name || price <= 0) {
    throw new Error("Nombre y precio (mayor a 0) son obligatorios");
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name,
      description: description || null,
      price,
      category_id: categoryId,
      is_active: false,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !product) {
    throw new Error("No se pudo crear el producto");
  }

  // Crear las variantes (talles) con stock 0 para gestionarlas en la edición
  await supabase
    .from("product_variants")
    .insert(ALL_SIZES.map((size) => ({ product_id: product.id, size, stock: 0 })));

  revalidatePath("/admin/productos");
  redirect(`/admin/productos/${product.id}`);
}

export async function updateProduct(id: number, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const categoryRaw = formData.get("category_id");
  const categoryId = categoryRaw ? Number(categoryRaw) : null;

  if (!name || price <= 0) {
    throw new Error("Nombre y precio (mayor a 0) son obligatorios");
  }

  await supabase
    .from("products")
    .update({ name, description: description || null, price, category_id: categoryId })
    .eq("id", id);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function setProductStock(id: number, formData: FormData) {
  const supabase = await createClient();

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id)
    .returns<{ id: number }[]>();

  for (const v of variants ?? []) {
    const raw = formData.get(`stock_${v.id}`);
    if (raw !== null) {
      const stock = Math.max(0, Math.floor(Number(raw) || 0));
      await supabase.from("product_variants").update({ stock }).eq("id", v.id);
    }
  }

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function uploadProductImage(id: number, formData: FormData) {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return;

  const supabase = await createClient();

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${id}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (upErr) {
    throw new Error("No se pudo subir la imagen");
  }

  const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);

  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single<{ images: string[] }>();

  const images = [...(product?.images ?? []), pub.publicUrl];
  await supabase.from("products").update({ images }).eq("id", id);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function removeProductImage(id: number, url: string) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single<{ images: string[] }>();

  const images = (product?.images ?? []).filter((u) => u !== url);
  await supabase.from("products").update({ images }).eq("id", id);

  // Borrar del storage (best-effort)
  const marker = "/product-images/";
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const storagePath = url.slice(idx + marker.length);
    await supabase.storage.from("product-images").remove([storagePath]);
  }

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function toggleProductActive(id: number, next: boolean) {
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: next }).eq("id", id);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

// ---------- Órdenes ----------

export async function updateOrderStatus(id: number, formData: FormData) {
  const supabase = await createClient();
  const status = String(formData.get("status") ?? "") as OrderStatus;

  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Estado inválido");
  }

  await supabase.from("orders").update({ status }).eq("id", id);

  revalidatePath(`/admin/ordenes/${id}`);
  revalidatePath("/admin/ordenes");
}
