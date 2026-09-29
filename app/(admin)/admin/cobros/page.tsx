import { CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import { desconectarMercadoPago } from "@/lib/admin/cobros";
import {
  AVISAR_ANTES_DIAS,
  estadoConexion,
  mpConnectConfigurado,
  tokenDeLaTienda,
  type EstadoConexion,
} from "@/lib/mercadopago/conexion";

export const metadata = { title: "Cobros | Admin" };
export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  config: "Todavía falta configurar la aplicación de Mercado Pago. Avisale a Nico.",
  state: "La conexión tardó demasiado o se abrió desde otro lado. Probá de nuevo.",
  cancelado: "No se completó la autorización en Mercado Pago. Podés probar de nuevo cuando quieras.",
  token: "Mercado Pago no terminó de confirmar la conexión. Probá de nuevo en un rato.",
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string; error?: string }>;
}) {
  const { mp, error } = await searchParams;
  const configurado = mpConnectConfigurado();

  // Entrar a esta pantalla también renueva el token si está por vencer: es un
  // uso más, igual que una venta.
  let estado: EstadoConexion = { conectada: false };
  let falloLectura = false;
  try {
    await tokenDeLaTienda();
    estado = await estadoConexion();
  } catch (err) {
    console.error("[cobros]", err instanceof Error ? err.message : err);
    falloLectura = true;
  }

  const porVencer =
    estado.conectada && estado.diasRestantes !== null && estado.diasRestantes <= AVISAR_ANTES_DIAS;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-4xl tracking-widest">COBROS</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Conectá tu Mercado Pago para que la tienda cobre las compras. La plata cae directo en tu cuenta.
      </p>

      {mp === "ok" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-800 bg-green-950/40 p-4 text-sm text-green-300">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>¡Listo! Mercado Pago quedó conectado. Revisá abajo que la cuenta sea la tuya.</span>
        </div>
      )}
      {(error || falloLectura) && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>
            {falloLectura
              ? "No se pudo leer el estado de la conexión. Probá recargar la página."
              : (ERRORES[error!] ?? ERRORES.token)}
          </span>
        </div>
      )}

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#009ee3]/15">
              <CreditCard size={22} className="text-[#009ee3]" />
            </div>
            <div>
              <p className="font-bold text-neutral-100">Mercado Pago</p>
              <p className={`text-sm ${estado.conectada ? "text-green-400" : "text-neutral-500"}`}>
                {estado.conectada ? "● Conectado" : "○ Sin conectar"}
              </p>
            </div>
          </div>

          {!configurado ? null : estado.conectada ? (
            <div className="flex flex-wrap gap-2">
              {/* <a> y no <Link>: Link prefetchea, y prefetchear esta ruta la ejecutaría. */}
              <a
                href="/admin/cobros/conectar"
                className="rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-bold text-neutral-200 transition-colors hover:bg-neutral-800"
              >
                Reconectar
              </a>
              <SavingForm action={desconectarMercadoPago} successMessage="Mercado Pago desconectado">
                <SubmitButton
                  pendingLabel="Desconectando…"
                  className="rounded-lg bg-red-950/60 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-950"
                >
                  Desconectar
                </SubmitButton>
              </SavingForm>
            </div>
          ) : (
            <a
              href="/admin/cobros/conectar"
              className="rounded-lg bg-[#009ee3] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#008fcf]"
            >
              Conectar Mercado Pago
            </a>
          )}
        </div>

        <div className="mt-6 border-t border-neutral-800 pt-6 text-sm">
          {!configurado ? (
            <p className="text-neutral-400">
              Todavía falta configurar la aplicación de Mercado Pago. Mientras tanto la tienda no puede
              cobrar. Avisale a Nico.
            </p>
          ) : estado.conectada ? (
            <div className="space-y-2 text-neutral-400">
              <p>
                Cobrando en la cuenta{" "}
                <strong className="text-neutral-100">{estado.nickname ?? "sin nombre"}</strong>
                {estado.email && <span className="text-neutral-500"> ({estado.email})</span>}.
              </p>
              <p className="text-neutral-500">Conectada el {fecha(estado.conectadaEl)}.</p>
              {porVencer ? (
                <p className="flex items-start gap-2 text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  La conexión vence en {Math.max(estado.diasRestantes ?? 0, 0)} días. Tocá “Reconectar” para renovarla.
                </p>
              ) : (
                <p className="text-neutral-500">La conexión se renueva sola mientras la tienda tenga movimiento.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-neutral-400">
              <p>
                Tocás “Conectar Mercado Pago”, entrás con <strong className="text-neutral-200">tu</strong> cuenta
                y autorizás. Listo: las compras se cobran en tu Mercado Pago.
              </p>
              <p className="flex items-start gap-2 text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Si en este dispositivo está abierta otra cuenta de Mercado Pago, cerrala antes. La cuenta con la
                que autorices es la que va a cobrar.
              </p>
            </div>
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-neutral-600">
        Nunca compartís tu clave: Mercado Pago le da a la tienda un permiso para cobrar, y lo podés sacar
        cuando quieras con “Desconectar”.
      </p>
    </div>
  );
}
