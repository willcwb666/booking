"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";

/**
 * Busca todos os agendamentos em aberto (CONFIRMED / PENDING) da empresa.
 */
export async function getCompanyOpenBookingsAction(companySlug: string) {
  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  const openBookings = await db.booking.findMany({
    where: {
      companyId: company.id,
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: {
      customerDetail: true,
      bookingConfig: { select: { name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return {
    success: true,
    bookings: openBookings.map((b) => ({
      id: b.id,
      customerName: b.customerDetail ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}` : "Cliente",
      customerPhone: b.customerDetail?.phone || "",
      serviceName: b.bookingConfig.name,
      scheduledDate: b.scheduledDate,
      scheduledStartTime: b.scheduledStartTime,
      status: b.status,
    })),
  };
}

/**
 * Altera diretamente o status de um agendamento (Finalizar ou Cancelar) pelo modal de reset.
 */
export async function updateBookingStatusDirectAction(
  companySlug: string,
  bookingId: string,
  newStatus: "COMPLETED" | "CANCELLED"
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  await db.booking.update({
    where: { id: bookingId },
    data: { status: newStatus },
  });

  if (newStatus === "COMPLETED") {
    const { notifyStatusChanged } = await import("@/lib/notifications");
    void notifyStatusChanged(bookingId, "COMPLETED");
  }

  revalidatePath(`/${companySlug}/agendamentos`);
  revalidatePath(`/${companySlug}/configuracoes`);

  return { success: true };
}

/**
 * Envia a solicitação de reset de presets para o Super Admin.
 */
export async function submitPresetResetRequestAction(companySlug: string, observation: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true, name: true, businessType: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  // Verificação estrita de segurança: Não envia se ainda houver agendamentos em aberto
  const openCount = await db.booking.count({
    where: {
      companyId: company.id,
      status: { in: ["CONFIRMED", "PENDING"] },
    },
  });

  if (openCount > 0) {
    return {
      success: false,
      error: `Ainda existem ${openCount} agendamento(s) em aberto. Finalize ou cancele todos os agendamentos antes de solicitar o reset.`,
    };
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_notification" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT,
        "recipientUserId" TEXT,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'INFO',
        "payload" TEXT,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "isResolved" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch {
    // ignora
  }

  const notificationId = `snot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const payload = JSON.stringify({
    companyId: company.id,
    companySlug,
    companyName: company.name,
    businessType: company.businessType,
    observation: observation.trim() || "Nenhuma observação informada.",
    requestedByUserId: session.user.id,
    requestedByUserName: session.user.name || session.user.email,
  });

  await db.$executeRawUnsafe(
    `
    INSERT INTO "system_notification" (
      id, "companyId", "recipientUserId", "senderUserId", title, message, type, payload, "isRead", "isResolved", "createdAt"
    ) VALUES (
      $1, $2, NULL, $3, $4, $5, 'PRESET_RESET_REQUEST', $6, false, false, NOW()
    )
  `,
    notificationId,
    company.id,
    session.user.id,
    `Solicitação de Reset de Presets: ${company.name}`,
    `A empresa ${company.name} solicitou o reset do catálogo para os padrões do segmento. Obs: ${observation.trim() || 'Nenhuma'}`,
    payload
  );

  await logAuditEvent({
    companyId: company.id,
    action: "PRESET_RESET_REQUESTED",
    entity: "Company",
    details: { observation },
  });

  return {
    success: true,
    message: "Solicitação enviada com sucesso ao Super Admin! Você será notificado assim que for executada.",
  };
}
