import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/catalogo"
        aria-label="Código Rojo — Inicio"
        className="group mb-8 flex flex-col items-center transition-opacity hover:opacity-90"
      >
        <Image
          src="/images/branding/logo-codigo-rojo.png"
          alt="Código Rojo"
          width={64}
          height={64}
          priority
          className="h-16 w-16 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
        />
        <span className="mt-3 font-display text-2xl tracking-widest text-neutral-50">
          CÓDIGO <span className="text-red-600">ROJO</span>
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
