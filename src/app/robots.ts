import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kreator.com.br";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/settings",
          "/api/",
          "/receipt/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
