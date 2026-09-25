import type { MetadataRoute } from "next";
import { LEGAL_LINKS } from "@/lib/legal/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const publicPages = ["/", ...LEGAL_LINKS.map(({ href }) => href), "/login", "/register"];

  return publicPages.map((path) => ({ url: `${appUrl}${path}` }));
}