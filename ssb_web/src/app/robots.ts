import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/history", "/profile", "/onboarding", "/applications", "/piq", "/olq-profile", "/premium", "/sign-in", "/sign-up"] },
    sitemap: abs("/sitemap.xml"),
  };
}
