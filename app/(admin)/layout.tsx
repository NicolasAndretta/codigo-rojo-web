import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ClipboardList, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defensa en profundidad: el proxy ya protege /admin, pero revalidamos acá.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") redirect("/catalogo");

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar admin */}
      <header className="border-b border-neutral-800 bg-neutral-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/admin"
            className="font-display text-2xl tracking-widest text-red-600"
          >
            CÓDIGO ROJO · ADMIN
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/admin/productos"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <Package size={16} /> Productos
            </Link>
            <Link
              href="/admin/ordenes"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <ClipboardList size={16} /> Órdenes
            </Link>
            <Link
              href="/catalogo"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <Store size={16} /> Ver tienda
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
