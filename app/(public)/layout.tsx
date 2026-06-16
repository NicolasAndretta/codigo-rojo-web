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
      <footer className="border-t border-neutral-800 py-8 text-center text-sm text-neutral-500">
        <p>
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
