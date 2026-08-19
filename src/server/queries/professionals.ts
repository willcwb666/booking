import "server-only";
import { db } from "@/lib/db";

/**
 * Profissionais da empresa.
 *
 * O padrão continua sendo só os ativos, que é o que as telas de agenda e de
 * agendamento precisam. A tela de gestão passa `includeInactive` porque, sem
 * isso, desativar um profissional o fazia sumir da lista e o botão de
 * reativar nunca era alcançável — desativar virava porta de mão única.
 */
export async function getProfessionals(
  companyId: string,
  opts: { includeInactive?: boolean } = {}
) {
  const rows = await db.professional.findMany({
    where: {
      companyId,
      ...(opts.includeInactive ? {} : { isActive: true }),
    },
    orderBy: opts.includeInactive
      ? [{ isActive: "desc" }, { createdAt: "asc" }]
      : { createdAt: "asc" },
  });

  return rows.map((p) => ({
    id: p.id,
    companyId: p.companyId,
    userId: p.userId,
    name: p.name,
    email: p.email,
    phone: p.phone,
    bio: p.bio,
    avatarUrl: p.avatarUrl,
    roleTitle: p.roleTitle,
    commissionRate: p.commissionRate ? Number(p.commissionRate) : (p.commissionPercentage ? Number(p.commissionPercentage) : 0),
    commissionPercentage: p.commissionPercentage ? Number(p.commissionPercentage) : (p.commissionRate ? Number(p.commissionRate) : 0),
    productCommissionRate: p.productCommissionRate ? Number(p.productCommissionRate) : 0,
    pixKey: p.pixKey,
    pixKeyType: p.pixKeyType,
    showOnLanding: p.showOnLanding ?? true,
    servicesJson: p.servicesJson,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export async function countActiveProfessionals(companyId: string): Promise<number> {
  return db.professional.count({ where: { companyId, isActive: true } });
}
