import AnuncioForm from "@/components/admin/AnuncioForm";
import { configDesdeFila, textoDescuento } from "@/lib/pagos/precios";
import { createServiceClient } from "@/lib/supabase/admin";
import type { TiendaConfig } from "@/lib/types/database";

export const metadata = { title: "Anuncio | Admin" };

export default async function AnuncioPage() {
  const { data: fila, error } = await createServiceClient()
    .from("tienda_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle<TiendaConfig>();
  // Sin la migración 014 las columnas del anuncio no vienen.
  const faltaMigracion = Boolean(error) || !fila || fila.anuncio_mensajes === undefined;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-4xl tracking-widest">ANUNCIO</h1>
      <p className="mb-8 text-sm text-neutral-500">
        La franja fina de arriba de toda la tienda. Sirve para promos, envíos, un drop nuevo: lo cambiás
        cuando quieras y se ve al instante.
      </p>

      {faltaMigracion ? (
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
          Falta un paso técnico para poder escribir tus mensajes. Avisale a Nico.
        </section>
      ) : (
        <AnuncioForm
          activo={fila.anuncio_activo ?? false}
          mensajes={fila.anuncio_mensajes ?? []}
          descuento={fila.anuncio_descuento ?? true}
          textoDescuento={textoDescuento(configDesdeFila(fila))}
        />
      )}
    </div>
  );
}
