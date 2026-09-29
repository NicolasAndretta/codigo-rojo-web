import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// La imagen que muestran WhatsApp, Instagram y Google cuando alguien comparte
// cualquier link de la tienda que no tenga una propia (las fichas de producto
// usan la foto de la prenda). Se genera una vez, al compilar.
//
// Es solo texto a propósito: el logo va a cambiar (Agustina tiene uno nuevo) y
// así esta imagen no hay que rehacerla. Cuando esté el logo definitivo, se puede
// sumar acá.
export const alt = "Código Rojo — Streetwear argentino. Tu estilo, bajo control.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Bebas Neue, la misma de los títulos del sitio. El archivo vive en el repo
  // (licencia OFL, en assets/fonts) para que el build no dependa de bajarla.
  const bebas = await readFile(join(process.cwd(), "assets/fonts/BebasNeue-Regular.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0a0a 55%, #3b0a0a 100%)",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 8,
            color: "#f87171",
            border: "2px solid #7f1d1d",
            borderRadius: 999,
            padding: "8px 24px",
            alignSelf: "flex-start",
          }}
        >
          STREETWEAR ARGENTINA
        </div>
        <div style={{ display: "flex", fontFamily: "Bebas Neue", fontSize: 210, marginTop: 28, lineHeight: 1, letterSpacing: 4 }}>
          CÓDIGO<span style={{ color: "#dc2626", marginLeft: 40 }}>ROJO</span>
        </div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 36, color: "#d4d4d4" }}>
          Tu estilo, bajo control.
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Bebas Neue", data: bebas, style: "normal", weight: 400 }] }
  );
}
