import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessCompany } from "@/lib/admin-guard";
import { getActiveSession } from "@/lib/session";
import { getProfessionalDayPanel, getTeamRanking } from "@/server/queries/team-goals";
import { MeuPainelClient } from "./meu-painel-client";

export const metadata = {
  title: "Meu painel",
};

export default async function MeuPainelPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ prof?: string }>;
}) {
  const { companySlug } = await params;
  const { prof } = await searchParams;

  const access = await canAccessCompany(companySlug);
  if (!access.ok) notFound();

  const session = await getActiveSession();
  if (!session) notFound();

  const [member, self, company] = await Promise.all([
    db.companyUser.findFirst({
      where: { companyId: access.companyId, userId: session.user.id, isActive: true },
      select: { role: true },
    }),
    db.professional.findFirst({
      where: { companyId: access.companyId, userId: session.user.id },
      select: { id: true },
    }),
    db.company.findUnique({
      where: { id: access.companyId },
      select: { showTeamRanking: true },
    }),
  ]);

  const isPlatformAdmin = session.user.role === "admin";
  const canManage =
    isPlatformAdmin || member?.role === "OWNER" || member?.role === "MANAGER";

  /**
   * A trava de papel.
   *
   * Quem gerencia escolhe de quem é o painel; quem é medido vê só o próprio. A
   * decisão acontece AQUI, no servidor: aceitar `?prof=` de todo mundo faria do
   * parâmetro um leitor do faturamento e da comissão de qualquer colega — e
   * comissão é salário.
   *
   * Um EMPLOYEE que não tem ficha de profissional não tem painel: não há número
   * dele para mostrar.
   */
  const professionalId = canManage ? (prof ?? self?.id ?? null) : (self?.id ?? null);

  const professionals = canManage
    ? await db.professional.findMany({
        where: { companyId: access.companyId, isActive: true },
        select: { id: true, name: true, dailyGoal: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Sem `prof` e sem ficha própria: cai no primeiro da equipe, para quem
  // gerencia não abrir uma tela vazia.
  const resolvedId = professionalId ?? (canManage ? professionals[0]?.id ?? null : null);

  const [panel, ranking] = await Promise.all([
    resolvedId
      ? getProfessionalDayPanel({ companyId: access.companyId, professionalId: resolvedId })
      : Promise.resolve(null),
    getTeamRanking({ companyId: access.companyId }),
  ]);

  return (
    <MeuPainelClient
      companySlug={companySlug}
      canManage={canManage}
      panel={panel}
      professionals={professionals.map((p) => ({
        id: p.id,
        name: p.name,
        dailyGoal: p.dailyGoal === null ? null : Number(p.dailyGoal),
      }))}
      ranking={ranking}
      rankingEnabled={company?.showTeamRanking ?? false}
      selfProfessionalId={self?.id ?? null}
    />
  );
}
