import { Metadata } from "next";
import CartPageClient from "./CartPageClient";

export const metadata: Metadata = {
  title: "Carrito | Código Rojo",
};

export default function CarritoPage() {
  return <CartPageClient />;
}
