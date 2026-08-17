import { getCompanyReportsAction } from "@/server/actions/reports";
import { CompanyRelatoriosClient } from "./relatorios-client";

export default async function CompanyRelatoriosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const res = await getCompanyReportsAction(companySlug);
  return <CompanyRelatoriosClient companySlug={companySlug} reports={res.reports} />;
}
