import Link from "next/link";
import Image from "next/image";
import CartButton from "./CartButton";
import AccountMenu from "./AccountMenu";

type Props = {
  user: { email: string; isAdmin: boolean } | null;
};

export default function Navbar({ user }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href="/catalogo"
          aria-label="Código Rojo — Inicio"
          className="group flex items-center transition-opacity hover:opacity-90"
        >
          <Image
            src="/images/branding/logo-codigo-rojo.png"
            alt="Código Rojo"
            width={48}
            height={48}
            priority
            className="h-11 w-11 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
          />
          <span className="ml-2.5 hidden font-display text-2xl leading-none tracking-widest text-neutral-50 sm:block">
            CÓDIGO <span className="text-red-600">ROJO</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wider uppercase">
          <Link
            href="/catalogo"
            className="text-neutral-300 hover:text-neutral-50 transition-colors"
          >
            Catálogo
          </Link>
          <Link
            href="/catalogo#sobre-la-marca"
            className="text-neutral-300 hover:text-neutral-50 transition-colors"
          >
            La Marca
          </Link>
        </nav>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          <CartButton />
          {/* El login es solo para administración: no se ofrece al comprador.
              Si hay sesión admin activa, mostramos el acceso al panel. */}
          {user && <AccountMenu email={user.email} isAdmin={user.isAdmin} />}
        </div>
      </div>
    </header>
  );
}
