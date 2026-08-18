import "server-only";
import { db } from "@/lib/db";

export type MembershipPlanItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  includedSessionsCount: number | null;
  discountPercent: number;
  serviceIds: string[];
  isActive: boolean;
  activeMembersCount: number;
  createdAt: string;
};

export type CustomerMembershipItem = {
  id: string;
  planId: string;
  planName: string;
  planPrice: number;
  planInterval: string;
  isUnlimited: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: string;
  startDate: string;
  renewsAt: string | null;
  remainingSessions: number | null;
  totalUsages: number;
  notes: string | null;
  createdAt: string;
};

export type MembershipStats = {
  activeMembers: number;
  monthlyRecurringRevenue: number;
  totalPlans: number;
  sessionsUsedThisMonth: number;
};

/** Busca estatísticas gerais do Clube de Assinaturas */
export async function getMembershipStats(companySlug: string): Promise<MembershipStats> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { activeMembers: 0, monthlyRecurringRevenue: 0, totalPlans: 0, sessionsUsedThisMonth: 0 };

  const [activeMemberships, totalPlans, usagesThisMonth] = await Promise.all([
    db.customerMembership.findMany({
      where: { companyId: company.id, status: "ACTIVE" },
      include: { plan: { select: { price: true, interval: true } } },
    }),
    db.membershipPlan.count({ where: { companyId: company.id, isActive: true } }),
    db.membershipUsage.count({
      where: {
        customerMembership: { companyId: company.id },
        usedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  let mrr = 0;
  for (const m of activeMemberships) {
    const p = Number(m.plan.price);
    if (m.plan.interval === "month") mrr += p;
    else if (m.plan.interval === "quarter") mrr += p / 3;
    else if (m.plan.interval === "year") mrr += p / 12;
  }

  return {
    activeMembers: activeMemberships.length,
    monthlyRecurringRevenue: mrr,
    totalPlans,
    sessionsUsedThisMonth: usagesThisMonth,
  };
}

/** Busca os planos de assinatura e pacotes de uma empresa */
export async function getCompanyMembershipPlans(companySlug: string): Promise<MembershipPlanItem[]> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return [];

  const plans = await db.membershipPlan.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { memberships: { where: { status: "ACTIVE" } } },
      },
    },
  });

  return plans.map((p) => {
    let serviceIds: string[] = [];
    if (p.serviceIdsJson) {
      try {
        serviceIds = JSON.parse(p.serviceIdsJson);
      } catch {
        serviceIds = [];
      }
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      interval: p.interval,
      includedSessionsCount: p.includedSessionsCount,
      discountPercent: Number(p.discountPercent ?? 0),
      serviceIds,
      isActive: p.isActive,
      activeMembersCount: p._count.memberships,
      createdAt: p.createdAt.toISOString(),
    };
  });
}

/** Lista membros assinantes com paginação e busca */
export async function getCompanyMemberships(
  companySlug: string,
  opts: { page?: number; pageSize?: number; search?: string; status?: string } = {}
): Promise<{ items: CustomerMembershipItem[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const { page = 1, pageSize = 10, search, status } = opts;

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { items: [], total: 0, page, pageSize, pageCount: 0 };

  const where: any = {
    companyId: company.id,
  };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { customerName: { contains: s, mode: "insensitive" } },
      { customerEmail: { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s } },
      { plan: { name: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.customerMembership.count({ where }),
    db.customerMembership.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan: {
          select: { name: true, price: true, interval: true, includedSessionsCount: true },
        },
        _count: {
          select: { usages: true },
        },
      },
    }),
  ]);

  const items: CustomerMembershipItem[] = rows.map((r) => ({
    id: r.id,
    planId: r.planId,
    planName: r.plan.name,
    planPrice: Number(r.plan.price),
    planInterval: r.plan.interval,
    isUnlimited: r.plan.includedSessionsCount === null,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    customerPhone: r.customerPhone,
    status: r.status,
    startDate: r.startDate.toISOString(),
    renewsAt: r.renewsAt ? r.renewsAt.toISOString() : null,
    remainingSessions: r.remainingSessions,
    totalUsages: r._count.usages,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

/** Verifica se um cliente possui cobertura ativa de plano para um determinado serviço */
export async function checkCustomerMembershipCoverage(
  companySlug: string,
  customerEmail: string,
  serviceId?: string
): Promise<{
  isCovered: boolean;
  planName?: string;
  membershipId?: string;
  isUnlimited?: boolean;
  remainingSessions?: number | null;
  discountPercent?: number;
}> {
  if (!customerEmail || !customerEmail.includes("@")) {
    return { isCovered: false };
  }

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { isCovered: false };

  const membership = await db.customerMembership.findFirst({
    where: {
      companyId: company.id,
      customerEmail: { equals: customerEmail.trim(), mode: "insensitive" },
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!membership) {
    return { isCovered: false };
  }

  // Verifica se o plano cobre este serviço
  if (serviceId && membership.plan.serviceIdsJson) {
    try {
      const allowedServiceIds: string[] = JSON.parse(membership.plan.serviceIdsJson);
      if (allowedServiceIds.length > 0 && !allowedServiceIds.includes(serviceId)) {
        // Não cobre o serviço específico, mas pode dar desconto percentual
        const discount = Number(membership.plan.discountPercent ?? 0);
        return {
          isCovered: false,
          discountPercent: discount,
          planName: membership.plan.name,
        };
      }
    } catch {
      // Caso ocorra erro no parse, considera coberto
    }
  }

  // Se o plano tem limite de sessões, verifica se ainda há saldo
  const isUnlimited = membership.plan.includedSessionsCount === null;
  if (!isUnlimited && (membership.remainingSessions === null || membership.remainingSessions <= 0)) {
    return {
      isCovered: false,
      discountPercent: Number(membership.plan.discountPercent ?? 0),
      planName: membership.plan.name,
    };
  }

  return {
    isCovered: true,
    membershipId: membership.id,
    planName: membership.plan.name,
    isUnlimited,
    remainingSessions: membership.remainingSessions,
    discountPercent: Number(membership.plan.discountPercent ?? 0),
  };
}
