import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMembershipStats, getCompanyMembershipPlans, getCompanyMemberships } from "@/server/queries/memberships";
import { getAllCompanyServicesForSelect } from "@/server/queries/services";
import { AssinaturasClient } from "./assinaturas-client";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string; status?: string }>;
};

export default async function AssinaturasPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { page, pageSize, q, status } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, currency: true },
  });
  if (!company) redirect("/dashboard");

  const currentPage = page ? parseInt(page, 10) : 1;
  const currentPageSize = pageSize ? parseInt(pageSize, 10) : 10;

  const [stats, plans, membershipsResult, services] = await Promise.all([
    getMembershipStats(companySlug),
    getCompanyMembershipPlans(companySlug),
    getCompanyMemberships(companySlug, {
      page: currentPage,
      pageSize: currentPageSize,
      search: q,
      status: status || "ALL",
    }),
    getAllCompanyServicesForSelect(company.id),
  ]);

  return (
    <AssinaturasClient
      companySlug={companySlug}
      companyName={company.name}
      currency={company.currency}
      stats={stats}
      plans={plans}
      membershipsResult={membershipsResult}
      services={services}
      currentSearch={q || ""}
      currentStatus={status || "ALL"}
    />
  );
}
