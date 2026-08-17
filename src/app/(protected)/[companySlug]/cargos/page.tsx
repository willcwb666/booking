import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getCompanyRolesAction } from "@/server/actions/company-roles";
import { notFound } from "next/navigation";
import { CompanyCargosClient } from "./cargos-client";

export default async function CompanyCargosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const roles = await getCompanyRolesAction(companySlug);

  return (
    <CompanyCargosClient
      companySlug={companySlug}
      companyName={company.name}
      businessType={company.businessType}
      roles={roles}
    />
  );
}
