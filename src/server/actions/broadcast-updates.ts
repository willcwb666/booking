"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";
import { sendPlatformBroadcastEmail } from "@/lib/email";

/**
 * Canais do anúncio de novidades.
 *
 * O canal `whatsapp` foi REMOVIDO daqui, não desativado: a integração com a
 * API do WhatsApp não existe no projeto. Ele era aceito no payload, gravado no
 * log de auditoria como se tivesse sido usado, e nada era enviado — o super
 * admin lia "disparado com sucesso" e presumia que as mensagens saíram. Quando
 * a integração existir, o canal volta com o envio junto.
 */
export type BroadcastPayload = {
  title: string;
  description: string;
  channels: {
    systemNotification: boolean;
    email: boolean;
  };
};

export async function broadcastPlatformUpdatesAction(payload: BroadcastPayload) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin da Plataforma" };
  }

  if (!payload.title.trim() || !payload.description.trim()) {
    return { success: false, error: "Preencha o título e a descrição das melhorias." };
  }

  try {
    // 1. Buscar todas as empresas ativas
    const companies = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
    }>>(`SELECT id, name, slug FROM "company" WHERE "isActive" = true`);

    let notificationSentCount = 0;

    // 2. Disparar notificação do sistema (Sino) para cada empresa se selecionado
    if (payload.channels.systemNotification) {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "system_notification" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT,
          "recipientUserId" TEXT,
          "senderUserId" TEXT,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'INFO',
          "payload" TEXT,
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "isResolved" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      for (const comp of companies) {
        const notifId = `bcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.$executeRawUnsafe(
          `
          INSERT INTO "system_notification" (
            id, "companyId", "recipientUserId", "senderUserId", title, message, type, payload, "isRead", "isResolved", "createdAt"
          ) VALUES (
            $1, $2, NULL, $3, $4, $5, 'BROADCAST_UPDATE', $6, false, true, NOW()
          )
        `,
          notifId,
          comp.id,
          session.user.id,
          `🚀 Nova Atualização: ${payload.title}`,
          payload.description,
          JSON.stringify({
            broadcastTitle: payload.title,
            channels: payload.channels,
            sentAt: new Date().toISOString(),
          })
        );
        notificationSentCount++;
      }
    }

    // 3. E-mail para o responsável de cada empresa.
    //    Antes este canal era aceito e ignorado. Agora envia de verdade, em
    //    lotes, e o resultado de cada envio é contado — o relatório final diz
    //    quantos saíram e quantos falharam, em vez de um "sucesso" genérico.
    let emailSentCount = 0;
    let emailFailedCount = 0;

    if (payload.channels.email) {
      const owners = await db.$queryRawUnsafe<
        Array<{ email: string; name: string; companyName: string }>
      >(
        `SELECT DISTINCT ON (u.email) u.email, u.name, c.name AS "companyName"
           FROM "company_user" cu
           JOIN "user" u ON u.id = cu."userId"
           JOIN "company" c ON c.id = cu."companyId"
          WHERE c."isActive" = true
            AND cu."isActive" = true
            AND cu.role = 'OWNER'
            AND u.email IS NOT NULL
            AND COALESCE(u.banned, false) = false`
      );

      // Em lotes: a action tem orçamento de tempo, e um `for` sequencial em
      // centenas de destinatários estoura antes de terminar.
      const BATCH = 20;
      for (let i = 0; i < owners.length; i += BATCH) {
        const results = await Promise.allSettled(
          owners.slice(i, i + BATCH).map((owner) =>
            sendPlatformBroadcastEmail({
              to: owner.email,
              recipientName: owner.name || "por aí",
              companyName: owner.companyName,
              title: payload.title,
              description: payload.description,
            })
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled") emailSentCount++;
          else {
            emailFailedCount++;
            console.error("[broadcast] falha ao enviar e-mail:", r.reason);
          }
        }
      }
    }

    // 4. Log de Auditoria — registra o que de fato aconteceu, não a intenção
    await logAuditEvent({
      companyId: companies[0]?.id || "PLATFORM",
      action: "PLATFORM_BROADCAST_RELEASE_NOTES_SENT",
      entity: "PlatformSetting",
      details: {
        title: payload.title,
        recipientCompaniesCount: companies.length,
        channels: payload.channels,
        notificationSentCount,
        emailSentCount,
        emailFailedCount,
      },
    });

    revalidatePath("/admin/notificacoes");
    revalidatePath("/admin/configuracoes");

    const parts: string[] = [];
    if (payload.channels.systemNotification) {
      parts.push(`${notificationSentCount} notificação(ões) no sino`);
    }
    if (payload.channels.email) {
      parts.push(
        emailFailedCount > 0
          ? `${emailSentCount} e-mail(s) enviado(s), ${emailFailedCount} falhou(aram)`
          : `${emailSentCount} e-mail(s) enviado(s)`
      );
    }

    return {
      success: true,
      message: parts.length > 0 ? parts.join(" · ") : "Nenhum canal selecionado.",
      companiesCount: companies.length,
      notificationSentCount,
      emailSentCount,
      emailFailedCount,
    };
  } catch (err) {
    console.error("Erro ao disparar melhorias em massa:", err);
    return { success: false, error: "Falha ao disparar atualizações para os administradores." };
  }
}
