import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/server/queries/companies";
import { getCompanyCustomers } from "@/server/queries/customers";
import { ClientesClient } from "./clientes-client";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function ClientesPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const customers = await getCompanyCustomers(company.id);

  return <ClientesClient companySlug={companySlug} customers={customers} />;
}
