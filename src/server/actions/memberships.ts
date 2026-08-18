"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { checkCustomerMembershipCoverage } from "@/server/queries/memberships";

/**
 * Garante que o usuário atual gerencia a empresa com o papel mínimo exigido.
 * Planos e saldos de sessões equivalem a dinheiro, então gestão exige MANAGER+
 * (OWNER e admin global também passam). EMPLOYEE não pode.
 */
async function verifyCompanyAccess(
  companySlug: string,
  minRole: "MANAGER" | "OWNER" = "MANAGER"
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) throw new Error("Empresa não encontrada");

  const isSuperAdmin = session.user.role === "admin";
  if (!isSuperAdmin) {
    const member = await db.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId: company.id,
          userId: session.user.id,
        },
      },
    });
    if (!member || !member.isActive) {
      throw new Error("Sem permissão para gerenciar esta empresa");
    }
    const isOwner = member.role === "OWNER";
    const canManage = isOwner || member.role === "MANAGER";
    if (minRole === "OWNER" && !isOwner) {
      throw new Error("Ação restrita ao proprietário da empresa");
    }
    if (minRole === "MANAGER" && !canManage) {
      throw new Error("Ação restrita a gerentes e administradores");
    }
  }

  return { company, user: session.user };
}

/** Cria um novo plano de assinatura ou pacote de sessões */
export async function createMembershipPlanAction(
  companySlug: string,
  data: {
    name: string;
    description?: string;
    price: number;
    interval: string;
    includedSessionsCount?: number | null;
    discountPercent?: number;
    serviceIds?: string[];
  }
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    const plan = await db.membershipPlan.create({
      data: {
        companyId: company.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        interval: data.interval,
        includedSessionsCount: data.includedSessionsCount !== undefined ? data.includedSessionsCount : null,
        discountPercent: data.discountPercent || 0,
        serviceIdsJson: data.serviceIds && data.serviceIds.length > 0 ? JSON.stringify(data.serviceIds) : null,
        isActive: true,
      },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true, data: plan };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao criar plano" };
  }
}

/** Atualiza um plano existente */
export async function updateMembershipPlanAction(
  companySlug: string,
  planId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    interval: string;
    includedSessionsCount?: number | null;
    discountPercent?: number;
    serviceIds?: string[];
  }
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    const plan = await db.membershipPlan.update({
      where: { id: planId, companyId: company.id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        interval: data.interval,
        includedSessionsCount: data.includedSessionsCount !== undefined ? data.includedSessionsCount : null,
        discountPercent: data.discountPercent || 0,
        serviceIdsJson: data.serviceIds && data.serviceIds.length > 0 ? JSON.stringify(data.serviceIds) : null,
      },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true, data: plan };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao atualizar plano" };
  }
}

/** Ativa ou desativa um plano */
export async function toggleMembershipPlanAction(companySlug: string, planId: string) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    const existing = await db.membershipPlan.findUnique({
      where: { id: planId, companyId: company.id },
    });
    if (!existing) throw new Error("Plano não encontrado");

    await db.membershipPlan.update({
      where: { id: planId },
      data: { isActive: !existing.isActive },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao alterar status do plano" };
  }
}

/** Associa manualmente um cliente a um plano ou pacote de sessões */
export async function createCustomerMembershipAction(
  companySlug: string,
  data: {
    planId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    renewsAtDays?: number;
    initialSessions?: number | null;
    notes?: string;
  }
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    const plan = await db.membershipPlan.findUnique({
      where: { id: data.planId, companyId: company.id },
    });
    if (!plan) throw new Error("Plano não encontrado");

    const email = data.customerEmail.trim().toLowerCase();
    const now = new Date();
    let renewsAt: Date | null = null;

    if (data.renewsAtDays && data.renewsAtDays > 0) {
      renewsAt = new Date(now.getTime() + data.renewsAtDays * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "month") {
      renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "quarter") {
      renewsAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    } else if (plan.interval === "year") {
      renewsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    const sessions =
      data.initialSessions !== undefined ? data.initialSessions : plan.includedSessionsCount;

    const membership = await db.customerMembership.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        customerName: data.customerName.trim(),
        customerEmail: email,
        customerPhone: data.customerPhone?.trim() || null,
        status: "ACTIVE",
        startDate: now,
        renewsAt,
        remainingSessions: sessions,
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true, data: membership };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao adicionar membro" };
  }
}

/** Cancela a assinatura de um cliente */
export async function cancelCustomerMembershipAction(companySlug: string, membershipId: string) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    await db.customerMembership.update({
      where: { id: membershipId, companyId: company.id },
      data: { status: "CANCELLED" },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao cancelar assinatura" };
  }
}

/** Ajusta manualmente o saldo de sessões restantes de um membro */
export async function adjustCustomerMembershipSessionsAction(
  companySlug: string,
  membershipId: string,
  newRemaining: number
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    await db.customerMembership.update({
      where: { id: membershipId, companyId: company.id },
      data: { remainingSessions: Math.max(0, newRemaining) },
    });

    revalidatePath(`/${companySlug}/assinaturas`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao ajustar saldo de sessões" };
  }
}

/** Checagem pública de cobertura para o checkout (rate-limited por IP para
 *  evitar enumeração de e-mails/planos). */
export async function checkCustomerMembershipCoverageAction(
  companySlug: string,
  customerEmail: string,
  serviceId?: string
) {
  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(`membership:coverage:${ip}`, 20, 60);
    if (!rl.allowed) {
      return { success: false, error: "Muitas tentativas. Aguarde um momento." };
    }

    const result = await checkCustomerMembershipCoverage(companySlug, customerEmail, serviceId);
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao verificar plano" };
  }
}
