import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const SUPPORTED_LOCALES = ["pt-BR", "en", "es", "pt-PT"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

/** Casa um código BCP 47 do navegador com um locale suportado. */
function matchLocale(tag: string): AppLocale | null {
  const lower = tag.toLowerCase();
  if (lower === "pt-br") return "pt-BR";
  if (lower === "pt-pt") return "pt-PT";
  if (lower.startsWith("pt")) return "pt-BR"; // "pt" genérico → maior base de usuários
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("en")) return "en";
  return null;
}

/** Negocia o locale pelo Accept-Language (ordem de preferência do navegador). */
function negotiateFromHeader(acceptLanguage: string | null): AppLocale | null {
  if (!acceptLanguage) return null;
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      return { tag, q: qPart ? parseFloat(qPart) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return null;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;

  let locale: AppLocale;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as AppLocale)) {
    locale = cookieLocale as AppLocale;
  } else {
    const hdrs = await headers();
    locale = negotiateFromHeader(hdrs.get("accept-language")) ?? DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
