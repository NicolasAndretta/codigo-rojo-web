import { MessageCircle } from "lucide-react";
import { formatWhatsAppUrl } from "@/lib/utils/format";

export default function WhatsAppFloat() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;

  const url = formatWhatsAppUrl(number, "Hola! Tengo una consulta sobre Código Rojo.");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg shadow-green-900/40 transition-transform hover:scale-110 active:scale-95"
    >
      <MessageCircle size={26} />
    </a>
  );
}
