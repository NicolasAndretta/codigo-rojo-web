import ArrepentimientoForm from "./ArrepentimientoForm";

export const metadata = {
  title: "Botón de arrepentimiento | Código Rojo",
  description: "Arrepentite de tu compra dentro de los 10 días de recibirla.",
};

export default function ArrepentimientoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl tracking-widest sm:text-5xl">BOTÓN DE ARREPENTIMIENTO</h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-400">
        <p>
          Si compraste en la tienda, tenés <strong className="text-neutral-200">10 días corridos</strong>{" "}
          desde que recibiste tu pedido para arrepentirte, sin dar explicaciones (Ley 24.240, art. 34, y
          Resolución 424/2020).
        </p>
        <p>
          Completá tus datos y te damos en el momento un <strong className="text-neutral-200">código de
          trámite</strong>. Después te escribimos para coordinar la devolución de la prenda, sin usar y con sus
          etiquetas, y la devolución de tu plata por el mismo medio con el que pagaste.
        </p>
        <p className="text-neutral-500">No hace falta tener cuenta ni registrarte.</p>
      </div>

      <ArrepentimientoForm />
    </div>
  );
}
