import { formatPrice } from "@/lib/utils/format";
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
    <p style="color:${MUTED};font-size:13px;margin-top:20px;">Te vamos a escribir por WhatsApp para coordinar la entrega. ¡Gracias por elegir Código Rojo!</p>
  `;
  return shell("¡Pedido confirmado!", inner);
}

export function adminNotificationHtml(data: OrderEmailData): string {
  const inner = `
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
