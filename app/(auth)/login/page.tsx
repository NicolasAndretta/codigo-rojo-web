import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Ingresar | Código Rojo",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
