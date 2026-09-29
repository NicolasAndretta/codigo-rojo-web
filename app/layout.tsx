import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

// metadataBase hace absolutas las URLs de las imágenes de vista previa: sin eso,
// WhatsApp e Instagram no muestran ninguna imagen al compartir un link.
// La imagen por defecto es app/opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Código Rojo | Streetwear Argentina",
  description:
    "Tu estilo, bajo control. Streetwear argentino con identidad: remeras, buzos, pantalones y más. Envíos a CABA y zona oeste.",
  openGraph: {
    title: "Código Rojo — Tu estilo, bajo control.",
    description: "Streetwear argentino con identidad. Prendas urbanas, diseños limitados.",
    type: "website",
    siteName: SITE_NAME,
    locale: "es_AR",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${bebasNeue.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-50 antialiased">
        {children}
      </body>
    </html>
  );
}
