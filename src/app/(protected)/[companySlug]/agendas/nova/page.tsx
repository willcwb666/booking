import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getProfessionals } from "@/server/queries/professionals";
import { AgendaFormClient } from "../_components/agenda-form-client";
import { notFound, redirect } from "next/navigation";

export default async function NovaAgendaPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();
  if (company.members[0].role === "EMPLOYEE") redirect(`/${companySlug}/agendas`);

  const professionals = await getProfessionals(company.id);

  return (
    <AgendaFormClient
      companySlug={companySlug}
      professionals={professionals}
    />
  );
}
