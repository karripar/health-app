import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FORGE",
    short_name: "FORGE",
    description: "Local-first energy and nutrition dashboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#090B0A",
    theme_color: "#090B0A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
