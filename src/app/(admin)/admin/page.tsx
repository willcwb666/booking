import { getCompaniesForSelector } from "@/server/queries/admin";
import { getPlatformActivity, getPlatformOverview } from "@/server/queries/analytics";
import { resolveRange, type RangeSearchParams } from "@/lib/analytics-range";
import { AdminOverviewClient } from "./admin-overview-client";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<RangeSearchParams & { currency?: string }>;
}) {
  const params = await searchParams;
  const range = resolveRange(params);

  // Só um código ISO 4217 passa. Sem isso o valor entraria numa comparação SQL
  // vinda direto da URL — vai por parâmetro posicional, mas validar na borda
  // evita que um lixo qualquer produza um painel silenciosamente vazio.
  const currency =
    typeof params.currency === "string" && /^[A-Z]{3}$/.test(params.currency)
      ? params.currency
      : undefined;

  const [overview, activity, companies] = await Promise.all([
    getPlatformOverview(range, currency),
    getPlatformActivity(8),
    getCompaniesForSelector(),
  ]);

  return (
    <AdminOverviewClient
      range={range}
      overview={overview}
      activity={activity}
      companies={companies}
      currency={currency}
    />
  );
}
