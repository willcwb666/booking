import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookingDashboardStats } from "@/server/queries/bookings";
import { getReviewStats } from "@/server/queries/reviews";
import { getCompanyOverview } from "@/server/queries/analytics";
import { resolveRange, type RangeSearchParams } from "@/lib/analytics-range";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<RangeSearchParams>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await getCompanyBySlugForUser(companySlug, session.user.id);
  if (!company) notFound();

  const range = resolveRange(await searchParams);

  const [stats, reviewStats, overview] = await Promise.all([
    getBookingDashboardStats(company.id),
    getReviewStats(company.id),
    getCompanyOverview(company.id, range),
  ]);

  return (
    <DashboardClient
      userName={session.user.name}
      company={{
        name: company.name,
        slug: company.slug,
        businessType: company.businessType,
        planTier: company.plan.tier,
        planDisplayName: company.plan.displayName,
        role: company.members?.[0]?.role || "OWNER",
      }}
      stats={stats}
      reviewStats={reviewStats}
      range={range}
      overview={overview}
    />
  );
}
