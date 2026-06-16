import Link from "next/link";
import { Clock } from "lucide-react";

export const metadata = {
  title: "Pago pendiente | Código Rojo",
};

export default function PendingPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-32 text-center">
      <Clock size={56} className="text-amber-500" />
      <div>
        <h1 className="font-display text-5xl tracking-widest">PAGO PENDIENTE</h1>
        <p className="mt-3 text-neutral-400">
          Tu pago está siendo procesado. Cuando se acredite vas a recibir un
          email de confirmación. Esto puede demorar unos minutos.
        </p>
      </div>
      <Link
        href="/catalogo"
        className="rounded-lg border border-neutral-700 px-8 py-3 text-sm font-bold tracking-wider uppercase text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
