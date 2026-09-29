"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { ImagenInvalida, prepararFoto } from "@/lib/image-client";
import { useToast } from "@/components/ui/Toast";

/**
 * Subida de una foto de producto desde el panel.
 *
 * POR QUÉ ESTO NO ES UN <form> CON SERVER ACTION Y LISTO
 *
 * Antes era exactamente eso, y por eso Agustina no podía cargar productos
 * desde la tablet. Tres cosas fallaban a la vez:
 *
 *  1. Las Server Actions de Next tienen un tope de 1 MB por defecto. Una foto
 *     de cámara pesa entre 3 y 8 MB → la pedía y volvía 413 ANTES de que la
 *     action llegara a ejecutarse. Por eso funcionaba con una captura de
 *     pantalla (liviana) y no con una foto de verdad.
 *  2. El <form> era pelado, sin SavingForm: no había toast de error ni estado
 *     "subiendo". Ella apretaba y no pasaba absolutamente nada.
 *  3. No había achique en el navegador.
 *
 * Acá la foto se prepara ANTES de mandarla (`prepararFoto` la achica a 1920px
 * y ~300 KB), así que lo que viaja entra holgado en el límite. Y cada estado
 * —preparando, subiendo, error— se ve en pantalla.
 *
 * Es de un solo paso a propósito: se elige la foto y sube sola. En una tablet,
 * cada toque extra es una oportunidad más de que algo salga mal.
 */
export default function SubirFoto({
  action,
  titulo,
}: {
  /** Server action ya bindeada con (productId, slot). */
  action: (formData: FormData) => Promise<void>;
  /** Para que el mensaje diga cuál de las fotos se subió. */
  titulo: string;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [estado, setEstado] = useState<"quieto" | "preparando" | "subiendo">("quieto");

  const ocupado = estado !== "quieto";
  const etiqueta =
    estado === "preparando"
      ? "Preparando la foto…"
      : estado === "subiendo"
        ? "Subiendo…"
        : "Elegir foto";

  return (
    <label
      htmlFor={id}
      aria-busy={ocupado}
      className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-700 p-4 text-center transition-colors ${
        ocupado ? "cursor-wait opacity-60" : "hover:border-red-600 hover:bg-neutral-900"
      }`}
    >
      <Upload size={22} className="text-neutral-500" />
      <span className="text-xs font-semibold text-neutral-300">{etiqueta}</span>
      <span className="text-[10px] text-neutral-500">
        {ocupado ? "No cierres esta pantalla" : "Sacala con la cámara o elegila de la galería"}
      </span>

      <input
        id={id}
        type="file"
        accept="image/*"
        disabled={ocupado}
        className="sr-only"
        onChange={async (e) => {
          const elegido = e.target.files?.[0];
          // Se limpia enseguida para poder volver a elegir el MISMO archivo si
          // falló: sin esto, el onChange no vuelve a dispararse y parece colgado.
          e.target.value = "";
          if (!elegido) return;

          setEstado("preparando");
          let listo: File;
          try {
            listo = await prepararFoto(elegido);
          } catch (err) {
            setEstado("quieto");
            toast.error(
              err instanceof ImagenInvalida
                ? err.message
                : "No se pudo preparar la foto. Probá con otra."
            );
            return;
          }

          setEstado("subiendo");
          try {
            const fd = new FormData();
            fd.append("image", listo);
            await action(fd);
            toast.success(`${titulo} subida`);
            router.refresh();
          } catch (err) {
            // `redirect()` lanza a propósito: dejarlo pasar, no es un error.
            if (
              err &&
              typeof err === "object" &&
              "digest" in err &&
              String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
            ) {
              throw err;
            }
            toast.error(
              err instanceof Error ? err.message : "No se pudo subir la foto. Probá de nuevo."
            );
          } finally {
            setEstado("quieto");
          }
        }}
      />
    </label>
  );
}
