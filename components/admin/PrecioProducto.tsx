"use client";

import { useState } from "react";
import { precioTransferencia, type ConfigPagos } from "@/lib/pagos/precios";
import { formatPrice } from "@/lib/utils/format";

const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500";

type Props = {
  config: ConfigPagos;
  /** Clase de los inputs (el alta y la edición usan fondos distintos). */
  claseCampo: string;
  /** El selector de categoría, que va al lado del precio. */
  categoria: React.ReactNode;
  precioInicial?: number;
  /**
   * El precio por transferencia cargado a mano. `undefined` = el campo no se
   * muestra (en el alta, o si la base no tiene la migración 012).
   */
  precioAManoInicial?: number | null;
};

/**
 * El precio de una prenda en el panel, con lo que queda por transferencia a la
 * vista mientras se escribe.
 *
 * El precio que se carga es el de Mercado Pago, y la tienda le resta sola el %
 * de Cobros. Es fácil cargar "lo que quiero cobrar en mano" y perder ese % sin
 * darse cuenta: por eso el cálculo se ve en vivo, con la misma función que usan
 * la tienda y el cobro (lib/pagos/precios.ts).
 */
export default function PrecioProducto({
  config,
  claseCampo,
  categoria,
  precioInicial,
  precioAManoInicial,
}: Props) {
  const [precio, setPrecio] = useState(precioInicial ? String(precioInicial) : "");
  const [aMano, setAMano] = useState(precioAManoInicial ? String(precioAManoInicial) : "");
  const conCampoAMano = precioAManoInicial !== undefined;

  return (
    <>
      {/* items-end: en celu "Precio con Mercado Pago" ocupa dos renglones y
          sin esto los dos campos quedan desparejos. */}
      <div className="grid grid-cols-2 items-end gap-4">
        <div>
          <label htmlFor="precio-mp" className={etiqueta}>
            Precio con Mercado Pago
          </label>
          <input
            id="precio-mp"
            name="price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className={claseCampo}
          />
        </div>
        <div>
          <label className={etiqueta}>Categoría</label>
          {categoria}
        </div>
      </div>

      <ResumenTransferencia
        config={config}
        precio={Number(precio)}
        aMano={conCampoAMano ? Number(aMano) : 0}
      />

      {conCampoAMano && (
        <div>
          <label htmlFor="precio-a-mano" className={etiqueta}>
            Precio por transferencia (opcional)
          </label>
          <input
            id="precio-a-mano"
            name="precio_transferencia"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={aMano}
            onChange={(e) => setAMano(e.target.value)}
            placeholder="Vacío = se calcula con el % de Cobros"
            className={`${claseCampo} placeholder-neutral-600`}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Solo si querés un precio especial para esta prenda: si lo cargás, es el que se cobra por
            transferencia o efectivo y no se usa el % de Cobros.
          </p>
        </div>
      )}
    </>
  );
}

function ResumenTransferencia({
  config,
  precio,
  aMano,
}: {
  config: ConfigPagos;
  precio: number;
  aMano: number;
}) {
  const apagada = !config.transferenciaActiva && !config.efectivoActivo;
  const precioValido = Number.isFinite(precio) && precio > 0;
  const conAMano = Number.isFinite(aMano) && aMano > 0;

  let linea: React.ReactNode;
  if (!precioValido) {
    linea = "Escribí el precio y acá ves cuánto queda por transferencia o efectivo.";
  } else if (conAMano && aMano > precio) {
    linea = (
      <span className="text-red-300">
        El precio por transferencia no puede ser más caro que el de Mercado Pago.
      </span>
    );
  } else if (conAMano) {
    linea = (
      <>
        Por transferencia o efectivo:{" "}
        <strong className="text-neutral-100">{formatPrice(precioTransferencia(precio, aMano, config))}</strong>{" "}
        (el que cargaste a mano abajo).
      </>
    );
  } else if (config.descuento > 0) {
    linea = (
      <>
        Por transferencia o efectivo:{" "}
        <strong className="text-neutral-100">{formatPrice(precioTransferencia(precio, null, config))}</strong>{" "}
        ({config.descuento}% menos, redondeado a $100).
      </>
    );
  } else {
    linea = "Por transferencia o efectivo cuesta lo mismo: el descuento de Cobros está en 0%.";
  }

  return (
    <div
      aria-live="polite"
      className="-mt-1 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs leading-relaxed text-neutral-400"
    >
      <p>{linea}</p>
      {apagada && (
        <p className="mt-1 text-neutral-500">
          Hoy la transferencia y el efectivo están apagados en Cobros: la tienda solo muestra el precio
          con Mercado Pago.
        </p>
      )}
    </div>
  );
}
