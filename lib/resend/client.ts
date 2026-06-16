import { Resend } from "resend";

// Init perezosa: build-safe aunque RESEND_API_KEY esté vacío.
export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurado en .env.local");
  }
  return new Resend(apiKey);
}
