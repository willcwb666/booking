// Formatação sensível ao mercado da empresa (currency ISO 4217 + locale BCP 47).
// Compartilhado entre server e client components.

export function formatMoney(
  value: number,
  currency: string = "BRL",
  locale: string = "pt-BR"
): string {
  try {
    return value.toLocaleString(locale, { style: "currency", currency });
  } catch {
    // currency/locale inválidos gravados no banco não podem quebrar a página
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
