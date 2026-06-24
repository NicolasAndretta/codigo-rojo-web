"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useToast } from "./Toast";

type Props = {
  /** Server action ya bindeada (recibe solo el FormData). */
  action: (formData: FormData) => Promise<void>;
  /** Mensaje del toast al guardar OK. */
  successMessage: string;
  /** Si el form se resetea solo al terminar (útil para "crear"). */
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Envuelve un <form> con server action y garantiza feedback inmediato:
 *  - toast de éxito/error al terminar,
 *  - `router.refresh()` para que la pantalla muestre el cambio SIN recargar.
 * Resuelve el problema de "guardé pero la pantalla se ve igual / hay que recargar".
 */
export default function SavingForm({
  action,
  successMessage,
  resetOnSuccess = false,
  className,
  children,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  return (
    <form
      className={className}
      action={async (formData) => {
        try {
          await action(formData);
          toast.success(successMessage);
          router.refresh(); // trae los datos frescos del server al toque
        } catch (err) {
          // `redirect()` lanza a propósito: dejarlo propagar (no es un error real).
          if (
            err &&
            typeof err === "object" &&
            "digest" in err &&
            String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
          ) {
            throw err;
          }
          toast.error(
            err instanceof Error ? err.message : "No se pudo guardar. Probá de nuevo."
          );
        }
      }}
      {...(resetOnSuccess
        ? {
            // limpiar inputs después de un alta exitosa
            onSubmit: (e) => {
              const form = e.currentTarget;
              setTimeout(() => form.reset(), 0);
            },
          }
        : {})}
    >
      {children}
    </form>
  );
}

/**
 * Botón de submit con estado "guardando…" automático (useFormStatus).
 * Usar SIEMPRE dentro de un <SavingForm> (o cualquier <form>).
 */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} ${pending ? "cursor-wait opacity-70" : ""}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
