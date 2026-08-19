"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { assertPublicHttpsUrl } from "@/lib/ssrf";
import { syncGoogleCalendarToBooking } from "@/lib/google-calendar";
import { syncIcalFeedToBooking } from "@/lib/ical-sync";

/** Retorna o token do feed .ics da empresa, gerando um na primeira chamada. */
async function getOrCreateFeedToken(companyId: string): Promise<string> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { calendarFeedToken: true },
  });
  if (company?.calendarFeedToken) return company.calendarFeedToken;

  const token = randomBytes(24).toString("hex");
  await db.company.update({ where: { id: companyId }, data: { calendarFeedToken: token } });
  return token;
}

async function verifyCompanyAccess(companySlug: string) {
  const session = await getActiveSession();
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

    // Sync bate na API do Google e escreve em lote — sem limite, um botão
    // clicado em sequência vira consumo de quota e carga de escrita.
    const rl = await enforceRateLimit(RATE_LIMITS.CALENDAR_SYNC, company.id);
    if (!rl.allowed) return { success: false, syncedCount: 0, error: rl.message };

    const result = await syncGoogleCalendarToBooking(
      company.id,
      user.id,
      professionalId,
      30 // Próximos 30 dias
    );

    revalidatePath(`/${companySlug}/configuracoes`);
    revalidatePath(`/${companySlug}/schedule`);
    return result;
  } catch (err: unknown) {
    return {
      success: false,
      syncedCount: 0,
      error: err instanceof Error ? err.message : "Erro ao sincronizar Google Calendar",
    };
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

    // Resolver DNS a cada salvamento é caro e é a porta de entrada de SSRF —
    // limita antes de tocar na rede.
    const rl = await enforceRateLimit(RATE_LIMITS.CALENDAR_FEED_UPDATE, company.id);
    if (!rl.allowed) return { success: false, error: rl.message };

    // Valida ANTES de persistir: uma URL interna não pode nem chegar ao banco,
    // senão fica ali esperando um caminho de sync que esqueça a checagem.
    await assertPublicHttpsUrl(trimmedUrl);

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
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar feed iCal" };
  }
}

/** Consulta status das integrações de calendário da empresa/usuário */
export async function getCalendarIntegrationStatusAction(companySlug: string) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    const integrations = await db.calendarIntegration.findMany({
      where: { userId: user.id },
    });

    const googleInt = integrations.find((i) => i.provider === "GOOGLE");
    const icalInt = integrations.find((i) => i.provider === "ICAL_FEED");

    // Caminho do feed .ics COM token secreto (o feed contém PII)
    const token = await getOrCreateFeedToken(company.id);
    const icalExportPath = `/api/ics/agenda?company=${encodeURIComponent(companySlug)}&token=${token}`;

    return {
      success: true,
      icalExportPath,
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
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro" };
  }
}
