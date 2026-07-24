// Mercados suportados — mapeia país → moeda, idioma, DDI e fusos.
// Compartilhado entre client (onboarding/configurações) e server (validação).

export type Market = {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string; // ex.: "+1"
  currency: string; // ISO 4217
  locale: string; // BCP 47
  phonePlaceholder: string; // formato nacional, sem DDI
  timezones: { id: string; label: string }[];
};

export const MARKETS: Market[] = [
  {
    code: "BR",
    name: "Brasil",
    dialCode: "+55",
    currency: "BRL",
    locale: "pt-BR",
    phonePlaceholder: "(41) 99562-0999",
    timezones: [
      { id: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
      { id: "America/Cuiaba", label: "Cuiabá (MT/MS)" },
      { id: "America/Manaus", label: "Manaus (AM)" },
      { id: "America/Rio_Branco", label: "Rio Branco (AC)" },
      { id: "America/Noronha", label: "Fernando de Noronha" },
    ],
  },
  {
    code: "US",
    name: "Estados Unidos",
    dialCode: "+1",
    currency: "USD",
    locale: "en-US",
    phonePlaceholder: "(970) 402-4364",
    timezones: [
      { id: "America/New_York", label: "Eastern (New York)" },
      { id: "America/Chicago", label: "Central (Chicago)" },
      { id: "America/Denver", label: "Mountain (Denver)" },
      { id: "America/Phoenix", label: "Arizona (Phoenix)" },
      { id: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
      { id: "America/Anchorage", label: "Alaska (Anchorage)" },
      { id: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
    ],
  },
  {
    code: "CA",
    name: "Canadá",
    dialCode: "+1",
    currency: "CAD",
    locale: "en-CA",
    phonePlaceholder: "(416) 555-0123",
    timezones: [
      { id: "America/Halifax", label: "Atlantic (Halifax)" },
      { id: "America/Toronto", label: "Eastern (Toronto)" },
      { id: "America/Winnipeg", label: "Central (Winnipeg)" },
      { id: "America/Edmonton", label: "Mountain (Edmonton)" },
      { id: "America/Vancouver", label: "Pacific (Vancouver)" },
    ],
  },
  {
    code: "MX",
    name: "México",
    dialCode: "+52",
    currency: "MXN",
    locale: "es-MX",
    phonePlaceholder: "55 1234 5678",
    timezones: [
      { id: "America/Mexico_City", label: "Centro (Ciudad de México)" },
      { id: "America/Cancun", label: "Sureste (Cancún)" },
      { id: "America/Chihuahua", label: "Pacífico (Chihuahua)" },
      { id: "America/Tijuana", label: "Noroeste (Tijuana)" },
    ],
  },
  {
    code: "AR",
    name: "Argentina",
    dialCode: "+54",
    currency: "ARS",
    locale: "es-AR",
    phonePlaceholder: "11 1234-5678",
    timezones: [{ id: "America/Argentina/Buenos_Aires", label: "Buenos Aires" }],
  },
  {
    code: "PT",
    name: "Portugal",
    dialCode: "+351",
    currency: "EUR",
    locale: "pt-PT",
    phonePlaceholder: "912 345 678",
    timezones: [
      { id: "Europe/Lisbon", label: "Lisboa" },
      { id: "Atlantic/Azores", label: "Açores" },
    ],
  },
  {
    code: "ES",
    name: "Espanha",
    dialCode: "+34",
    currency: "EUR",
    locale: "es-ES",
    phonePlaceholder: "612 34 56 78",
    timezones: [
      { id: "Europe/Madrid", label: "Madri" },
      { id: "Atlantic/Canary", label: "Canárias" },
    ],
  },
  {
    code: "GB",
    name: "Reino Unido",
    dialCode: "+44",
    currency: "GBP",
    locale: "en-GB",
    phonePlaceholder: "7700 900123",
    timezones: [{ id: "Europe/London", label: "Londres" }],
  },
  {
    code: "AU",
    name: "Austrália",
    dialCode: "+61",
    currency: "AUD",
    locale: "en-AU",
    phonePlaceholder: "412 345 678",
    timezones: [
      { id: "Australia/Sydney", label: "Eastern (Sydney)" },
      { id: "Australia/Brisbane", label: "Queensland (Brisbane)" },
      { id: "Australia/Adelaide", label: "Central (Adelaide)" },
      { id: "Australia/Perth", label: "Western (Perth)" },
    ],
  },
];

export function getMarket(code: string): Market | undefined {
  return MARKETS.find((m) => m.code === code);
}

/** Detecta o mercado pelo fuso do navegador (ex.: America/Denver → US). */
export function findMarketByTimezone(tz: string): Market | undefined {
  return MARKETS.find((m) => m.timezones.some((t) => t.id === tz));
}

export function isValidTimezoneForMarket(code: string, tz: string): boolean {
  const market = getMarket(code);
  return Boolean(market?.timezones.some((t) => t.id === tz));
}

/**
 * Detecta automaticamente o país, idioma, formato de telefone e fuso horário
 * com base na localização e idioma do navegador do usuário.
 */
export function detectUserMarket(): { market: Market; timezoneId: string } {
  try {
    if (typeof window === "undefined") {
      const defaultBr = getMarket("BR")!;
      return { market: defaultBr, timezoneId: defaultBr.timezones[0].id };
    }

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const userLang = (navigator.language || (navigator.languages && navigator.languages[0]) || "").toLowerCase();

    // 1. Tenta encontrar mercado por correspondência exata de fuso
    if (userTz) {
      const marketByTz = findMarketByTimezone(userTz);
      if (marketByTz) {
        return { market: marketByTz, timezoneId: userTz };
      }
    }

    // 2. Se o idioma for inglês ou fuso dos EUA/Canadá
    if (userLang.startsWith("en")) {
      if (userLang.includes("ca") || userTz.includes("Toronto") || userTz.includes("Vancouver")) {
        const ca = getMarket("CA")!;
        return { market: ca, timezoneId: ca.timezones[0].id };
      }
      if (userLang.includes("gb") || userTz.includes("London")) {
        const gb = getMarket("GB")!;
        return { market: gb, timezoneId: gb.timezones[0].id };
      }
      if (userLang.includes("au") || userTz.includes("Sydney")) {
        const au = getMarket("AU")!;
        return { market: au, timezoneId: au.timezones[0].id };
      }
      const us = getMarket("US")!;
      return { market: us, timezoneId: userTz || us.timezones[0].id };
    }

    // 3. Se o idioma for espanhol
    if (userLang.startsWith("es")) {
      if (userLang.includes("mx") || userTz.includes("Mexico")) {
        const mx = getMarket("MX")!;
        return { market: mx, timezoneId: mx.timezones[0].id };
      }
      if (userLang.includes("ar") || userTz.includes("Buenos_Aires")) {
        const ar = getMarket("AR")!;
        return { market: ar, timezoneId: ar.timezones[0].id };
      }
      const es = getMarket("ES")!;
      return { market: es, timezoneId: es.timezones[0].id };
    }

    // 4. Se o idioma for português
    if (userLang.startsWith("pt")) {
      if (userLang.includes("pt-pt") || userTz.includes("Lisbon")) {
        const pt = getMarket("PT")!;
        return { market: pt, timezoneId: pt.timezones[0].id };
      }
      const br = getMarket("BR")!;
      return { market: br, timezoneId: userTz || br.timezones[0].id };
    }
  } catch {
    // Fallback silencioso
  }

  const defaultBr = getMarket("BR")!;
  return { market: defaultBr, timezoneId: defaultBr.timezones[0].id };
}

/**
 * Aplica máscara dinâmica de formatação no número de telefone conforme o país.
 */
export function formatPhoneNumber(value: string, countryCode: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (countryCode === "US" || countryCode === "CA") {
    // EUA/Canadá: (970) 402-4364
    const d = digits.slice(0, 10);
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  if (countryCode === "BR") {
    // Brasil: (41) 99562-0999 ou (041) 99562-0999
    if (digits.startsWith("0")) {
      const d = digits.slice(0, 12);
      if (d.length <= 3) return `(${d}`;
      if (d.length <= 8) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 8)}-${d.slice(8)}`;
    }
    const d = digits.slice(0, 11);
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  if (countryCode === "PT" || countryCode === "ES") {
    // Portugal / Espanha: 912 345 678
    const d = digits.slice(0, 9);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }

  // Outros países: formatação genérica com espaços a cada 3/4 dígitos
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
}
