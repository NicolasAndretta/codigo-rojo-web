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

// Regla de negocio (Código Rojo): cada producto admite hasta 2 fotos.
//   slot 0 = foto de la prenda sola  (OBLIGATORIA para publicar)
//   slot 1 = foto con modelo puesta  (OPCIONAL)
// Las fotos se manejan posicionalmente sobre products.images[].
const MAX_PRODUCT_IMAGES = 2;

function storagePathFromUrl(url: string): string | null {
  const marker = "/product-images/";
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

export async function uploadProductImage(id: number, slot: number, formData: FormData) {
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return;
  if (slot < 0 || slot >= MAX_PRODUCT_IMAGES) return;

  const supabase = await createClient();

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${id}/${Date.now()}-${slot}.${ext}`;

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

  const images = [...(product?.images ?? [])];
  const previousUrl = images[slot];
  images[slot] = pub.publicUrl;
  await supabase.from("products").update({ images }).eq("id", id);

  // Si reemplazamos una foto, borramos la anterior del storage (best-effort)
  if (previousUrl) {
    const prevPath = storagePathFromUrl(previousUrl);
    if (prevPath) await supabase.storage.from("product-images").remove([prevPath]);
  }

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function removeProductImage(id: number, slot: number) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single<{ images: string[] }>();

  const images = [...(product?.images ?? [])];
  const url = images[slot];
  if (!url) return;

  images.splice(slot, 1); // al quitar la prenda, la foto con modelo pasa a principal
  await supabase.from("products").update({ images }).eq("id", id);

  const path = storagePathFromUrl(url);
  if (path) await supabase.storage.from("product-images").remove([path]);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function toggleProductActive(id: number, next: boolean) {
  const supabase = await createClient();

  // Guardia: no se puede publicar sin la foto de la prenda (slot 0).
  if (next) {
    const { data: product } = await supabase
      .from("products")
      .select("images")
      .eq("id", id)
      .single<{ images: string[] }>();
    if (!product?.images?.[0]) return; // la UI ya lo impide; esto es defensa extra
  }

  await supabase.from("products").update({ is_active: next }).eq("id", id);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

// ---------- Categorías ----------

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sacar acentos (marcas combinantes)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const parentRaw = formData.get("parent_id");
  const parentId = parentRaw ? Number(parentRaw) : null;

  if (!name) {
    throw new Error("El nombre es obligatorio");
  }

  // Slug único: si choca, le agregamos un sufijo numérico.
  const base = slugify(name) || "categoria";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  // display_order: al final dentro de su nivel (raíz o hijas de un padre)
  const siblingsQuery = supabase
    .from("categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const { data: siblings } =
    parentId === null
      ? await siblingsQuery.is("parent_id", null)
      : await siblingsQuery.eq("parent_id", parentId);
  const nextOrder = ((siblings?.[0]?.display_order as number | undefined) ?? 0) + 1;

  await supabase.from("categories").insert({
    name,
    slug,
    parent_id: parentId,
    display_order: nextOrder,
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
}

export async function deleteCategory(id: number) {
  const supabase = await createClient();
  // ON DELETE CASCADE borra subcategorías; los productos quedan sin categoría.
  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/admin/categorias");
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
