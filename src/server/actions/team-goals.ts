"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessCompany } from "@/lib/admin-guard";
import { getActiveSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/audit-log";

/**
 * Meta individual e a chave do ranking.
 *
 * As duas são decisão de quem gerencia, não de quem é medido: um profissional
 * definindo a própria meta transforma a meta em enfeite, e ligando o ranking
 * expõe o faturamento dos colegas. Ambas exigem OWNER ou MANAGER.
 */

type Result = { success: true } | { success: false; error: string };

async function requireManager(companySlug: string) {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { ok: false as const, error: access.error };

  const session = await getActiveSession();
  if (!session) return { ok: false as const, error: "Não autenticado" };

  // Super admin passa: é quem socorre a empresa quando o dono não consegue.
  if (session.user.role === "admin") {
    return { ok: true as const, companyId: access.companyId };
  }

  const member = await db.companyUser.findFirst({
    where: { companyId: access.companyId, userId: session.user.id, isActive: true },
    select: { role: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { ok: false as const, error: "Sem permissão" };
  }

  return { ok: true as const, companyId: access.companyId };
}

const goalSchema = z.object({
  professionalId: z.string().min(1),
  /**
   * Nulo é "sem meta", e é diferente de zero.
   *
   * Zero seria uma meta batida no instante em que o dia começa, e a barra
   * marcaria 100% todo dia — que é como se ensina alguém a ignorar um número.
   */
  dailyGoal: z.coerce.number().min(0).max(1_000_000).nullable(),
});

export type GoalInput = z.input<typeof goalSchema>;

export async function saveProfessionalGoalAction(
  companySlug: string,
  input: GoalInput
): Promise<Result> {
  const ctx = await requireManager(companySlug);
  if (!ctx.ok) return { success: false, error: ctx.error };

  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // O profissional precisa ser desta empresa — id vindo do navegador não define
  // de quem é a meta.
  const professional = await db.professional.findFirst({
    where: { id: parsed.data.professionalId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!professional) return { success: false, error: "Profissional não encontrado" };

  const goal = parsed.data.dailyGoal;
  await db.professional.update({
    where: { id: professional.id },
    // Zero cai para nulo: as duas formas de dizer "sem meta" viram uma só, e a
    // tela não precisa distinguir.
    data: { dailyGoal: goal && goal > 0 ? goal : null },
  });

  revalidatePath(`/${companySlug}/meu-painel`);
  return { success: true };
}

export async function setTeamRankingAction(
  companySlug: string,
  enabled: boolean
): Promise<Result> {
  const ctx = await requireManager(companySlug);
  if (!ctx.ok) return { success: false, error: ctx.error };

  await db.company.update({
    where: { id: ctx.companyId },
    data: { showTeamRanking: enabled },
  });

  /**
   * Ligar o ranking é uma decisão de gestão com efeito sobre pessoas — passa a
   * expor o faturamento de cada um para a equipe inteira. Fica no log de
   * auditoria com quem ligou e quando, porque um dia alguém vai perguntar.
   */
  await logAuditEvent({
    companyId: ctx.companyId,
    action: enabled ? "TEAM_RANKING_ENABLED" : "TEAM_RANKING_DISABLED",
    entity: "Company",
    details: { enabled },
  });

  revalidatePath(`/${companySlug}/meu-painel`);
  return { success: true };
}
