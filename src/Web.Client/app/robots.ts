import type { MetadataRoute } from "next";
import { LEGAL_LINKS } from "@/lib/legal/constants";

// Tydee is a private finance app: only the public entry pages should be
// indexed, never anyone's dashboard.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [...LEGAL_LINKS.map(({ href }) => href), "/login", "/register"],
      disallow: "/",
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}