import { CheckCircle2, AlertTriangle, CreditCard, Landmark } from "lucide-react";
import SavingForm, { SubmitButton } from "@/components/ui/SavingForm";
import { desconectarMercadoPago, guardarConfigPagos } from "@/lib/admin/cobros";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils/format";
import { configDesdeFila, precioTransferencia } from "@/lib/pagos/precios";
import type { TiendaConfig } from "@/lib/types/database";
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

  // Transferencia y efectivo (migración 012). Si la tabla no existe todavía,
  // la sección avisa en vez de romper la pantalla.
  const { data: filaConfig, error: errorConfig } = await createServiceClient()
    .from("tienda_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle<TiendaConfig>();
  const faltaMigracion = Boolean(errorConfig);

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

      <ConfigTransferencia fila={filaConfig ?? null} faltaMigracion={faltaMigracion} />
    </div>
  );
}

const campo =
  "w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:border-red-600 focus:outline-none";
const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500";

function ConfigTransferencia({ fila, faltaMigracion }: { fila: TiendaConfig | null; faltaMigracion: boolean }) {
  if (faltaMigracion) {
    return (
      <section className="mt-10 rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
        Transferencia y efectivo: falta un paso técnico para activarlo. Avisale a Nico.
      </section>
    );
  }

  const c = configDesdeFila(fila);
  const ejemplo = 20000;
  const ejemploTransferencia = precioTransferencia(ejemplo, null, c);

  return (
    <section className="mt-10 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
          <Landmark size={22} className="text-green-400" />
        </div>
        <div>
          <p className="font-bold text-neutral-100">Transferencia y efectivo</p>
          <p className={`text-sm ${c.transferenciaActiva || c.efectivoActivo ? "text-green-400" : "text-neutral-500"}`}>
            {c.transferenciaActiva || c.efectivoActivo ? "● Activo en la tienda" : "○ Apagado"}
          </p>
        </div>
      </div>

      <p className="mb-6 text-sm text-neutral-400">
        Pagando sin Mercado Pago no hay comisión, así que podés hacer un precio más barato. En la tienda se ve
        el precio de Mercado Pago tachado y el de transferencia más grande.
      </p>

      <SavingForm action={guardarConfigPagos} successMessage="Guardado" className="flex flex-col gap-5">
        <label className="flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="checkbox"
            name="transferencia_activa"
            defaultChecked={fila?.transferencia_activa ?? false}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
          />
          <span>
            Aceptar <strong>transferencia</strong>
            <span className="block text-xs text-neutral-500">Paga todo por transferencia al hacer el pedido.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="checkbox"
            name="efectivo_activo"
            defaultChecked={fila?.efectivo_activo ?? false}
            className="mt-0.5 h-5 w-5 shrink-0 accent-red-600"
          />
          <span>
            Aceptar <strong>efectivo al retirar</strong>
            <span className="block text-xs text-neutral-500">
              Transfiere una seña para reservar y el resto lo paga en mano. Solo para retiro en Haedo o Ramos Mejía.
            </span>
          </span>
        </label>

        <div>
          <label className={etiqueta}>Descuento pagando sin Mercado Pago (%)</label>
          <input
            name="descuento_transferencia"
            type="number"
            min="0"
            max="99"
            step="0.5"
            defaultValue={fila?.descuento_transferencia ?? 0}
            className={campo}
          />
          <p className="mt-1 text-xs text-neutral-500">
            {c.descuento > 0
              ? `Ejemplo: una prenda de ${formatPrice(ejemplo)} queda en ${formatPrice(ejemploTransferencia)}.`
              : "Con 0, el precio es el mismo que con Mercado Pago."}{" "}
            Si a una prenda le cargás un precio por transferencia a mano, ese gana.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={etiqueta}>Alias</label>
            <input name="alias" defaultValue={fila?.alias ?? ""} placeholder="tu.alias" className={campo} />
          </div>
          <div>
            <label className={etiqueta}>A nombre de</label>
            <input name="titular" defaultValue={fila?.titular ?? ""} placeholder="Nombre y apellido" className={campo} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={etiqueta}>Seña del efectivo (%)</label>
            <input
              name="sena_porcentaje"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={fila?.sena_porcentaje ?? 50}
              className={campo}
            />
          </div>
          <div>
            <label className={etiqueta}>Horas para transferir</label>
            <input
              name="horas_para_pagar"
              type="number"
              min="1"
              max="720"
              step="1"
              defaultValue={fila?.horas_para_pagar ?? 48}
              className={campo}
            />
            <p className="mt-1 text-xs text-neutral-500">Pasado ese tiempo, el pedido se cancela solo.</p>
          </div>
        </div>

        <div>
          <SubmitButton className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700">
            Guardar
          </SubmitButton>
        </div>
      </SavingForm>
    </section>
  );
}
