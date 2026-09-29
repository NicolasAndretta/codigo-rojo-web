import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No anunciar "X-Powered-By: Next.js": no le sirve a nadie más que a quien
  // busca qué versión atacar.
  poweredByHeader: false,

  // Headers de seguridad básicos. CSP queda afuera a propósito: con el checkout
  // de MP, las fotos de Supabase y los scripts de Next, una CSP mal armada rompe
  // la tienda en silencio. Si se suma, primero en modo Report-Only.
  // (En la URL provisoria, el CDN de Hostinger puede pisar algunos de estos.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Sin "camera": Agustina saca las fotos con la cámara desde el panel, y
          // no vale arriesgar justo ese flujo por un permiso que acá no suma.
          { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      // El default de Next es 1 MB, y era la causa raíz de que Agustina no
      // pudiera cargar productos desde la tablet: una foto de cámara pesa
      // entre 3 y 8 MB, así que volvía 413 antes de que la action corriera.
      //
      // El arreglo de verdad es `lib/image-client.ts`, que achica la foto en
      // el navegador a ~300 KB antes de mandarla (y como mucho 1,5 MB, que es
      // donde corta su red de seguridad). Esto es el cinturón: da margen de
      // sobra para eso sin dejar la puerta abierta a subidas de cualquier
      // tamaño. No subirlo más "por las dudas": si algo llega cerca de este
      // número, es que el achique del navegador falló y conviene enterarse.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
