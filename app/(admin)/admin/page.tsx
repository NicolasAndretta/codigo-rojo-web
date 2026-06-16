import Link from "next/link";
import { Package, ClipboardList, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div>
      <h1 className="mb-8 font-display text-4xl tracking-widest">PANEL</h1>

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
