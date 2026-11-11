-- ============================================================
-- 014 — La franja de anuncios de arriba de la tienda
--
-- Agustina escribe sus mensajes desde el panel (Anuncio) y los prende o
-- apaga. El del descuento por transferencia se arma solo con el % de Cobros
-- (anuncio_descuento), así no lo tiene que escribir ni actualizar.
--
-- Va en tienda_config (la fila única de la 012): misma lectura pública, y
-- escribe solo el servidor después de chequear que sea admin.
-- Sin estas columnas la tienda igual anda: muestra solo el del descuento.
-- ============================================================

alter table public.tienda_config
  add column if not exists anuncio_activo    boolean not null default false,
  add column if not exists anuncio_mensajes  text[]  not null default '{}',
  add column if not exists anuncio_descuento boolean not null default true;

notify pgrst, 'reload schema';
