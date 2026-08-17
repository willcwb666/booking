import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getCompanyRolesAction } from "@/server/actions/company-roles";
import { getAllCompanyServicesForSelect } from "@/server/queries/services";
import { notFound } from "next/navigation";
import { ProfessionalFormClient } from "../_components/professional-form-client";

export default async function NovoProfissionalPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [services, roles] = await Promise.all([
    getAllCompanyServicesForSelect(company.id),
    getCompanyRolesAction(companySlug),
  ]);

  return (
    <ProfessionalFormClient
      companySlug={companySlug}
      companyServices={services}
      companyRoles={roles}
    />
  );
}
