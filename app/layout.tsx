import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Código Rojo | Streetwear Argentina",
  description:
    "Tu estilo, bajo control. Streetwear argentino con identidad: remeras, buzos, pantalones y más. Envíos a CABA y zona oeste.",
  openGraph: {
    title: "Código Rojo — Tu estilo, bajo control.",
    description: "Streetwear argentino con identidad. Prendas urbanas, diseños limitados.",
    type: "website",
  },
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
