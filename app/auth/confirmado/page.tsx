import Link from "next/link";
import { CheckCircle } from "lucide-react";

export const metadata = {
  title: "Cuenta confirmada | Código Rojo",
};

export default function ConfirmadoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <CheckCircle size={56} className="text-green-500" />
      <div>
        <h1 className="font-display text-5xl tracking-widest">CUENTA CONFIRMADA</h1>
        <p className="mt-3 text-neutral-400">
          Tu email fue verificado. Ya podés iniciar sesión y comprar.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-red-600 px-8 py-3 text-sm font-bold tracking-widest uppercase text-white hover:bg-red-700 transition-colors"
      >
        Iniciar sesión
      </Link>
    </div>
  );
}
