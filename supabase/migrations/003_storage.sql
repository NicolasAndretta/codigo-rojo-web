-- ============================================================
-- Código Rojo — Storage para fotos de productos
-- Ejecutar en Supabase SQL Editor después de 002.
-- ============================================================

-- Bucket público para imágenes de producto
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Escritura/borrado sólo admins (reusa is_admin() de 001)
create policy "product_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ============================================================
-- Recordatorio: convertir a tu prima en admin (una sola vez)
-- update public.profiles set role = 'admin' where email = '<su-email>';
-- ============================================================
