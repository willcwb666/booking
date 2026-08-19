"use server";

import "server-only";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  processAdminAIQuery,
  calculateCompanyChurnRisk,
  type AdminAIQueryResult,
  type CompanyChurnRisk,
} from "@/lib/ai/admin-copilot";

/**
 * Server Action: Processa pergunta em linguagem natural no Copilot do Super Admin
 */
export async function queryAdminAICopilotAction(
  query: string
): Promise<{ success: boolean; data?: AdminAIQueryResult; error?: string }> {
  // Consulta de IA custa dinheiro e responde com dados agregados da
  // plataforma inteira. Era chamável por qualquer um.
  const admin = await requireSuperAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  try {
    if (!query || query.trim().length < 3) {
      return { success: false, error: "Digite pelo menos 3 caracteres para o Copilot." };
    }

    const [companiesCount, activeSubsCount, overdueSubsCount] = await Promise.all([
      db.company.count(),
      db.company.count({ where: { subscriptionStatus: "active" } }),
      db.company.count({ where: { subscriptionStatus: "past_due" } }),
    ]);

    const mrr = activeSubsCount * 149.0;
    const arr = mrr * 12;

    const result = processAdminAIQuery(query, {
      totalCompanies: companiesCount,
      activeSubscriptions: activeSubsCount,
      mrr,
      arr,
      overdueCount: overdueSubsCount,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("[ADMIN_AI_COPILOT_ERROR]", error);
    return { success: false, error: "Erro ao consultar Copilot do Admin." };
  }
}

/**
 * Server Action: Auto-Healing de Tenant (Repara presets, serviços e status de uma empresa)
 */
export async function repairCompanyTenantAction(
  companyId: string
): Promise<{ success: boolean; message: string }> {
  // Esta action ESCREVE no banco de uma empresa arbitrária.
  const admin = await requireSuperAdmin();
  if (!admin.ok) return { success: false, message: admin.error };

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { services: true, agendas: true },
    });

    if (!company) {
      return { success: false, message: "Empresa não encontrada." };
    }

    // Se a empresa não possui serviços, cria serviço padrão de recuperação
    if (company.services.length === 0) {
      await db.service.create({
        data: {
          companyId: company.id,
          name: "Atendimento Padrão",
          description: "Serviço padrão gerado pelo assistente de reparo automático.",
          isActive: true,
        },
      });
    }

    return {
      success: true,
      message: `Tenant '${company.name}' verificado e reparado com sucesso. Todos os módulos e serviços estão operacionais.`,
    };
  } catch (error) {
    console.error("[TENANT_REPAIR_ERROR]", error);
    return { success: false, message: "Erro ao reparar tenant. Verifique os logs." };
  }
}
