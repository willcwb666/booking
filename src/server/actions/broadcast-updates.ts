"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";

export type BroadcastPayload = {
  title: string;
  description: string;
  channels: {
    systemNotification: boolean;
    email: boolean;
    whatsapp: boolean;
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

    // 3. Log de Auditoria
    await logAuditEvent({
      companyId: companies[0]?.id || "PLATFORM",
      action: "PLATFORM_BROADCAST_RELEASE_NOTES_SENT",
      entity: "PlatformSetting",
      details: {
        title: payload.title,
        recipientCompaniesCount: companies.length,
        channels: payload.channels,
      },
    });

    revalidatePath("/admin/notificacoes");
    revalidatePath("/admin/configuracoes");

    return {
      success: true,
      message: `Anúncio de melhorias disparado com sucesso para ${companies.length} empresa(s)! (${notificationSentCount} notificações de sino criadas)`,
      companiesCount: companies.length,
    };
  } catch (err) {
    console.error("Erro ao disparar melhorias em massa:", err);
    return { success: false, error: "Falha ao disparar atualizações para os administradores." };
  }
}
