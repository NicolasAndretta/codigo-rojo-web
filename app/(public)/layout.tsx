import Navbar from "@/components/Navbar";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CartProvider } from "@/lib/context/CartContext";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser: { email: string; isAdmin: boolean } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<{ role: string }>();
    navUser = {
      email: user.email ?? "",
      isAdmin: profile?.role === "admin",
    };
  }

  return (
    <CartProvider>
      <Navbar user={navUser} />
      <main className="flex-1">{children}</main>
      <WhatsAppFloat />
      <footer className="border-t border-neutral-800 py-10 text-center">
        <p className="font-display text-2xl tracking-[0.3em] text-neutral-200">
          CÓDIGO <span className="text-red-600">ROJO</span>
        </p>
        <p className="mt-1 font-display text-xs tracking-[0.35em] text-neutral-500">
          TU ESTILO, BAJO CONTROL.
        </p>
        <p className="mt-4 text-sm text-neutral-500">
          © {new Date().getFullYear()} Código Rojo —{" "}
          <a
            href="https://www.instagram.com/codigorojo.ind"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-500 transition-colors"
          >
            @codigorojo.ind
          </a>
        </p>
      </footer>
    </CartProvider>
  );
}
