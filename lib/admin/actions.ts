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

/**
 * Corta la ejecución si Supabase devolvió error.
 *
 * POR QUÉ EXISTE: hasta el 29/09/2026 estas actions ignoraban el `error` de
 * cada escritura. Como `SavingForm` muestra el toast verde cuando la action NO
 * lanza, el panel decía "Guardado" aunque no se hubiera guardado nada. Ya pasó
 * de verdad: lo documenta la migración 007, donde cambiar el estado de una
 * orden fallaba en silencio por un permiso faltante. Ahí se arregló el permiso,
 * pero no el patrón — así que el siguiente permiso faltante o constraint
 * violado volvía a mentir igual.
 *
 * El mensaje que se lanza es el que ve Agustina, así que va en criollo. La
 * causa real va al log del servidor, que es donde sirve.
 */
function lanzarSi(error: { message: string } | null, mensaje: string): void {
  if (!error) return;
  console.error(`[admin] ${mensaje} — ${error.message}`);
  throw new Error(mensaje);
}

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
  const { error: variantesError } = await supabase
    .from("product_variants")
    .insert(ALL_SIZES.map((size) => ({ product_id: product.id, size, stock: 0 })));
  lanzarSi(variantesError, "El producto se creó pero no se pudieron crear los talles");

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

  const { error } = await supabase
    .from("products")
    .update({ name, description: description || null, price, category_id: categoryId })
    .eq("id", id);
  lanzarSi(error, "No se pudieron guardar los datos del producto");

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function setProductStock(id: number, formData: FormData) {
  const supabase = await createClient();

  const { data: variants, error: leerError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id)
    .returns<{ id: number }[]>();
  lanzarSi(leerError, "No se pudieron leer los talles del producto");

  for (const v of variants ?? []) {
    const raw = formData.get(`stock_${v.id}`);
    if (raw !== null) {
      const stock = Math.max(0, Math.floor(Number(raw) || 0));
      const { error } = await supabase
        .from("product_variants")
        .update({ stock })
        .eq("id", v.id);
      lanzarSi(error, "No se pudo guardar el stock");
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

/**
 * Formatos que aceptamos, y la extensión con la que se guarda cada uno.
 *
 * La extensión sale del TIPO REAL del archivo, no de `file.name`. Confiar en el
 * nombre traía dos problemas: el iPad manda HEIC con `accept="image/*"` y
 * next/image no lo puede renderizar (el mismo tipo de bug que el placeholder
 * SVG que ya rompió una vez), y un nombre cualquiera terminaba de extensión.
 * En la práctica casi todo llega como JPEG porque `lib/image-client.ts` lo
 * convierte al achicarlo; esto cubre el caso en que la foto ya venía chica y
 * se sube tal cual.
 */
const FORMATOS_ACEPTADOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Tope del lado del servidor. El navegador ya achica a ~300 KB; esto es red. */
const MAX_FOTO_BYTES = 4 * 1024 * 1024;

export async function uploadProductImage(id: number, slot: number, formData: FormData) {
  const file = formData.get("image") as File | null;
  // Antes esto hacía `return` a secas: la action terminaba bien, SavingForm
  // mostraba el toast verde, y no se había subido nada.
  if (!file || file.size === 0) {
    throw new Error("No llegó ninguna foto. Probá elegirla de nuevo.");
  }
  if (slot < 0 || slot >= MAX_PRODUCT_IMAGES) {
    throw new Error("Esa posición de foto no existe");
  }

  const ext = FORMATOS_ACEPTADOS[file.type];
  if (!ext) {
    throw new Error(
      "Ese formato de imagen no se puede publicar. Sacá la foto de nuevo o elegí un JPG o PNG."
    );
  }
  if (file.size > MAX_FOTO_BYTES) {
    const mb = Math.round(file.size / 1024 / 1024);
    throw new Error(`La foto pesa ${mb} MB y es demasiado. Probá con otra.`);
  }

  const supabase = await createClient();

  const path = `${id}/${Date.now()}-${slot}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (upErr) {
    console.error(`[admin] No se pudo subir la foto — ${upErr.message}`);
    throw new Error("No se pudo subir la imagen");
  }

  const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);

  const { data: product, error: leerError } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single<{ images: string[] }>();
  lanzarSi(leerError, "La foto se subió pero no se pudo leer el producto");

  const images = [...(product?.images ?? [])];
  // Padear huecos previos con "" para no escribir NULLs en el text[]:
  // subir la foto del slot 1 con el slot 0 vacío dejaba [null, url] en la DB,
  // un array disperso que después rompía el render. "" es falsy y seguro.
  for (let i = 0; i < slot; i++) {
    if (images[i] == null) images[i] = "";
  }
  const previousUrl = images[slot];
  images[slot] = pub.publicUrl;
  const { error: guardarError } = await supabase
    .from("products")
    .update({ images })
    .eq("id", id);
  lanzarSi(guardarError, "La foto se subió pero no se pudo asociar al producto");

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

  const { data: product, error: leerError } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .single<{ images: string[] }>();
  lanzarSi(leerError, "No se pudo leer el producto");

  const images = [...(product?.images ?? [])];
  const url = images[slot];
  if (!url) return;

  images.splice(slot, 1); // al quitar la prenda, la foto con modelo pasa a principal
  const { error } = await supabase.from("products").update({ images }).eq("id", id);
  lanzarSi(error, "No se pudo eliminar la foto");

  const path = storagePathFromUrl(url);
  if (path) await supabase.storage.from("product-images").remove([path]);

  revalidatePath(`/admin/productos/${id}`);
  revalidatePath("/catalogo");
}

export async function toggleProductActive(id: number, next: boolean) {
  const supabase = await createClient();

  // Guardia: no se puede publicar sin la foto de la prenda (slot 0).
  if (next) {
    const { data: product, error: leerError } = await supabase
      .from("products")
      .select("images")
      .eq("id", id)
      .single<{ images: string[] }>();
    lanzarSi(leerError, "No se pudo leer el producto");
    // La UI ya lo impide; esto es defensa extra. Antes hacía `return` y el
    // panel decía "Guardado" sin haber publicado nada.
    if (!product?.images?.[0]) {
      throw new Error("Para publicar el producto falta la foto de la prenda");
    }
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: next })
    .eq("id", id);
  lanzarSi(error, next ? "No se pudo publicar el producto" : "No se pudo ocultar el producto");

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

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    parent_id: parentId,
    display_order: nextOrder,
  });
  lanzarSi(error, "No se pudo crear la categoría");

  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
}

export async function deleteCategory(id: number) {
  const supabase = await createClient();
  // ON DELETE CASCADE borra subcategorías; los productos quedan sin categoría.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  lanzarSi(error, "No se pudo eliminar la categoría");

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

  // Este es EL caso que documenta la migración 007: fallaba en silencio por un
  // permiso faltante y el panel decía "actualizado" igual.
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  lanzarSi(error, "No se pudo cambiar el estado del pedido");

  revalidatePath(`/admin/ordenes/${id}`);
  revalidatePath("/admin/ordenes");
}
