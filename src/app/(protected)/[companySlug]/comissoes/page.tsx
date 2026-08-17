import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/server/queries/companies";
import { getCompanyCommissionReport } from "@/server/queries/commissions";
import { ComissoesClient } from "./comissoes-client";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ComissoesPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { from, to } = await searchParams;

  const company = await getCompanyBySlug(companySlug);
  if (!company) notFound();

  // Default: mês atual se não informado
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const defaultFrom = `${year}-${month}-01`;
  const defaultTo = new Date(year, now.getMonth() + 1, 0).toISOString().split("T")[0];

  const startDate = from || defaultFrom;
  const endDate = to || defaultTo;

  const report = await getCompanyCommissionReport(company.id, startDate, endDate);

  return (
    <ComissoesClient
      companySlug={companySlug}
      report={report}
      from={startDate}
      to={endDate}
    />
  );
}
