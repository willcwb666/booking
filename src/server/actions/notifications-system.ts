"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { resetCompanyPresetServicesAction } from "./admin-company-reset";
import { logAuditEvent } from "@/lib/audit-log";

export type NotificationItem = {
  id: string;
  companyId: string | null;
  senderUserId: string | null;
  title: string;
  message: string;
  type: string;
  direction?: "RECEIVED" | "SENT";
  payload: {
    companyId?: string;
    companySlug?: string;
    companyName?: string;
    observation?: string;
    requestedByUserName?: string;
    paidViaStripe?: boolean;
    stripePaymentIntentId?: string;
  } | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
};

// `createSystemNotificationAction` foi REMOVIDA daqui.
//
// Recebia título, mensagem e companyId livres e inseria a notificação sem
// verificar nada: qualquer pessoa conseguia plantar um aviso no sino de
// qualquer empresa, com o texto que quisesse — vetor direto de phishing, já
// que a notificação chega com a aparência de mensagem oficial do sistema.
//
// Não havia nenhum chamador. As notificações reais são criadas dentro de
// ações que já verificaram o acesso (pedido de reset de presets, anúncio de
// novidades do super admin).

/**
 * Busca as notificações separadas em Recebidas e Enviadas.
 */
export async function getSystemNotificationsAction(): Promise<{
  success: boolean;
  notifications: NotificationItem[];
  received: NotificationItem[];
  sent: NotificationItem[];
  unreadCount: number;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, notifications: [], received: [], sent: [], unreadCount: 0 };

  const isSuperAdmin = session.user.role === "admin";
  const userId = session.user.id;

  try {


    const rows = await db.$queryRawUnsafe<Array<{
      id: string;
      companyId: string | null;
      recipientUserId: string | null;
      senderUserId: string | null;
      title: string;
      message: string;
      type: string;
      payload: string | null;
      isRead: boolean;
      isResolved: boolean;
      createdAt: Date | string;
    }>>(`SELECT * FROM "system_notification" ORDER BY "createdAt" DESC LIMIT 100`);

    const received: NotificationItem[] = [];
    const sent: NotificationItem[] = [];

    for (const r of rows) {
      let parsedPayload = null;
      if (r.payload) {
        try {
          parsedPayload = JSON.parse(r.payload);
        } catch {
          // ignora
        }
      }

      const item: NotificationItem = {
        id: r.id,
        companyId: r.companyId,
        senderUserId: r.senderUserId,
        title: r.title,
        message: r.message,
        type: r.type,
        payload: parsedPayload,
        isRead: Boolean(r.isRead),
        isResolved: Boolean(r.isResolved),
        createdAt: new Date(r.createdAt).toLocaleString("pt-BR"),
      };

      if (isSuperAdmin) {
        if (r.type === "PRESET_RESET_REQUEST") {
          received.push({ ...item, direction: "RECEIVED" });
        } else {
          sent.push({ ...item, direction: "SENT" });
        }
      } else {
        if (r.type === "PRESET_RESET_REQUEST" || r.senderUserId === userId) {
          sent.push({ ...item, direction: "SENT" });
        } else {
          received.push({ ...item, direction: "RECEIVED" });
        }
      }
    }

    const notifications = [...received, ...sent];
    const unreadCount = received.filter((n) => !n.isRead).length;

    return { success: true, notifications, received, sent, unreadCount };
  } catch (err) {
    console.error("[notifications-system] Error fetching notifications:", err);
    return { success: false, notifications: [], received: [], sent: [], unreadCount: 0 };
  }
}

/**
 * Marca uma notificação como lida ou não lida.
 *
 * O `UPDATE` é escopado a notificações que o chamador realmente alcança:
 * super admin vê tudo; os demais, só as da própria empresa. Antes o `WHERE`
 * era apenas `id = $1`, sem sessão nenhuma — dava para marcar como lida a
 * notificação de qualquer empresa, inclusive esconder do super admin um
 * pedido de reset de presets ainda pendente.
 */
async function setNotificationRead(notificationId: string, isRead: boolean) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false as const };

  if (session.user.role === "admin") {
    await db.$executeRawUnsafe(
      `UPDATE "system_notification" SET "isRead" = $2 WHERE id = $1`,
      notificationId,
      isRead
    );
    return { success: true as const };
  }

  await db.$executeRawUnsafe(
    `UPDATE "system_notification" n
        SET "isRead" = $2
      WHERE n.id = $1
        AND n."companyId" IN (
          SELECT cu."companyId" FROM "company_user" cu
           WHERE cu."userId" = $3 AND cu."isActive" = true
        )`,
    notificationId,
    isRead,
    session.user.id
  );
  return { success: true as const };
}

export async function markNotificationReadAction(notificationId: string) {
  return setNotificationRead(notificationId, true);
}

export async function markNotificationUnreadAction(notificationId: string) {
  return setNotificationRead(notificationId, false);
}

/**
 * Super Admin executa o reset direto do botão da notificação!
 */
export async function executeResetFromNotificationAction(
  notificationId: string
): Promise<{ success: true; message: string } | { success: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin da Plataforma" };
  }

  const rows = await db.$queryRawUnsafe<Array<{
    id: string;
    companyId: string | null;
    payload: string | null;
  }>>(`SELECT * FROM "system_notification" WHERE id = $1 LIMIT 1`, notificationId);

  if (rows.length === 0) return { success: false, error: "Notificação não encontrada" };
  const notif = rows[0];

  let payloadObj: { companyId?: string; companyName?: string; companySlug?: string } = {};
  if (notif.payload) {
    try {
      payloadObj = JSON.parse(notif.payload);
    } catch {
      // ignora
    }
  }

  const targetCompanyId = notif.companyId || payloadObj.companyId;
  if (!targetCompanyId) return { success: false, error: "ID da empresa não encontrado na solicitação" };

  // 1. Executar o reset dos serviços
  const resetRes = await resetCompanyPresetServicesAction(targetCompanyId);
  if (!resetRes.success) {
    return { success: false, error: (resetRes as { error?: string }).error ?? "Falha ao resetar os presets da empresa." };
  }

  // 2. Marcar a notificação como resolvida e lida
  await db.$executeRawUnsafe(
    `UPDATE "system_notification" SET "isResolved" = true, "isRead" = true WHERE id = $1`,
    notificationId
  );

  // 3. Notificar de volta a empresa que o reset foi concluído
  const confirmNotifId = `snot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.$executeRawUnsafe(
    `
    INSERT INTO "system_notification" (
      id, "companyId", "recipientUserId", "senderUserId", title, message, type, "isRead", "isResolved", "createdAt"
    ) VALUES (
      $1, $2, NULL, $3, $4, $5, 'INFO', false, true, NOW()
    )
  `,
    confirmNotifId,
    targetCompanyId,
    session.user.id,
    `Reset de Presets Concluído! 🎉`,
    `Sua solicitação de reset do catálogo de serviços foi executada com sucesso pelo Super Admin. Os presets do seu segmento foram restaurados.`
  );

  await logAuditEvent({
    companyId: targetCompanyId,
    action: "PRESET_RESET_EXECUTED_VIA_NOTIFICATION",
    entity: "SystemNotification",
    details: { notificationId },
  });

  revalidatePath(`/admin/companies`);
  return { success: true, message: "Reset executado com sucesso e notificação resolvida!" };
}
