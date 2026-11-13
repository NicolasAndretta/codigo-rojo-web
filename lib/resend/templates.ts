import { formatFechaHora, formatPrice } from "@/lib/utils/format";
import { DELIVERY_POINT_LABELS } from "@/lib/delivery";
import type { DeliveryPoint } from "@/lib/types/database";

export type { DeliveryPoint };

export type OrderEmailItem = {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
};

export type OrderEmailData = {
  orderId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  deliveryPoint: DeliveryPoint;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  items: OrderEmailItem[];
  /** Se pagó una prenda que ya no tenía stock (migración 011). Solo en el mail de la tienda. */
  sinStock?: boolean;
  /** Pedido por transferencia o efectivo (migración 012). */
  pagoManual?: PagoManualEmail;
};

export type PagoManualEmail = {
  medio: "transferencia" | "efectivo";
  /** Lo que hay que transferir (el total, o la seña si es efectivo). */
  monto: number;
  /** Lo que queda para pagar en efectivo al retirar (0 si es transferencia). */
  resto: number;
  alias: string | null;
  titular: string | null;
  venceEl: string | null;
  /** Link a la página con los datos para transferir. */
  url: string | null;
};


const BG = "#0a0a0a";
const CARD = "#171717";
const BORDER = "#262626";
const RED = "#dc2626";
const TEXT = "#fafafa";
const MUTED = "#a3a3a3";

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="color:${RED};font-size:28px;font-weight:800;letter-spacing:4px;">CÓDIGO ROJO</span>
    </div>
    <div style="background:${CARD};border:1px solid ${BORDER};border-radius:12px;padding:28px;">
      <h1 style="color:${TEXT};font-size:22px;margin:0 0 16px;letter-spacing:1px;">${title}</h1>
      ${inner}
    </div>
    <p style="color:${MUTED};font-size:12px;text-align:center;margin-top:24px;">
      Código Rojo — Streetwear Argentina · @codigorojo.ind
    </p>
  </div>
</body>
</html>`;
}

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;color:${TEXT};font-size:14px;border-bottom:1px solid ${BORDER};">
          ${i.name} <span style="color:${MUTED};">· Talle ${i.size} · x${i.quantity}</span>
        </td>
        <td style="padding:8px 0;color:${TEXT};font-size:14px;text-align:right;border-bottom:1px solid ${BORDER};">
          ${formatPrice(i.unitPrice * i.quantity)}
        </td>
      </tr>`
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;margin:8px 0;">${rows}</table>`;
}

function deliveryBlock(data: OrderEmailData): string {
  const label = DELIVERY_POINT_LABELS[data.deliveryPoint];
  const extra =
    data.deliveryPoint === "domicilio" && data.deliveryAddress
      ? `<br/>${data.deliveryAddress}`
      : "";
  const notes = data.deliveryNotes
    ? `<br/><span style="color:${MUTED};">${data.deliveryNotes}</span>`
    : "";
  return `
    <div style="margin-top:16px;padding:14px;background:${BG};border:1px solid ${BORDER};border-radius:8px;">
      <p style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Entrega</p>
      <p style="color:${TEXT};font-size:14px;margin:0;line-height:1.6;">
        ${label}${extra}${notes}
      </p>
    </div>`;
}

function totalRow(total: number): string {
  return `
    <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:2px solid ${BORDER};">
      <span style="color:${TEXT};font-size:16px;font-weight:700;">Total</span>
      <span style="color:${RED};font-size:16px;font-weight:700;">${formatPrice(total)}</span>
    </div>`;
}

export function orderConfirmationHtml(data: OrderEmailData): string {
  const inner = `
    <p style="color:${MUTED};font-size:14px;margin:0 0 16px;line-height:1.6;">
      Hola ${data.customerName || "👋"}, recibimos tu pago. Tu pedido
      <strong style="color:${TEXT};">#${data.orderId}</strong> está confirmado.
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${deliveryBlock(data)}
    ${
      data.pagoManual && data.pagoManual.resto > 0
        ? `<p style="color:${TEXT};font-size:14px;margin-top:16px;line-height:1.6;">
      Recibimos tu seña de <strong>${formatPrice(data.pagoManual.monto)}</strong>. Te queda pagar
      <strong style="color:${RED};">${formatPrice(data.pagoManual.resto)}</strong> en efectivo cuando retirás.
    </p>`
        : ""
    }
    <p style="color:${MUTED};font-size:13px;margin-top:20px;">Te vamos a escribir por WhatsApp para coordinar la entrega. ¡Gracias por elegir Código Rojo!</p>
    ${bloqueDerechos()}
  `;
  return shell("¡Pedido confirmado!", inner);
}

/**
 * El derecho de arrepentimiento, destacado en el mail que confirma la compra:
 * la Ley 24.240 (art. 34) y el Código Civil y Comercial (art. 1111) piden
 * informarlo en los documentos de la venta. De paso, los cambios.
 */
function bloqueDerechos(): string {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const link = (ruta: string, texto: string) =>
    sitio ? `<a href="${sitio}${ruta}" style="color:${RED};">${texto}</a>` : texto;
  return `
    <div style="margin-top:20px;padding:14px 16px;border-left:3px solid ${RED};background:${BG};border-radius:4px;">
      <p style="color:${TEXT};font-size:13px;margin:0 0 6px;line-height:1.6;">
        <strong>Tenés 10 días corridos desde que recibís tu pedido para arrepentirte de la compra</strong>,
        sin dar explicaciones: ${link("/arrepentimiento", "botón de arrepentimiento")}.
      </p>
      <p style="color:${MUTED};font-size:13px;margin:0;line-height:1.6;">
        Si preferís cambiar el talle o la prenda: ${link("/cambios", "cambios y devoluciones")}.
      </p>
    </div>`;
}

