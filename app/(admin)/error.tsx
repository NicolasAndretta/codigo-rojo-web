"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft, AlertTriangle } from "lucide-react";

/**
 * Error boundary del panel admin. Antes, si una página tiraba un error
 * (ej: datos inconsistentes en un producto), la prima veía la pantalla
 * cruda "A server error occurred" sin salida. Ahora ve algo claro y puede
 * reintentar o volver, sin quedar trabada.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los logs del server para diagnóstico.
    console.error("[admin] error de página:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40">
        <AlertTriangle size={26} className="text-red-400" />
      </div>
      <h1 className="font-display text-3xl tracking-widest text-neutral-100">
        ALGO FALLÓ
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
        No se pudo cargar esta página. Puede ser algo temporal. Probá de nuevo;
        si sigue fallando, volvé al panel y avisale a Nico.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700"
        >
          <RotateCcw size={16} /> Reintentar
        </button>
        <Link
          href="/admin/productos"
          className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 px-6 py-3 text-sm font-bold uppercase tracking-wider text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-100"
        >
          <ArrowLeft size={16} /> Volver a productos
        </Link>
      </div>
    </div>
  );
}
