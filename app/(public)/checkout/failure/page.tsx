import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata = {
  title: "Pago rechazado | Código Rojo",
};

export default function FailurePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-32 text-center">
      <XCircle size={56} className="text-red-500" />
      <div>
        <h1 className="font-display text-5xl tracking-widest">PAGO RECHAZADO</h1>
        <p className="mt-3 text-neutral-400">
          No pudimos procesar tu pago. No te preocupes, no se hizo ningún cobro.
          Podés intentar de nuevo desde el carrito.
        </p>
      </div>
      <Link
        href="/carrito"
        className="rounded-lg bg-red-600 px-8 py-3 text-sm font-bold tracking-wider uppercase text-white hover:bg-red-700 transition-colors"
      >
        Volver al carrito
      </Link>
    </div>
  );
}