function bloqueTransferencia(p: PagoManualEmail): string {
  const que =
    p.medio === "efectivo"
      ? `Para reservar, transferí la seña de <strong style="color:${RED};">${formatPrice(p.monto)}</strong>.
         El resto, <strong>${formatPrice(p.resto)}</strong>, lo pagás en efectivo cuando retirás.`
      : `Transferí <strong style="color:${RED};">${formatPrice(p.monto)}</strong>.`;
  return `
    <div style="margin:16px 0;padding:16px;background:${BG};border:1px solid ${RED};border-radius:8px;">
      <p style="color:${TEXT};font-size:14px;margin:0 0 10px;line-height:1.6;">${que}</p>
      <p style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Alias</p>
      <p style="color:${TEXT};font-size:18px;font-weight:700;margin:0 0 10px;">${p.alias ?? "—"}</p>
      ${p.titular ? `<p style="color:${MUTED};font-size:13px;margin:0 0 10px;">A nombre de ${p.titular}</p>` : ""}
      ${
        p.venceEl
          ? `<p style="color:${MUTED};font-size:13px;margin:0;">Tenés tiempo hasta el <strong style="color:${TEXT};">${formatFechaHora(p.venceEl)}</strong>: si no, el pedido se cancela solo y las prendas vuelven a estar a la venta.</p>`
          : ""
      }
    </div>`;
}

/** Al cliente, apenas hace un pedido por transferencia o efectivo. */
export function instruccionesTransferenciaHtml(data: OrderEmailData): string {
  if (!data.pagoManual) return orderConfirmationHtml(data);
  const inner = `
    <p style="color:${MUTED};font-size:14px;margin:0 0 8px;line-height:1.6;">
      Hola ${data.customerName || "👋"}, te reservamos el pedido
      <strong style="color:${TEXT};">#${data.orderId}</strong>.
    </p>
    ${bloqueTransferencia(data.pagoManual)}
    <p style="color:${MUTED};font-size:13px;margin:0 0 16px;line-height:1.6;">
      Cuando transfieras, mandanos el comprobante por WhatsApp y te confirmamos.
      ${data.pagoManual.url ? `<br/><a href="${data.pagoManual.url}" style="color:${RED};">Ver los datos para transferir</a>` : ""}
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${deliveryBlock(data)}
  `;
  return shell("Tu pedido está reservado", inner);
}

/** A la tienda, apenas entra un pedido por transferencia o efectivo. */
export function pedidoTransferenciaAdminHtml(data: OrderEmailData): string {
  const p = data.pagoManual;
  if (!p) return adminNotificationHtml(data);
  const inner = `
    <p style="color:${MUTED};font-size:14px;margin:0 0 16px;line-height:1.6;">
      Pedido <strong style="color:${TEXT};">#${data.orderId}</strong> por
      <strong style="color:${TEXT};">${p.medio === "efectivo" ? "efectivo con seña" : "transferencia"}</strong>.
      Las prendas ya quedaron reservadas.<br/>
      Cliente: ${data.customerName || "—"} · ${data.customerPhone || "sin teléfono"}
    </p>
    <div style="margin:0 0 16px;padding:14px;background:${BG};border:1px solid ${BORDER};border-radius:8px;">
      <p style="color:${TEXT};font-size:14px;margin:0;line-height:1.7;">
        Esperando una transferencia de <strong style="color:${RED};">${formatPrice(p.monto)}</strong>
        ${p.resto > 0 ? `<br/>Resto en efectivo al retirar: <strong>${formatPrice(p.resto)}</strong>` : ""}
        ${p.venceEl ? `<br/><span style="color:${MUTED};">Si no llega antes del ${formatFechaHora(p.venceEl)}, se cancela solo y las prendas vuelven al stock.</span>` : ""}
      </p>
    </div>
    <p style="color:${MUTED};font-size:13px;margin:0 0 16px;">
      Cuando veas la plata en tu cuenta, entrá al panel → Órdenes → #${data.orderId} y tocá «Recibí la transferencia».
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${deliveryBlock(data)}
  `;
  return shell("Nuevo pedido: esperando transferencia", inner);
}

export function adminNotificationHtml(data: OrderEmailData): string {
  const avisoSinStock = data.sinStock
    ? `<div style="border:1px solid #ef4444;background:#450a0a;border-radius:8px;padding:12px 16px;margin:0 0 16px;">
      <p style="color:#fca5a5;font-size:14px;font-weight:bold;margin:0 0 4px;">⚠️ Se vendió sin stock</p>
      <p style="color:#e5e5e5;font-size:13px;margin:0;line-height:1.5;">
        Cuando se confirmó el pago, alguna prenda de esta orden ya no tenía unidades. El cliente ya pagó:
        escribile y ofrecele esperar a que repongas, cambiarla, o devolverle la plata desde Mercado Pago.
      </p>
    </div>`
    : "";
  const inner = `
    ${avisoSinStock}
    <p style="color:${MUTED};font-size:14px;margin:0 0 16px;line-height:1.6;">
      Nueva orden pagada <strong style="color:${TEXT};">#${data.orderId}</strong><br/>
      Cliente: ${data.customerName || "—"} · ${data.customerPhone || "sin teléfono"}
      ${data.customerEmail ? `<br/>${data.customerEmail}` : ""}
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${deliveryBlock(data)}
  `;
  return shell("Nueva orden", inner);
}
