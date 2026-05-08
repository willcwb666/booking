import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExcecoesClient } from "./excecoes-client";

export default async function ExcecoesPage({
  params,
}: {
  params: Promise<{ companySlug: string; agendaId: string }>;
}) {
  const { companySlug, agendaId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, companyId: company.id },
    include: { exceptions: { orderBy: { date: "asc" } } },
  });
  if (!agenda) notFound();

  const role = company.members[0].role;
  const canEdit = role === "OWNER" || role === "MANAGER";

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/${companySlug}/agendas`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 block"
        >
          ‹ Agendas
        </Link>
        <h1 className="text-xl font-bold text-gray-900">{agenda.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Exceções de agenda — dias bloqueados ou com horário diferente</p>
      </div>
      <ExcecoesClient
        companySlug={companySlug}
        agendaId={agendaId}
        exceptions={agenda.exceptions.map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        }))}
        canEdit={canEdit}
      />
    </div>
  );
}
