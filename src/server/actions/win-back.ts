"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessCompany } from "@/lib/admin-guard";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendWinBackEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit-log";
import { WIN_BACK_COOLDOWN_DAYS } from "@/lib/win-back-policy";

/**
 * Campanha de resgate — disparada pelo dono, nunca pelo sistema.
 *
 * O desenho original previa um agente autônomo que detectasse o atraso e
 * disparasse a oferta sozinho, com bônus fixo. Duas coisas quebram nisso:
 *
 * 1. Bônus automático sangra margem sem ninguém decidir. R$ 15 vezes duzentos
 *    clientes é uma conta que o dono não aprovou.
 * 2. Disparo promocional não solicitado queima o remetente. Descadastro e
 *    marcação de spam em massa derrubam a reputação do domínio — e junto vão
 *    as confirmações de agendamento, que precisam chegar.
 *
 * Aqui o motor só monta a lista. Quem seleciona, escreve e envia é o dono.
 */

const campaignSchema = z.object({
  subject: z.string().trim().min(3, "Assunto obrigatório").max(120, "Máximo 120 caracteres"),
  message: z.string().trim().min(10, "Escreva a mensagem").max(1200, "Máximo 1200 caracteres"),
  /** Texto livre do incentivo. Opcional — nem toda campanha precisa dar desconto. */
  offer: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
});

export type WinBackSendResult =
  | { success: true; sent: number; skipped: number; failed: number }
  | { success: false; error: string };

export async function sendWinBackCampaignAction(
  companySlug: string,
  customerIds: string[],
  input: { subject: string; message: string; offer?: string }
): Promise<WinBackSendResult> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  if (customerIds.length === 0) {
    return { success: false, error: "Selecione ao menos um cliente" };
  }
  // Teto por disparo. Um clique não pode virar mil e-mails: além do custo, é o
  // volume que dispara filtro de spam no provedor.
  if (customerIds.length > 200) {
    return { success: false, error: "Máximo de 200 clientes por campanha" };
  }

  const rl = await enforceRateLimit(RATE_LIMITS.PROMO_SEND, access.companyId);
  if (!rl.allowed) return { success: false, error: rl.message };

  const company = await db.company.findUniqueOrThrow({
    where: { id: access.companyId },
    select: { name: true, slug: true, logoUrl: true },
  });

  // O `companyId` no where é o que impede um id de cliente de outra empresa de
  // entrar na lista — os ids vêm do navegador.
  const customers = await db.customer.findMany({
    where: { id: { in: customerIds }, companyId: access.companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      lastWinBackAt: true,
      acceptsMarketing: true,
    },
  });

  const optedOut = await db.user.findMany({
    where: {
      email: { in: customers.map((c) => c.email) },
      OR: [{ banned: true }, { notificationPrefs: { enableMarketing: false } }],
    },
    select: { email: true },
  });
  const blocked = new Set(optedOut.map((u) => u.email.toLowerCase()));

  const cooldownCutoff = new Date(Date.now() - WIN_BACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const deliveredIds: string[] = [];

  for (const c of customers) {
    // Consentimento e carência são verificados aqui, não só na tela: a lista
    // de ids vem do navegador, e quem chamar a action direto passaria por cima
    // da caixa que o cliente deixou desmarcada.
    if (!c.acceptsMarketing || blocked.has(c.email.toLowerCase())) {
      skipped++;
      continue;
    }
    if (c.lastWinBackAt && c.lastWinBackAt > cooldownCutoff) {
      skipped++;
      continue;
    }

    try {
      await sendWinBackEmail({
        to: c.email,
        customerName: `${c.firstName} ${c.lastName}`.trim() || "Cliente",
        companyName: company.name,
        companySlug: company.slug,
        companyLogoUrl: company.logoUrl,
        subject: parsed.data.subject,
        message: parsed.data.message,
        offer: parsed.data.offer || null,
      });
      sent++;
      deliveredIds.push(c.id);
    } catch (err) {
      // Contabilizado como falha, não como enviado. Relatar "200 enviados"
      // quando o provedor recusou 40 é pior que não relatar nada.
      console.error(`[win-back] falha ao enviar para ${c.email}:`, err);
      failed++;
    }
  }

  // Só quem realmente recebeu entra na carência — senão uma falha de provedor
  // trancaria o cliente fora da próxima campanha sem nunca ter sido avisado.
  if (deliveredIds.length > 0) {
    await db.customer.updateMany({
      where: { id: { in: deliveredIds } },
      data: { lastWinBackAt: new Date() },
    });
  }

  await logAuditEvent({
    companyId: access.companyId,
    action: "WIN_BACK_CAMPAIGN_SENT",
    entity: "Customer",
    details: { requested: customerIds.length, sent, skipped, failed, subject: parsed.data.subject },
  });

  revalidatePath(`/${companySlug}/resgate`);
  return { success: true, sent, skipped, failed };
}
