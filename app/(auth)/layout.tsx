import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        href="/catalogo"
        className="mb-8 font-display text-4xl tracking-widest text-red-600 hover:text-red-500 transition-colors"
      >
        CÓDIGO ROJO
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
