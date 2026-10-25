import type { MetadataRoute } from "next";

import { strings } from "@/lib/strings";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: strings.app.fullName,
    short_name: strings.app.name,
    description: strings.app.description,
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfcf9",
    theme_color: "#2f4f8f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
