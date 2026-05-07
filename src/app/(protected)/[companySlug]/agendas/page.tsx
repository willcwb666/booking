import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getAgendas } from "@/server/queries/agendas";
import { getProfessionals } from "@/server/queries/professionals";
import { AgendasClient } from "./agendas-client";
import { notFound } from "next/navigation";
import type { AgendaStatus } from "@/generated/prisma/client";

export default async function AgendasPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const { companySlug } = await params;
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const rawStatuses = sp.status
    ? Array.isArray(sp.status) ? sp.status : [sp.status]
    : ["ACTIVE", "DRAFT"];

  const validStatuses = rawStatuses.filter((s): s is AgendaStatus =>
    ["DRAFT", "ACTIVE", "CANCELLED"].includes(s)
  );

  const [agendas, professionals] = await Promise.all([
    getAgendas(company.id, {
      statuses: validStatuses,
      from: sp.from as string | undefined,
      to: sp.to as string | undefined,
      professionalId: sp.professionalId as string | undefined,
    }),
    getProfessionals(company.id),
  ]);

  const role = company.members[0].role;

  return (
    <AgendasClient
      companySlug={companySlug}
      agendas={agendas}
      professionals={professionals}
      role={role}
      activeStatuses={validStatuses}
    />
  );
}
