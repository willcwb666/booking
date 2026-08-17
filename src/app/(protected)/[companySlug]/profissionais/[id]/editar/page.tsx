import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getProfessionalByIdAction } from "@/server/actions/professionals";
import { getCompanyRolesAction } from "@/server/actions/company-roles";
import { getAllCompanyServicesForSelect } from "@/server/queries/services";
import { notFound } from "next/navigation";
import { ProfessionalFormClient } from "../../_components/professional-form-client";

export default async function EditarProfissionalPage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [professionalData, services, roles] = await Promise.all([
    getProfessionalByIdAction(companySlug, id),
    getAllCompanyServicesForSelect(company.id),
    getCompanyRolesAction(companySlug),
  ]);

  if (!professionalData) notFound();

  return (
    <ProfessionalFormClient
      companySlug={companySlug}
      initialData={professionalData}
      companyServices={services}
      companyRoles={roles}
    />
  );
}
