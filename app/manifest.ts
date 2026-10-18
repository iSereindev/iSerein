import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "iSEREIN",
    short_name: "iSEREIN",
    description:
      "One thoughtful page a day. Explore readings about Self, Life, and Growth.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F6F0E8",
    theme_color: "#F6F0E8",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/iserein-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/iserein-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/iserein-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
