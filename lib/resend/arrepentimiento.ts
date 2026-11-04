import { getResend } from "./client";

type Pedido = {
  codigo: string;
  nombre: string;
  telefono: string;
  email: string | null;
  numero_pedido: string | null;
  motivo: string | null;
};

function esc(s: string | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Aviso a la tienda: alguien usó el botón de arrepentimiento. Y si dejó mail,
 * el comprobante con su código. Best-effort: nunca lanza (el pedido ya quedó
 * guardado y el cliente ya vio su código en pantalla).
 */
export async function avisarArrepentimiento(p: Pedido): Promise<void> {
  try {
    const resend = getResend();
    const from = process.env.EMAIL_FROM ?? "Código Rojo <onboarding@resend.dev>";
    const admin = process.env.ADMIN_EMAIL;

    if (admin) {
      await resend.emails.send({
        from,
        to: admin,
        subject: `↩️ Pedido de arrepentimiento ${p.codigo}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">
          <p><strong>${esc(p.nombre)}</strong> pidió arrepentirse de una compra.</p>
          <p>Código: <strong>${esc(p.codigo)}</strong><br/>
          Teléfono: ${esc(p.telefono)}<br/>
          ${p.email ? `Mail: ${esc(p.email)}<br/>` : ""}
          ${p.numero_pedido ? `Pedido: ${esc(p.numero_pedido)}<br/>` : ""}
          ${p.motivo ? `Motivo: ${esc(p.motivo)}` : ""}</p>
          <p>Tenés que contactarlo para coordinar la devolución. Por ley, el envío de vuelta lo paga la tienda.
          Lo ves también en el panel → Arrepentimientos.</p>
        </div>`,
      });
    }

    if (p.email) {
      await resend.emails.send({
        from,
        to: p.email,
        subject: `Recibimos tu pedido de arrepentimiento — ${p.codigo}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">
          <p>Hola ${esc(p.nombre)}, recibimos tu pedido para arrepentirte de la compra.</p>
          <p>Tu código de trámite es <strong>${esc(p.codigo)}</strong>.</p>
          <p>Te vamos a escribir para coordinar la devolución.</p>
          <p>— Código Rojo</p>
        </div>`,
      });
    }
  } catch (err) {
    console.error("[arrepentimiento] No se pudo mandar el aviso:", err instanceof Error ? err.message : err);
  }
}
