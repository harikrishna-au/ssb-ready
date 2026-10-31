import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReadyKadet",
    short_name: "ReadyKadet",
    description: "Timed SSB practice with feedback on every attempt.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1220",
    theme_color: "#4b7bf5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
