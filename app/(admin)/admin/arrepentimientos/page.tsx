import { notFound } from "next/navigation";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import { esAdmin } from "@/lib/admin/sesion";
import { marcarArrepentimientoResuelto } from "@/lib/admin/cobros";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Arrepentimiento } from "@/lib/types/database";

export const metadata = { title: "Arrepentimientos | Admin" };
export const dynamic = "force-dynamic";

// Los pedidos del botón de arrepentimiento (migración 013). La tabla tiene
// datos de contacto y la lee solo el servidor: por eso el chequeo de admin
// está acá además de en el layout.
export default async function ArrepentimientosPage() {
  if (!(await esAdmin())) notFound();

  const { data, error } = await createServiceClient()
    .from("arrepentimientos")
    .select("*")
    .order("creado_el", { ascending: false })
    .limit(200)
    .returns<Arrepentimiento[]>();

  const lista = data ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 font-display text-4xl tracking-widest">ARREPENTIMIENTOS</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Los pedidos del «Botón de arrepentimiento» de la tienda. Cada cliente ya recibió su código en pantalla.
        Escribile para coordinar la devolución: por ley tiene 10 días desde que recibió la compra, y el envío de
        vuelta lo paga la tienda.
      </p>

      {error ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
          Falta un paso técnico para ver esta sección. Avisale a Nico.
        </p>
      ) : lista.length === 0 ? (
        <p className="py-16 text-center text-neutral-500">No hay pedidos de arrepentimiento.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((a) => (
            <section
              key={a.id}
              className={`rounded-lg border p-5 text-sm ${
                a.estado === "nuevo" ? "border-amber-600/60 bg-amber-950/20" : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold tracking-wider text-neutral-100">{a.codigo}</p>
                <span className={`text-xs font-semibold ${a.estado === "nuevo" ? "text-amber-300" : "text-green-400"}`}>
                  {a.estado === "nuevo" ? "● Para resolver" : "✓ Resuelto"}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(a.creado_el).toLocaleString("es-AR", {
                  timeZone: "America/Argentina/Buenos_Aires",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {a.numero_pedido ? ` · Pedido ${a.numero_pedido}` : ""}
              </p>
              <p className="mt-3 text-neutral-200">
                {a.nombre} ·{" "}
                <a
                  href={`https://wa.me/${a.telefono.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  {a.telefono}
                </a>
                {a.email && <span className="block break-all text-neutral-500">{a.email}</span>}
              </p>
              {a.motivo && <p className="mt-2 whitespace-pre-line break-words text-neutral-400">{a.motivo}</p>}
              {a.estado === "nuevo" && (
                <SavingForm
                  action={marcarArrepentimientoResuelto.bind(null, a.id)}
                  successMessage="Marcado como resuelto"
                  className="mt-4"
                >
                  <SubmitButton
                    pendingLabel="Guardando…"
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-bold text-neutral-200 transition-colors hover:bg-neutral-800"
                  >
                    Marcar como resuelto
                  </SubmitButton>
                </SavingForm>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
