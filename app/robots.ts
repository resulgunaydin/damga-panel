import type { MetadataRoute } from "next";

// Özel panel — hiçbir botun indekslemesine izin verme.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
