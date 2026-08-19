import { notFound } from "next/navigation";
import { getCompanyBySlug } from "@/server/queries/companies";
import { getCompanyCustomers } from "@/server/queries/customers";
import { canAccessModule } from "@/lib/module-guard";
import { VAULT_MODULE } from "@/lib/client-vault";
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

  const [customers, vaultAccess] = await Promise.all([
    getCompanyCustomers(company.id),
    canAccessModule(companySlug, VAULT_MODULE),
  ]);

  return (
    <ClientesClient
      companySlug={companySlug}
      customers={customers}
      hasVault={vaultAccess.ok}
    />
  );
}
