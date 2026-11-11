"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { borrarProducto } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Borrar una prenda que nunca se vendió, en dos pasos: primero se pide
 * confirmar, porque no se puede deshacer. La página solo lo muestra si la
 * prenda no tiene pedidos; la action lo vuelve a revisar igual.
 */
export default function BorrarProducto({ id, nombre }: { id: number; nombre: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function borrar() {
    setMotivo(null);
    startTransition(async () => {
      try {
        const r = await borrarProducto(id);
        if (r.ok) {
          toast.success("Prenda borrada");
          router.push("/admin/productos");
          router.refresh();
          return;
        }
        setMotivo(r.motivo);
      } catch {
        setMotivo("No se pudo borrar. Probá de nuevo.");
      }
      setConfirmando(false);
    });
  }

  return (
    <div>
      {!confirmando ? (
        <button
          type="button"
          onClick={() => {
            setMotivo(null);
            setConfirmando(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-950/60"
        >
          <Trash2 size={16} /> Borrar prenda
        </button>
      ) : (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-4">
          <p className="text-sm text-neutral-200">
            ¿Borrar <strong>{nombre}</strong>? Se borran también sus talles, el stock y las fotos.{" "}
            <strong className="text-red-300">No se puede deshacer.</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={borrar}
              disabled={pendiente}
              aria-busy={pendiente}
              className={`rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700 ${
                pendiente ? "cursor-wait opacity-70" : ""
              }`}
            >
              {pendiente ? "Borrando…" : "Sí, borrar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={pendiente}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {motivo && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {motivo}
        </p>
      )}
    </div>
  );
}
