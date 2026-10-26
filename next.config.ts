import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components queda desactivado: casi toda la app es por usuario
  // (panel autenticado y portal por token) y se renderiza por request.
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
