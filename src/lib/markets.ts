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
    phonePlaceholder: "(11) 99999-9999",
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
    phonePlaceholder: "(720) 555-0123",
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
