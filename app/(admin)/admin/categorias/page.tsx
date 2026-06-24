import { Trash2, FolderPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createCategory, deleteCategory } from "@/lib/admin/actions";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import type { Category } from "@/lib/types/database";

export const metadata = { title: "Categorías | Admin" };

export default async function CategoriasAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("display_order");
  const categories = (data ?? []) as Category[];

  const roots = categories.filter((c) => c.parent_id === null);
  const childrenOf = (id: number) => categories.filter((c) => c.parent_id === id);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 font-display text-4xl tracking-widest">CATEGORÍAS</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Organizá tu catálogo. Las subcategorías van dentro de una categoría madre
        (ej: Jean dentro de Pantalones).
      </p>

      <div className="flex flex-col gap-8">
        {/* Crear */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-400">
            <FolderPlus size={16} /> Nueva categoría
          </h2>
          <SavingForm
            action={createCategory}
            successMessage="Categoría creada"
            resetOnSuccess
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Nombre
              </label>
              <input
                name="name"
                required
                placeholder="Ej: Camperas"
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Dentro de (opcional)
              </label>
              <select
                name="parent_id"
                defaultValue=""
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
              >
                <option value="">— Es una categoría principal</option>
                {roots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton
              pendingLabel="Agregando…"
              className="shrink-0 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700"
            >
              Agregar
            </SubmitButton>
          </SavingForm>
        </section>

        {/* Listado */}
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-neutral-400">
            Tus categorías
          </h2>
          {roots.length === 0 ? (
            <p className="text-sm text-neutral-500">Todavía no hay categorías.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {roots.map((root) => (
                <li key={root.id}>
                  <CategoryRow category={root} />
                  {childrenOf(root.id).length > 0 && (
                    <ul className="ml-5 mt-1 flex flex-col gap-1 border-l border-neutral-800 pl-4">
                      {childrenOf(root.id).map((child) => (
                        <li key={child.id}>
                          <CategoryRow category={child} child />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CategoryRow({ category, child = false }: { category: Category; child?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-neutral-800/50">
      <span className={`text-sm ${child ? "text-neutral-400" : "font-semibold text-neutral-100"}`}>
        {category.name}
      </span>
      <SavingForm
        action={deleteCategory.bind(null, category.id)}
        successMessage="Categoría eliminada"
      >
        <button
          type="submit"
          className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-red-950 hover:text-red-300"
          aria-label={`Eliminar ${category.name}`}
        >
          <Trash2 size={14} />
        </button>
      </SavingForm>
    </div>
  );
}
