"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncGoogleCalendarToBooking } from "@/lib/google-calendar";
import { syncIcalFeedToBooking } from "@/lib/ical-sync";

async function verifyCompanyAccess(companySlug: string) {
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
  }

  return { company, user: session.user };
}

/** Dispara sincronização 2-Way manual do Google Calendar */
export async function triggerGoogleCalendarSyncAction(
  companySlug: string,
  professionalId: string | null = null
) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    const result = await syncGoogleCalendarToBooking(
      company.id,
      user.id,
      professionalId,
      30 // Próximos 30 dias
    );

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/${companySlug}/schedule`);
    return result;
  } catch (err: any) {
    return { success: false, syncedCount: 0, error: err.message || "Erro ao sincronizar Google Calendar" };
  }
}

/** Atualiza ou define uma URL de feed iCal (Apple Calendar / Outlook) */
export async function updateIcalFeedAction(
  companySlug: string,
  professionalId: string | null,
  icalUrl: string
) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    const trimmedUrl = icalUrl.trim();

    if (!trimmedUrl) {
      // Remove integração iCal existente
      await db.calendarIntegration.deleteMany({
        where: {
          userId: user.id,
          provider: "ICAL_FEED",
        },
      });
      revalidatePath(`/${companySlug}/configuracoes`);
      return { success: true, message: "Feed iCal removido" };
    }

    await db.calendarIntegration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "ICAL_FEED",
        },
      },
      update: {
        externalIcalUrl: trimmedUrl,
        professionalId,
        isActive: true,
      },
      create: {
        userId: user.id,
        provider: "ICAL_FEED",
        externalIcalUrl: trimmedUrl,
        professionalId,
        isActive: true,
      },
    });

    // Executa sincronização inicial
    const syncRes = await syncIcalFeedToBooking(company.id, user.id, professionalId, trimmedUrl);

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/${companySlug}/schedule`);
    return syncRes;
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar feed iCal" };
  }
}

/** Consulta status das integrações de calendário da empresa/usuário */
export async function getCalendarIntegrationStatusAction(companySlug: string) {
  try {
    const { user } = await verifyCompanyAccess(companySlug);

    const integrations = await db.calendarIntegration.findMany({
      where: { userId: user.id },
    });

    const googleInt = integrations.find((i) => i.provider === "GOOGLE");
    const icalInt = integrations.find((i) => i.provider === "ICAL_FEED");

    return {
      success: true,
      google: {
        isConnected: !!googleInt && googleInt.isActive && !!googleInt.accessToken,
        lastSyncedAt: googleInt?.lastSyncedAt ? googleInt.lastSyncedAt.toISOString() : null,
      },
      ical: {
        isConnected: !!icalInt && icalInt.isActive && !!icalInt.externalIcalUrl,
        url: icalInt?.externalIcalUrl || null,
        lastSyncedAt: icalInt?.lastSyncedAt ? icalInt.lastSyncedAt.toISOString() : null,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
