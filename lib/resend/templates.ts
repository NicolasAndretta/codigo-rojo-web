import { formatPrice } from "@/lib/utils/format";

export type OrderEmailItem = {
  name: string;
  size: string;
  quantity: number;
  unitPrice: number;
};

export type OrderEmailAddress = {
  full_name: string;
  phone: string;
  street: string;
  number: string;
  floor_apt: string | null;
  localidad: string;
  provincia: string;
  codigo_postal: string;
  notes: string | null;
};

export type OrderEmailData = {
  orderId: number;
  customerName: string;
  customerEmail: string;
  total: number;
  deliveryType: "pickup" | "delivery";
  items: OrderEmailItem[];
  address: OrderEmailAddress | null;
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

function addressBlock(a: OrderEmailAddress): string {
  return `
    <div style="margin-top:16px;padding:14px;background:${BG};border:1px solid ${BORDER};border-radius:8px;">
      <p style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Envío a domicilio</p>
      <p style="color:${TEXT};font-size:14px;margin:0;line-height:1.6;">
        ${a.full_name} · ${a.phone}<br/>
        ${a.street} ${a.number}${a.floor_apt ? `, ${a.floor_apt}` : ""}<br/>
        ${a.localidad}, ${a.provincia} (CP ${a.codigo_postal})
        ${a.notes ? `<br/><span style="color:${MUTED};">${a.notes}</span>` : ""}
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
  const delivery =
    data.deliveryType === "pickup"
      ? `<p style="color:${MUTED};font-size:14px;margin:12px 0 0;">Retiro en local — te contactamos por WhatsApp para coordinar.</p>`
      : data.address
        ? addressBlock(data.address)
        : "";

  const inner = `
    <p style="color:${MUTED};font-size:14px;margin:0 0 16px;line-height:1.6;">
      Hola ${data.customerName || "👋"}, recibimos tu pago. Tu pedido
      <strong style="color:${TEXT};">#${data.orderId}</strong> está confirmado.
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${delivery}
    <p style="color:${MUTED};font-size:13px;margin-top:20px;">¡Gracias por elegir Código Rojo!</p>
  `;
  return shell("¡Pedido confirmado!", inner);
}

export function adminNotificationHtml(data: OrderEmailData): string {
  const delivery =
    data.deliveryType === "pickup"
      ? `<p style="color:${MUTED};font-size:14px;margin:12px 0 0;">Modalidad: <strong style="color:${TEXT};">Retiro en local</strong></p>`
      : data.address
        ? addressBlock(data.address)
        : "";

  const inner = `
    <p style="color:${MUTED};font-size:14px;margin:0 0 16px;line-height:1.6;">
      Nueva orden pagada <strong style="color:${TEXT};">#${data.orderId}</strong><br/>
      Cliente: ${data.customerName || "—"} (${data.customerEmail || "sin email"})
    </p>
    ${itemsTable(data.items)}
    ${totalRow(data.total)}
    ${delivery}
  `;
  return shell("Nueva orden", inner);
}
