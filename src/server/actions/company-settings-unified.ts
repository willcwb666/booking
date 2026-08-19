"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit-log";
import { getMarket, isValidTimezoneForMarket } from "@/lib/markets";

export type UnifiedCompanySettingsPayload = {
  // Empresa
  name: string;
  phone: string;
  address: string;
  country: string;
  timezone: string;
  logoUrl: string | null;
  // Landing Page
  heroTitle: string;
  heroSubtitle: string;
  brandColor: string;
  coverImageUrl: string;
  socialInstagram: string;
  socialWhatsapp: string;
  socialFacebook: string;
  // Notificações
  notifyEmailEnabled: boolean;
  notifyTextEnabled: boolean;
  notifySmsEnabled: boolean;
  notifyWhatsappEnabled: boolean;
  // Política de Cancelamento & Tolerância
  minCancellationNoticeHours: number;
  cancellationFee: number;
  lateToleranceMinutes: number;
  // Política de Clientes & Faltas
  maxAllowedNoShows: number;
  // Sinal / Depósito Anti-No-Show
  requireDeposit?: boolean;
  depositPercentage?: number;
  /** Cobra o sinal por faixa de confiança do cliente. Ver `src/lib/trust-tier.ts`. */
  dynamicDeposit?: boolean;
};

export async function updateCompanySettingsUnifiedAction(
  companySlug: string,
  payload: UnifiedCompanySettingsPayload
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
    },
    include: { company: { select: { id: true } } },
  });

  const isPlatformAdmin = session.user.role === "admin";
  let targetCompanyId = member?.company.id;

  if (!targetCompanyId && isPlatformAdmin) {
    const comp = await db.company.findUnique({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (comp) targetCompanyId = comp.id;
  }

  if (!targetCompanyId) {
    return { success: false, error: "Acesso negado — Sem permissão para alterar as configurações" };
  }

  const market = getMarket(payload.country || "BR") || getMarket("BR")!;
  const timezone = isValidTimezoneForMarket(market.code, payload.timezone)
    ? payload.timezone
    : market.timezones[0].id;

  await db.company.update({
    where: { id: targetCompanyId },
    data: {
      name: payload.name,
      phone: payload.phone || null,
      address: payload.address || null,
      currency: market.currency,
      locale: market.locale,
      timezone,
      logoUrl: payload.logoUrl || null,
      heroTitle: payload.heroTitle || null,
      heroSubtitle: payload.heroSubtitle || null,
      brandColor: payload.brandColor || "#0f172a",
      coverImageUrl: payload.coverImageUrl || null,
      socialInstagram: payload.socialInstagram || null,
      socialWhatsapp: payload.socialWhatsapp || null,
      socialFacebook: payload.socialFacebook || null,
      notifyEmailEnabled: payload.notifyEmailEnabled,
      notifyTextEnabled: payload.notifyTextEnabled,
      notifySmsEnabled: payload.notifySmsEnabled,
      notifyWhatsappEnabled: payload.notifyWhatsappEnabled,
      minCancellationNoticeHours: payload.minCancellationNoticeHours,
      cancellationFee: payload.cancellationFee,
      lateToleranceMinutes: payload.lateToleranceMinutes,
      maxAllowedNoShows: payload.maxAllowedNoShows || 2,
    },
  });

  if (payload.requireDeposit !== undefined || payload.dynamicDeposit !== undefined) {
    const deposit = {
      requireDeposit: payload.requireDeposit ?? false,
      depositPercentage: payload.depositPercentage ?? 30,
      dynamicDeposit: payload.dynamicDeposit ?? false,
    };
    await db.companyPaymentSettings.upsert({
      where: { companyId: targetCompanyId },
      update: deposit,
      create: { companyId: targetCompanyId, ...deposit },
    });
  }

  await logAuditEvent({
    companyId: targetCompanyId,
    action: "UNIFIED_SETTINGS_UPDATE",
    entity: "Company",
    details: payload,
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  revalidatePath(`/${companySlug}`);
  revalidatePath(`/book/${companySlug}`);

  return { success: true, message: "Todas as configurações foram salvas com sucesso!" };
}
