import Link from "next/link";
import { Package, ClipboardList, AlertTriangle, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AVISAR_ANTES_DIAS, estadoConexion } from "@/lib/mercadopago/conexion";

// Lo primero que ve Agustina al entrar: si la tienda no puede cobrar, tiene
// que saltar a la vista acá, no descubrirse cuando un cliente no puede pagar.
async function avisoDeCobros(): Promise<string | null> {
  try {
    const estado = await estadoConexion();
    if (!estado.conectada) return "Mercado Pago sin conectar: la tienda todavía no puede cobrar.";
    if (estado.diasRestantes !== null && estado.diasRestantes <= AVISAR_ANTES_DIAS) {
      return `La conexión con Mercado Pago vence en ${Math.max(estado.diasRestantes, 0)} días.`;
    }
    return null;
  } catch {
    return "No se pudo revisar la conexión con Mercado Pago.";
  }
}

export const metadata = { title: "Admin | Código Rojo" };

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ count: productsCount }, { count: pendingOrders }, { count: paidOrders }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["preparing", "shipped"]),
    ]);

  const aviso = await avisoDeCobros();

  return (
    <div>
      <h1 className="mb-8 font-display text-4xl tracking-widest">PANEL</h1>

      {aviso && (
        <Link
          href="/admin/cobros"
          className="mb-6 flex items-center gap-3 rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300 transition-colors hover:bg-amber-950/70"
        >
          <CreditCard size={18} className="shrink-0" />
          <span className="flex-1">{aviso}</span>
          <span className="shrink-0 font-bold">Ir a Cobros →</span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/admin/productos"
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-600"
        >
          <Package className="mb-3 text-red-500" size={24} />
          <p className="text-3xl font-bold">{productsCount ?? 0}</p>
          <p className="text-sm text-neutral-500">Productos</p>
        </Link>

        <Link
          href="/admin/ordenes"
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-600"
        >
          <AlertTriangle className="mb-3 text-amber-500" size={24} />
          <p className="text-3xl font-bold">{pendingOrders ?? 0}</p>
          <p className="text-sm text-neutral-500">Pagadas sin preparar</p>
        </Link>

        <Link
          href="/admin/ordenes"
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-neutral-600"
        >
          <ClipboardList className="mb-3 text-blue-500" size={24} />
          <p className="text-3xl font-bold">{paidOrders ?? 0}</p>
          <p className="text-sm text-neutral-500">En curso</p>
        </Link>
      </div>
    </div>
  );
}
