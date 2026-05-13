import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FBJJMMA — Premiação",
    short_name: "FBJJMMA",
    description: "Sistema de Premiação FBJJMMA",
    start_url: "/premiacao",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "256x256",
        type: "image/x-icon",
      },
      {
        src: "/logo-color.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  }
}
