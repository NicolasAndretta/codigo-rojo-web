"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { logout } from "@/lib/auth/actions";

type Props = {
  email: string;
  isAdmin: boolean;
};

export default function AccountMenu({ email, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-50 transition-colors"
        aria-label="Mi cuenta"
      >
        <User size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl">
          <div className="border-b border-neutral-800 px-4 py-3">
            <p className="text-xs text-neutral-500">Conectado como</p>
            <p className="truncate text-sm text-neutral-200">{email}</p>
          </div>

          <div className="py-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-neutral-800 hover:text-red-300 transition-colors"
              >
                <LayoutDashboard size={16} />
                Panel admin
              </Link>
            )}

            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50 transition-colors"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
