import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Init perezosa: nada se ejecuta al importar el módulo (build-safe aunque
// MP_ACCESS_TOKEN esté vacío). Sólo se instancia al hacer una llamada real.
function getConfig() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN no está configurado en .env.local");
  }
  return new MercadoPagoConfig({ accessToken });
}

export function getPreferenceClient() {
  return new Preference(getConfig());
}

export function getPaymentClient() {
  return new Payment(getConfig());
}
