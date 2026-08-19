import { getCompaniesForSelector } from "@/server/queries/admin";
import { getPlatformActivity, getPlatformOverview } from "@/server/queries/analytics";
import { resolveRange, type RangeSearchParams } from "@/lib/analytics-range";
import { AdminOverviewClient } from "./admin-overview-client";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<RangeSearchParams>;
}) {
  const range = resolveRange(await searchParams);

  const [overview, activity, companies] = await Promise.all([
    getPlatformOverview(range),
    getPlatformActivity(8),
    getCompaniesForSelector(),
  ]);

  return (
    <AdminOverviewClient
      range={range}
      overview={overview}
      activity={activity}
      companies={companies}
    />
  );
}
