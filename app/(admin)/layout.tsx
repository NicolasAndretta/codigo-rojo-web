import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";
import ToastProvider from "@/components/ui/Toast";

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
    <ToastProvider>
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
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
    </ToastProvider>
  );
}
