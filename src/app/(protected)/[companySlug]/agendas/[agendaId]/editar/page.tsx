import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getProfessionals } from "@/server/queries/professionals";
import { getAgendaById } from "@/server/queries/agendas";
import { AgendaFormClient } from "../../_components/agenda-form-client";
import { notFound, redirect } from "next/navigation";

export default async function EditarAgendaPage({
  params,
}: {
  params: Promise<{ companySlug: string; agendaId: string }>;
}) {
  const { companySlug, agendaId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();
  if (company.members[0].role === "EMPLOYEE") redirect(`/${companySlug}/agendas`);

  const [agenda, professionals] = await Promise.all([
    getAgendaById(agendaId, company.id),
    getProfessionals(company.id),
  ]);

  if (!agenda || agenda.status === "CANCELLED") notFound();

  return (
    <AgendaFormClient
      companySlug={companySlug}
      professionals={professionals}
      existing={agenda}
    />
  );
}
