"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, MessageCircle } from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/utils/format";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const campo =
  "w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none";
const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500";

export default function ArrepentimientoForm() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [pedido, setPedido] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/arrepentimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar");
      setPedido(datos.numero_pedido ?? "");
      setCodigo(data.codigo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setEnviando(false);
    }
  }

  if (codigo) {
    const msg = `Hola! Usé el botón de arrepentimiento. Mi código de trámite es ${codigo}${pedido ? ` (pedido ${pedido})` : ""}.`;
    return (
      <section className="mt-8 rounded-xl border border-green-800 bg-green-950/30 p-6 text-center">
        <CheckCircle size={44} className="mx-auto text-green-500" />
        <p className="mt-3 text-sm text-neutral-300">Recibimos tu pedido. Tu código de trámite es:</p>
        <p className="mt-2 font-display text-4xl tracking-[0.2em] text-neutral-50">{codigo}</p>
        <p className="mt-3 text-sm text-neutral-400">
          Guardalo (sacale una captura). Te vamos a escribir para coordinar la devolución.
        </p>
        {WHATSAPP_NUMBER && (
          <a
            href={formatWhatsAppUrl(WHATSAPP_NUMBER, msg)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-95"
          >
            <MessageCircle size={18} />
            Avisar por WhatsApp
          </a>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
      <div>
        <label className={etiqueta} htmlFor="arr-nombre">Nombre y apellido</label>
        <input id="arr-nombre" name="nombre" required maxLength={120} className={campo} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={etiqueta} htmlFor="arr-tel">Teléfono / WhatsApp</label>
          <input id="arr-tel" name="telefono" required maxLength={40} inputMode="tel" className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="arr-mail">Email (opcional)</label>
          <input id="arr-mail" name="email" type="email" maxLength={160} className={campo} />
        </div>
      </div>
      <div>
        <label className={etiqueta} htmlFor="arr-pedido">Número de pedido (si lo tenés)</label>
        <input id="arr-pedido" name="numero_pedido" maxLength={40} placeholder="Ej: 42" className={campo} />
      </div>
      <div>
        <label className={etiqueta} htmlFor="arr-motivo">Comentario (opcional)</label>
        <textarea id="arr-motivo" name="motivo" rows={3} maxLength={1000} className={`${campo} resize-none`} />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/50 p-3 text-xs text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 w-full rounded-lg bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-red-700 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Quiero arrepentirme de mi compra"}
      </button>
    </form>
  );
}
