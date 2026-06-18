import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Package, ClipboardList, Store, FolderTree, Tag } from "lucide-react";
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
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image
              src="/images/branding/logo-codigo-rojo.png"
              alt="Código Rojo"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="font-display text-xl tracking-widest text-neutral-100">
              ADMIN
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link
              href="/admin/productos"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <Package size={16} /> Productos
            </Link>
            <Link
              href="/admin/categorias"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <FolderTree size={16} /> Categorías
            </Link>
            <Link
              href="/admin/descuentos"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <Tag size={16} /> Descuentos
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
