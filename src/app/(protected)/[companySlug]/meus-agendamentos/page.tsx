import { getCompanyBySlug } from "@/server/queries/companies";
import { notFound } from "next/navigation";
import { MeusAgendamentosClient } from "./meus-agendamentos-client";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function MeusAgendamentosPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  return <MeusAgendamentosClient companySlug={companySlug} companyName={company.name} />;
}
