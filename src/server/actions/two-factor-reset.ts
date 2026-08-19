"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getActiveSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/audit-log";
import { sendTwoFactorResetNoticeEmail } from "@/lib/email";
import { RESET_DELAY_HOURS } from "@/lib/two-factor-reset";

/**
 * Reset da verificação em duas etapas — o backdoor, com os freios.
 *
 * O desenho original previa que o super admin validasse o documento da empresa
 * e executasse o reset na hora. Isso significaria que uma conta de super admin
 * comprometida toma qualquer tenant imediatamente e sem ruído: desliga o 2FA,
 * faz "esqueci minha senha", e entra.
 *
 * Aqui o pedido só vira execução depois de 24 horas, o dono é notificado no
 * momento do PEDIDO, e ele pode cancelar sozinho. O atacante continua podendo
 * pedir — mas passa a precisar de um dia inteiro em que a vítima não leia
 * e-mail nem faça login.
 */


export async function requestTwoFactorResetAction(
  targetUserId: string,
  reason: string
): Promise<{ success: true; executeAfter: string } | { success: false; error: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const justification = reason.trim();
  // O motivo é obrigatório e vai para a trilha de auditoria e para o e-mail do
  // dono. Um pedido sem justificativa não é auditável — e é o dono quem precisa
  // conseguir julgar, em 24h, se aquilo faz sentido.
  if (justification.length < 10) {
    return { success: false, error: "Descreva o motivo do reset (mínimo 10 caracteres)" };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, twoFactorEnabled: true },
  });
  if (!target) return { success: false, error: "Usuário não encontrado" };
  if (!target.twoFactorEnabled) {
    return { success: false, error: "Este usuário não tem verificação em duas etapas ativa" };
  }

  const existing = await db.twoFactorResetRequest.findFirst({
    where: { targetUserId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "Já existe um pedido pendente para este usuário" };
  }

  const executeAfter = new Date(Date.now() + RESET_DELAY_HOURS * 60 * 60 * 1000);

  const request = await db.twoFactorResetRequest.create({
    data: {
      targetUserId,
      requestedById: guard.userId,
      reason: justification,
      executeAfter,
    },
    select: { id: true },
  });

  // Notificação no PEDIDO, não na execução. Avisar só na hora de executar
  // eliminaria a janela inteira de reação, que é o ponto do atraso.
  await sendTwoFactorResetNoticeEmail({
    to: target.email,
    userName: target.name || target.email,
    reason: justification,
    executeAfter,
  });

  await logAuditEvent({
    action: "TWO_FACTOR_RESET_REQUESTED",
    entity: "User",
    details: {
      targetUserId,
      requestId: request.id,
      reason: justification,
      executeAfter: executeAfter.toISOString(),
    },
  });

  revalidatePath("/admin/usuarios");
  return { success: true, executeAfter: executeAfter.toISOString() };
}

export async function executeTwoFactorResetAction(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const request = await db.twoFactorResetRequest.findUnique({
    where: { id: requestId },
    select: { id: true, targetUserId: true, status: true, executeAfter: true },
  });
  if (!request) return { success: false, error: "Pedido não encontrado" };
  if (request.status !== "PENDING") {
    return { success: false, error: "Este pedido já foi executado ou cancelado" };
  }

  // A carência é verificada no servidor, não escondendo o botão na tela: quem
  // chama a action direto não passa pela interface.
  if (request.executeAfter > new Date()) {
    return {
      success: false,
      error: `A carência de ${RESET_DELAY_HOURS}h ainda não terminou`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.twoFactor.deleteMany({ where: { userId: request.targetUserId } });
    await tx.user.update({
      where: { id: request.targetUserId },
      data: { twoFactorEnabled: false },
    });
    // Sessões do alvo caem junto: se o reset foi pedido porque a conta pode
    // estar comprometida, deixar as sessões existentes de pé anularia o efeito.
    await tx.session.deleteMany({ where: { userId: request.targetUserId } });
    await tx.twoFactorResetRequest.update({
      where: { id: requestId },
      data: { status: "EXECUTED", executedAt: new Date() },
    });
  });

  await logAuditEvent({
    action: "TWO_FACTOR_RESET_EXECUTED",
    entity: "User",
    details: { targetUserId: request.targetUserId, requestId },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}

/**
 * Cancelamento — a saída da vítima.
 *
 * Aceita o próprio alvo (que é o caso que importa: "eu não pedi isso") e
 * qualquer super admin (revisão entre pares, ou desistência de quem pediu).
 * Exigir sessão para cancelar é correto e não é obstáculo: quem consegue
 * entrar não precisa do reset.
 */
export async function cancelTwoFactorResetAction(
  requestId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getActiveSession();
  if (!session) return { success: false, error: "Não autenticado" };

  const request = await db.twoFactorResetRequest.findUnique({
    where: { id: requestId },
    select: { id: true, targetUserId: true, status: true },
  });
  if (!request) return { success: false, error: "Pedido não encontrado" };
  if (request.status !== "PENDING") {
    return { success: false, error: "Este pedido já foi executado ou cancelado" };
  }

  const isTarget = request.targetUserId === session.user.id;
  const isSuperAdmin = session.user.role === "admin";
  if (!isTarget && !isSuperAdmin) {
    return { success: false, error: "Sem permissão" };
  }

  await db.twoFactorResetRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: session.user.id },
  });

  await logAuditEvent({
    action: "TWO_FACTOR_RESET_CANCELLED",
    entity: "User",
    details: {
      targetUserId: request.targetUserId,
      requestId,
      cancelledBy: isTarget ? "TARGET" : "SUPER_ADMIN",
    },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}
