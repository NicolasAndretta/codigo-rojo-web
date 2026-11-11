"use client";

import { useState } from "react";
import { precioTransferencia, type ConfigPagos } from "@/lib/pagos/precios";
import { formatPrice } from "@/lib/utils/format";

const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500";

type Props = {
  config: ConfigPagos;
  /** Clase de los inputs (el alta y la edición usan fondos distintos). */
  claseCampo: string;
  /** El selector de categoría, que va debajo de los precios. */
  categoria: React.ReactNode;
  precioInicial?: number;
  /**
   * El precio especial por transferencia cargado a mano. `undefined` = el
   * campo no se muestra (en el alta, o si la base no tiene la migración 012).
   */
  precioAManoInicial?: number | null;
};

/**
 * El precio que hay que cobrar con Mercado Pago para que, con el % de Cobros,
 * por transferencia quede al menos `transferencia`. Múltiplo de $100, como lo
 * redondea la tienda.
 */
function precioMPPara(transferencia: number, config: ConfigPagos): number {
  if (config.descuento <= 0) return transferencia;
  let mp = Math.ceil(transferencia / (1 - config.descuento / 100) / 100) * 100;
  // El redondeo para abajo de la tienda puede dejarlo $100 corto: se sube.
  while (precioTransferencia(mp, null, config) < transferencia) mp += 100;
  return mp;
}

const numero = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Los dos precios de una prenda, conectados: Agustina escribe el suyo de
 * siempre (por transferencia o efectivo) y el de Mercado Pago se completa
 * solo con el % de Cobros, o al revés. Lo que se guarda es el de Mercado Pago
 * (`price`), como siempre; el de transferencia lo calcula la tienda con la
 * misma cuenta (lib/pagos/precios.ts).
 *
 * Antes había un solo campo, el de Mercado Pago, y era fácil cargar ahí "lo
 * que quiero cobrar en mano" y perder el % sin darse cuenta.
 */
export default function PrecioProducto({
  config,
  claseCampo,
  categoria,
  precioInicial,
  precioAManoInicial,
}: Props) {
  const [mp, setMp] = useState(precioInicial ? String(precioInicial) : "");
  const [aMano, setAMano] = useState(precioAManoInicial ? String(precioAManoInicial) : "");
  const conCampoAMano = precioAManoInicial !== undefined;
  // Fijo desde el principio: si dependiera de lo escrito, se cerraría solo al borrar el número.
  const [especialAbierto] = useState(Boolean(precioAManoInicial));
  const manual = conCampoAMano ? numero(aMano) : 0;

  const transfDe = (precioMP: string) =>
    numero(precioMP) ? String(precioTransferencia(numero(precioMP), manual || null, config)) : "";
  const [transf, setTransf] = useState(() => transfDe(precioInicial ? String(precioInicial) : ""));

  function escribirTransferencia(valor: string) {
    setTransf(valor);
    const t = numero(valor);
    setMp(t ? String(precioMPPara(t, config)) : "");
  }
  function escribirMP(valor: string) {
    setMp(valor);
    setTransf(transfDe(valor));
  }

  const precioMP = numero(mp);
  const real = precioMP ? precioTransferencia(precioMP, manual || null, config) : 0;
  const apagada = !config.transferenciaActiva && !config.efectivoActivo;

  return (
    <>
      <div className="grid grid-cols-2 items-end gap-4">
        <div>
          <label htmlFor="precio-transf" className={etiqueta}>
            Por transferencia o efectivo
          </label>
          <input
            id="precio-transf"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={manual ? String(manual) : transf}
            onChange={(e) => escribirTransferencia(e.target.value)}
            disabled={manual > 0}
            placeholder="Tu precio"
            className={`${claseCampo} placeholder-neutral-600 disabled:opacity-60`}
          />
        </div>
        <div>
          <label htmlFor="precio-mp" className={etiqueta}>
            Con Mercado Pago
          </label>
          <input
            id="precio-mp"
            name="price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            value={mp}
            onChange={(e) => escribirMP(e.target.value)}
            className={claseCampo}
          />
        </div>
      </div>

      <div
        aria-live="polite"
        className="-mt-1 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs leading-relaxed text-neutral-400"
      >
        {!precioMP ? (
          <p>
            Escribí tu precio de siempre en <strong className="text-neutral-200">Por transferencia o efectivo</strong>:
            el de Mercado Pago se completa solo
            {config.descuento > 0 ? ` (${config.descuento}% más, para cubrir la comisión)` : ""}.
          </p>
        ) : manual > precioMP ? (
          <p className="text-red-300">
            El precio especial por transferencia no puede ser más caro que el de Mercado Pago.
          </p>
        ) : (
          <p>
            En la tienda: <strong className="text-neutral-100">{formatPrice(real)}</strong> por transferencia o
            efectivo y <strong className="text-neutral-100">{formatPrice(precioMP)}</strong> con Mercado Pago.
            {manual > 0
              ? " Usa el precio especial de abajo."
              : numero(transf) && real !== numero(transf)
                ? ` Por transferencia queda en ${formatPrice(real)}: se redondea a $100.`
                : ""}
          </p>
        )}
        {apagada && (
          <p className="mt-1 text-neutral-500">
            Hoy la transferencia y el efectivo están apagados en Cobros: la tienda solo muestra el precio
            con Mercado Pago.
          </p>
        )}
      </div>

      <div>
        <label className={etiqueta}>Categoría</label>
        {categoria}
      </div>

      {conCampoAMano && (
        <details open={especialAbierto} className="text-xs text-neutral-500">
          <summary className="cursor-pointer select-none py-1 hover:text-neutral-300">
            Precio especial por transferencia para esta prenda (opcional)
          </summary>
          <div className="mt-2">
            <input
              id="precio-a-mano"
              name="precio_transferencia"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={aMano}
              onChange={(e) => {
                setAMano(e.target.value);
                if (!numero(e.target.value)) {
                  setTransf(numero(mp) ? String(precioTransferencia(numero(mp), null, config)) : "");
                }
              }}
              placeholder="Vacío = se calcula con el % de Cobros"
              className={`${claseCampo} placeholder-neutral-600`}
            />
            <p className="mt-1">
              Solo para una excepción: si lo cargás, es el que se cobra por transferencia o efectivo en
              esta prenda y no se usa el % de Cobros.
            </p>
          </div>
        </details>
      )}
    </>
  );
}
