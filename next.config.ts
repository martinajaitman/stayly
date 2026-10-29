import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components queda desactivado: casi toda la app es por usuario
  // (panel autenticado y portal por token) y se renderiza por request.
  experimental: {
    // Fotos de documentos y de limpieza: se achican en el navegador, esto es margen.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
