"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Package, FolderTree, Ticket } from "lucide-react";
import { createDiscount, type DiscountFormState } from "@/lib/admin/discounts";
import CategorySelect from "./CategorySelect";
import type { Category, DiscountScope, DiscountValueType } from "@/lib/types/database";

type ProductOption = { id: number; name: string };

const SCOPES: { value: DiscountScope; label: string; icon: typeof Package }[] = [
  { value: "product", label: "Un producto", icon: Package },
  { value: "category", label: "Una categoría", icon: FolderTree },
  { value: "coupon", label: "Cupón", icon: Ticket },
];

export default function DiscountForm({
  products,
  categories,
}: {
  products: ProductOption[];
  categories: Category[];
}) {
  const [scope, setScope] = useState<DiscountScope>("product");
  const [valueType, setValueType] = useState<DiscountValueType>("percent");
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<DiscountFormState, FormData>(
    createDiscount,
    {}
  );

  // Al crear con éxito, limpiamos el formulario
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="value_type" value={valueType} />

      {/* Qué descontar */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          ¿Qué querés descontar?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SCOPES.map((s) => {
            const Icon = s.icon;
            const active = scope === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-all ${
                  active
                    ? "border-red-600 bg-red-600/10 text-white"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                <Icon size={18} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target según scope */}
      {scope === "product" && (
        <Labeled label="Producto">
          <select
            name="target_product_id"
            defaultValue=""
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">Elegí un producto…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Labeled>
      )}

      {scope === "category" && (
        <Labeled label="Categoría">
          <CategorySelect categories={categories} name="target_category_id" />
        </Labeled>
      )}

      {scope === "coupon" && (
        <Labeled label="Código del cupón" hint="Lo ingresa el cliente en el checkout">
          <input
            name="code"
            placeholder="VERANO20"
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm uppercase text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none"
          />
        </Labeled>
      )}

      {/* Valor del descuento */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Descuento
        </p>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded border border-neutral-700">
            <button
              type="button"
              onClick={() => setValueType("percent")}
              className={`px-4 text-sm font-bold transition-colors ${
                valueType === "percent"
                  ? "bg-red-600 text-white"
                  : "bg-neutral-950 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setValueType("fixed")}
              className={`px-4 text-sm font-bold transition-colors ${
                valueType === "fixed"
                  ? "bg-red-600 text-white"
                  : "bg-neutral-950 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              $
            </button>
          </div>
          <input
            name="value"
            type="number"
            min="1"
            step="1"
            required
            placeholder={valueType === "percent" ? "20" : "5000"}
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-neutral-600">
          {valueType === "percent"
            ? "Porcentaje de descuento (ej: 20 = 20% menos)"
            : "Monto fijo en pesos a descontar"}
        </p>
      </div>

      {/* Opciones extra de cupón */}
      {scope === "coupon" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
          <Labeled label="Vence (opcional)">
            <input
              name="ends_at"
              type="date"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            />
          </Labeled>
          <Labeled label="Usos máximos (opcional)">
            <input
              name="max_uses"
              type="number"
              min="1"
              placeholder="Sin límite"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none"
            />
          </Labeled>
        </div>
      )}

      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/50 p-3 text-xs text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-green-900 bg-green-950/40 p-3 text-xs text-green-300">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>¡Descuento creado y aplicado!</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear descuento"}
      </button>
    </form>
  );
}

function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        {hint && <span className="text-[11px] text-neutral-600">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
