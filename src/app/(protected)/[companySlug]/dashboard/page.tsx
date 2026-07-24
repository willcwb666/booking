import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookingDashboardStats } from "@/server/queries/bookings";
import { getReviewStats } from "@/server/queries/reviews";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await getCompanyBySlugForUser(companySlug, session.user.id);
  if (!company) notFound();

  const [stats, reviewStats] = await Promise.all([
    getBookingDashboardStats(company.id),
    getReviewStats(company.id),
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
    />
  );
}
