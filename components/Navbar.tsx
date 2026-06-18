import Link from "next/link";
import CartButton from "./CartButton";
import AccountMenu from "./AccountMenu";

type Props = {
  user: { email: string; isAdmin: boolean } | null;
};

export default function Navbar({ user }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        {/* Logo */}
        <Link
          href="/catalogo"
          className="font-display text-3xl tracking-widest text-red-600 hover:text-red-500 transition-colors"
        >
          CÓDIGO ROJO
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
