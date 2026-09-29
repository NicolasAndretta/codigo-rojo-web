"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Package,
  ClipboardList,
  Store,
  FolderTree,
  Tag,
  CreditCard,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
};

// Fuente única de verdad: desktop y mobile usan estos mismos links.
const LINKS: NavLink[] = [
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { href: "/admin/descuentos", label: "Descuentos", icon: Tag },
  { href: "/admin/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/admin/cobros", label: "Cobros", icon: CreditCard },
  { href: "/catalogo", label: "Ver tienda", icon: Store, muted: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // El drawer se cierra en el onClick de cada link, no en un efecto que mire
  // `pathname`. Cerrar desde un efecto es reaccionar a un cambio que ya provocó
  // un render — React lo desaconseja y el linter lo marca (react-hooks/
  // set-state-in-effect). Cerrarlo donde ocurre la navegación es directo y no
  // encadena renders.

  // Bloquear el scroll del body y cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
        {LINKS.map(({ href, label, icon: Icon, muted }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 transition-colors ${
                active
                  ? "text-red-500"
                  : muted
                    ? "text-neutral-500 hover:text-neutral-300"
                    : "text-neutral-300 hover:text-neutral-50"
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}
      </nav>

      {/* Botón hamburguesa (solo mobile) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="-mr-1 rounded-lg p-2 text-neutral-200 transition-colors hover:bg-neutral-900 md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Overlay + Drawer (solo mobile) */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Panel */}
        <aside
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[82%] flex-col border-l border-neutral-800 bg-neutral-950 shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
            <span className="flex items-center gap-2.5">
              <Image
                src="/images/branding/logo-codigo-rojo.png"
                alt="Código Rojo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="font-display text-lg tracking-widest text-neutral-100">
                ADMIN
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-neutral-100"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {LINKS.map(({ href, label, icon: Icon, muted }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium transition-colors ${
                    active
                      ? "border-l-2 border-red-600 bg-red-950/30 text-red-400"
                      : muted
                        ? "text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
                        : "text-neutral-200 hover:bg-neutral-900 hover:text-neutral-50"
                  }`}
                >
                  <Icon size={18} /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>
    </>
  );
}
