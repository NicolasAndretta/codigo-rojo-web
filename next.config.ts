import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
