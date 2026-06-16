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
  description: "Ropa urbana con identidad. Remeras, hoodies y más.",
  openGraph: {
    title: "Código Rojo",
    description: "Ropa urbana con identidad.",
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
