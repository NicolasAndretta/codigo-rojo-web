import { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout | Código Rojo",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
