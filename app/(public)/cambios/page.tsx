import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/utils/format";

// Días para pedir un cambio, contados desde que llega el pedido.
// Si Agustina decide otro plazo, se cambia acá y la página se acomoda sola.
const PLAZO_CAMBIO_DIAS = 10;

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const metadata = {
  title: "Cambios y devoluciones | Código Rojo",
  description: `Cambiá talle o prenda dentro de los ${PLAZO_CAMBIO_DIAS} días de recibir tu pedido.`,
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl tracking-widest text-neutral-100">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-400">{children}</div>
    </section>
  );
}

const fuerte = "text-neutral-200";

export default function CambiosPage() {
  const msgCambio =
    "Hola! Quiero hacer un cambio. Mi número de pedido es: ___ · Qué quiero cambiar: ___ · Por qué talle o prenda: ___";
  const msgFalla =
    "Hola! Me llegó una prenda con una falla. Mi número de pedido es: ___ (te mando una foto)";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl tracking-widest sm:text-5xl">CAMBIOS Y DEVOLUCIONES</h1>
      <p className="mt-6 text-sm leading-relaxed text-neutral-400">
        Si algo no te quedó como esperabas, lo resolvemos. Tenés{" "}
        <strong className={fuerte}>{PLAZO_CAMBIO_DIAS} días corridos</strong> desde que recibís tu pedido
        para pedir el cambio.
      </p>

      <Seccion titulo="QUÉ SE PUEDE CAMBIAR">
        <p>
          Se puede cambiar cualquier prenda de la tienda, también las que compraste con descuento. Podés
          cambiarla por <strong className={fuerte}>otro talle</strong> o por{" "}
          <strong className={fuerte}>otra prenda</strong>. Si la nueva cuesta más, abonás la diferencia; si
          cuesta menos, te devolvemos la diferencia.
        </p>
      </Seccion>

      <Seccion titulo="CÓMO TIENE QUE ESTAR LA PRENDA">
        <ul className="list-disc space-y-2 pl-5">
          <li>Sin uso y sin lavar.</li>
          <li>Con todas sus etiquetas.</li>
          <li>En su bolsa original.</li>
          <li>
            Las <strong className={fuerte}>prendas blancas</strong> solo se cambian si están en perfecto
            estado. Las revisamos cuando nos llegan, antes de confirmar el cambio.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="QUIÉN PAGA EL ENVÍO">
        <p>
          <strong className={fuerte}>Si el error fue nuestro</strong> (te mandamos otro talle u otra prenda,
          o vino con una falla), el envío corre por nuestra cuenta.
        </p>
        <p>
          <strong className={fuerte}>Si el cambio es por elección tuya</strong> (por ejemplo, pediste un
          talle que no era), el envío lo pagás vos.
        </p>
      </Seccion>

      <Seccion titulo="SI TE LLEGÓ CON UNA FALLA">
        <p>Escribinos con una foto y elegís cómo lo resolvemos:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Te devolvemos la plata.</li>
          <li>Te mandamos la misma prenda, si hay stock.</li>
          <li>
            Te mandamos otra prenda del mismo valor. Si elegís una más cara, abonás la diferencia; si es más
            barata, te la devolvemos.
          </li>
        </ul>
        <p className="text-neutral-500">
          Las fallas de fabricación están cubiertas por la garantía legal (Ley 24.240), también después de
          los {PLAZO_CAMBIO_DIAS} días.
        </p>
      </Seccion>

      <Seccion titulo="CÓMO PEDIRLO">
        <p>
          Por WhatsApp, con tu <strong className={fuerte}>número de pedido</strong> a mano. Te respondemos y
          coordinamos el envío.
        </p>
        {WHATSAPP_NUMBER && (
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <a
              href={formatWhatsAppUrl(WHATSAPP_NUMBER, msgCambio)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-3 rounded-lg bg-[#25D366] px-6 py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-95"
            >
              <MessageCircle size={18} />
              Pedir un cambio
            </a>
            <a
              href={formatWhatsAppUrl(WHATSAPP_NUMBER, msgFalla)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-3 rounded-lg border border-neutral-700 px-6 py-4 text-sm font-bold uppercase tracking-wider text-neutral-200 transition-all hover:border-red-600 hover:text-red-500"
            >
              <MessageCircle size={18} />
              Avisar una falla
            </a>
          </div>
        )}
      </Seccion>

      <section className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6">
        <h2 className="font-display text-xl tracking-widest text-neutral-100">
          ¿QUERÉS LA PLATA DE VUELTA?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          El cambio es para llevarte otro talle u otra prenda. Si preferís devolver la compra y que te
          reintegremos el dinero, usá el botón de arrepentimiento: tenés 10 días corridos desde que recibís
          el pedido, sin dar explicaciones.
        </p>
        <Link
          href="/arrepentimiento"
          className="mt-4 inline-block text-sm text-neutral-200 underline underline-offset-4 transition-colors hover:text-red-500"
        >
          Ir al botón de arrepentimiento
        </Link>
      </section>
    </div>
  );
}
