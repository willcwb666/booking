"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sendWaitlistNotificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

type Result = { success: true } | { success: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlistAction(formData: FormData): Promise<Result> {
  // Action pública — limita spam/flood de entradas por IP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`waitlist:join:${ip}`, 5, 60);
  if (!rl.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde um momento." };
  }

  const bookingConfigId = formData.get("bookingConfigId") as string;
  const preferredDate = formData.get("preferredDate") as string;
  const preferredStartTime = (formData.get("preferredStartTime") as string) || null;
  const customerName = ((formData.get("customerName") as string) || "").trim();
  const customerEmail = ((formData.get("customerEmail") as string) || "").trim().toLowerCase();
  const customerPhone = (formData.get("customerPhone") as string) || null;

  if (!bookingConfigId || !preferredDate || !customerName || !customerEmail) {
    return { success: false, error: "Preencha todos os campos obrigatórios" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return { success: false, error: "Data inválida" };
  }
  if (!EMAIL_REGEX.test(customerEmail) || customerEmail.length > 254) {
    return { success: false, error: "E-mail inválido" };
  }
  if (customerName.length > 120) {
    return { success: false, error: "Nome muito longo" };
  }

  const config = await db.bookingConfig.findFirst({
    where: { id: bookingConfigId, status: "PUBLISHED" },
    include: { company: { select: { id: true } } },
  });
  if (!config) return { success: false, error: "Configuração não encontrada" };

  // Check if already on waitlist
  const existing = await db.waitlistEntry.findFirst({
    where: {
      bookingConfigId,
      customerEmail,
      preferredDate,
      status: { in: ["WAITING", "NOTIFIED"] },
    },
  });
  if (existing) return { success: false, error: "Você já está na lista de espera para esta data" };

  await db.waitlistEntry.create({
    data: {
      companyId: config.company.id,
      agendaId: config.agendaId,
      bookingConfigId,
      preferredDate,
      preferredStartTime,
      customerName,
      customerEmail,
      customerPhone,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return { success: true };
}

export async function notifyWaitlistForDate(
  agendaId: string,
  date: string,
  companyId: string
): Promise<void> {
  // Called when a booking is cancelled — notify waiting customers
  const entries = await db.waitlistEntry.findMany({
    where: { agendaId, preferredDate: date, status: "WAITING" },
    take: 3, // notify first 3
  });

  if (entries.length === 0) return;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, locale: true },
  });

  await Promise.allSettled(
    entries.map(async (entry) => {
      await sendWaitlistNotificationEmail({
        to: entry.customerEmail,
        customerName: entry.customerName,
        companyName: company?.name ?? "empresa",
        date: entry.preferredDate,
        locale: company?.locale ?? "pt-BR",
      });

      await db.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "NOTIFIED", notifiedAt: new Date() },
      });
    })
  );
}

export async function removeWaitlistEntryAction(
  entryId: string,
  companySlug: string
): Promise<Result> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { success: false, error: "Sem permissão" };
  }

  // Escopa a exclusão à empresa do membro — evita IDOR cross-tenant
  const deleted = await db.waitlistEntry.deleteMany({
    where: { id: entryId, companyId: member.companyId },
  });
  if (deleted.count === 0) return { success: false, error: "Entrada não encontrada" };
  return { success: true };
}
