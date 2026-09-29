import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { tokenDeLaTienda } from "@/lib/mercadopago/conexion";

// Init perezosa: nada se ejecuta al importar el módulo (build-safe aunque no
// haya credenciales). Sólo se instancia al hacer una llamada real.
//
// De dónde sale el token, en orden:
//   1. La cuenta que la tienda conectó desde /admin/cobros (MP Connect). Es el
//      camino normal en producción: la plata cae en la cuenta de Agustina.
//   2. MP_ACCESS_TOKEN de las variables de entorno, como respaldo. Sirve para
//      desarrollo local con un usuario de prueba. En producción NO se carga: un
//      token equivocado ahí cobraría en otra cuenta (el 29/09/2026 casi se carga
//      el de la cuenta de Nico).
//
// El webhook usa el mismo orden, y tiene que ser así: un pago cobrado con el
// token de la tienda solo se puede consultar con ese mismo token.
async function getConfig() {
  const accessToken = (await tokenDeLaTienda()) ?? process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "Mercado Pago no está conectado: la tienda tiene que conectar su cuenta en /admin/cobros"
    );
  }
  return new MercadoPagoConfig({ accessToken });
}

export async function getPreferenceClient() {
  return new Preference(await getConfig());
}

export async function getPaymentClient() {
  return new Payment(await getConfig());
}
