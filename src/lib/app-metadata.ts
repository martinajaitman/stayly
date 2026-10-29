import type { Metadata, Viewport } from "next";

// Metadatos de la app instalable (admin, limpieza y profesionales). La página
// web del huésped no los usa, así no se ofrece para instalar.
export const appMetadata: Metadata = {
  manifest: "/app.webmanifest",
  appleWebApp: { capable: true, title: "Stayly", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const appViewport: Viewport = { themeColor: "#c8623e" };
