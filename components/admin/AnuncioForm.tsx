"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AnuncioBar from "@/components/AnuncioBar";
import { useToast } from "@/components/ui/Toast";
import { guardarAnuncio } from "@/lib/admin/anuncio";
import { ANUNCIO_MAX_LARGO, ANUNCIO_MAX_MENSAJES } from "@/lib/tienda/anuncio";

const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500";

type Props = {
  activo: boolean;
  mensajes: string[];
  descuento: boolean;
  /** El texto del descuento como sale hoy, o null si la transferencia está apagada. */
  textoDescuento: string | null;
};

/**
 * El formulario de la franja, con la vista previa en vivo arriba.
 *
 * No usa SavingForm a propósito: con `<form action>`, React resetea el
 * formulario al terminar (también cuando la action avisa un error), y las
 * casillas controladas quedaban destildadas en pantalla aunque el estado dijera
 * otra cosa. Acá el envío es a mano y lo que se ve es siempre el estado.
 */
export default function AnuncioForm(props: Props) {
  const [activo, setActivo] = useState(props.activo);
  const [texto, setTexto] = useState(props.mensajes.join("\n"));
  const [descuento, setDescuento] = useState(props.descuento);
  const [guardando, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const r = await guardarAnuncio(datos);
        if (!r.ok) {
          toast.error(r.motivo);
          return;
        }
        toast.success("Anuncio guardado");
        router.refresh();
      } catch {
        toast.error("No se pudo guardar. Probá de nuevo.");
      }
    });
  }

  const propios = texto
    .split(/\r?\n/)
    .map((m) => m.trim())
    .filter(Boolean);
  const vista = [
    ...(descuento && props.textoDescuento ? [props.textoDescuento] : []),
    ...(activo ? propios.map((m) => m.slice(0, ANUNCIO_MAX_LARGO)) : []),
  ];
  const demasiados = propios.length > ANUNCIO_MAX_MENSAJES;
  const largos = propios.filter((m) => m.length > ANUNCIO_MAX_LARGO).length;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className={etiqueta}>Así se ve en la tienda</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
          {vista.length ? (
            <AnuncioBar mensajes={vista} />
          ) : (
            <p className="px-4 py-3 text-sm text-neutral-500">
              Con esto así, no aparece ninguna franja.
            </p>
          )}
        </div>
      </section>

      <form
        onSubmit={guardar}
        className="flex flex-col gap-6 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
      >
        <label className="flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="checkbox"
            name="anuncio_descuento"
            checked={descuento}
            onChange={(e) => setDescuento(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
          />
          <span>
            Anunciar el <strong>descuento por transferencia</strong>
            <span className="block text-xs text-neutral-500">
              {props.textoDescuento
                ? `Sale solo y con el % de Cobros: "${props.textoDescuento}".`
                : "Hoy la transferencia y el efectivo están apagados en Cobros, así que no se muestra."}
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-neutral-200">
            <input
              type="checkbox"
              name="anuncio_activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
            />
            <span>
              Mostrar <strong>mis mensajes</strong>
              <span className="block text-xs text-neutral-500">
                Apagalo para sacarlos un tiempo sin borrarlos.
              </span>
            </span>
          </label>
          <div>
            <label htmlFor="anuncio-mensajes" className={etiqueta}>
              Mensajes (uno por renglón)
            </label>
            <textarea
              id="anuncio-mensajes"
              name="anuncio_mensajes"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={"Envío gratis desde $50.000\nNuevo drop el viernes"}
              className="w-full resize-y rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none"
            />
            <p className={`mt-1 text-xs ${demasiados || largos ? "text-red-300" : "text-neutral-500"}`}>
              {demasiados
                ? `Son ${propios.length}: como mucho ${ANUNCIO_MAX_MENSAJES}.`
                : largos
                  ? `Hay ${largos === 1 ? "un mensaje" : `${largos} mensajes`} de más de ${ANUNCIO_MAX_LARGO} letras: acortalo.`
                  : `Hasta ${ANUNCIO_MAX_MENSAJES} mensajes. Con uno solo queda quieto; con varios, van pasando.`}
            </p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={guardando}
            aria-busy={guardando}
            className={`rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700 ${
              guardando ? "cursor-wait opacity-70" : ""
            }`}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
