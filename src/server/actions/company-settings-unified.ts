"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";
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

  const cols = [
    `"minCancellationNoticeHours" INT DEFAULT 24`,
    `"cancellationFee" DECIMAL(10, 2) DEFAULT 0`,
    `"lateToleranceMinutes" INT DEFAULT 15`,
    `"notifyEmailEnabled" BOOLEAN DEFAULT true`,
    `"notifyTextEnabled" BOOLEAN DEFAULT true`,
    `"notifySmsEnabled" BOOLEAN DEFAULT false`,
    `"notifyWhatsappEnabled" BOOLEAN DEFAULT true`,
    `"heroTitle" TEXT`,
    `"heroSubtitle" TEXT`,
    `"brandColor" TEXT DEFAULT '#0f172a'`,
    `"coverImageUrl" TEXT`,
    `"socialInstagram" TEXT`,
    `"socialWhatsapp" TEXT`,
    `"socialFacebook" TEXT`,
  ];

  for (const col of cols) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "company" ADD COLUMN IF NOT EXISTS ${col};`);
    } catch {
      // ignora erro individual
    }
  }

  const market = getMarket(payload.country || "BR") || getMarket("BR")!;
  const timezone = isValidTimezoneForMarket(market.code, payload.timezone)
    ? payload.timezone
    : market.timezones[0].id;

  await db.$executeRawUnsafe(
    `
    UPDATE "company"
    SET name = $1,
        phone = $2,
        address = $3,
        currency = $4,
        locale = $5,
        timezone = $6,
        "logoUrl" = $7,
        "heroTitle" = $8,
        "heroSubtitle" = $9,
        "brandColor" = $10,
        "coverImageUrl" = $11,
        "socialInstagram" = $12,
        "socialWhatsapp" = $13,
        "socialFacebook" = $14,
        "notifyEmailEnabled" = $15,
        "notifyTextEnabled" = $16,
        "notifySmsEnabled" = $17,
        "notifyWhatsappEnabled" = $18,
        "minCancellationNoticeHours" = $19,
        "cancellationFee" = $20,
        "lateToleranceMinutes" = $21,
        "updatedAt" = NOW()
    WHERE id = $22
  `,
    payload.name,
    payload.phone || null,
    payload.address || null,
    market.currency,
    market.locale,
    timezone,
    payload.logoUrl || null,
    payload.heroTitle || null,
    payload.heroSubtitle || null,
    payload.brandColor || "#0f172a",
    payload.coverImageUrl || null,
    payload.socialInstagram || null,
    payload.socialWhatsapp || null,
    payload.socialFacebook || null,
    payload.notifyEmailEnabled,
    payload.notifyTextEnabled,
    payload.notifySmsEnabled,
    payload.notifyWhatsappEnabled,
    payload.minCancellationNoticeHours,
    payload.cancellationFee,
    payload.lateToleranceMinutes,
    targetCompanyId
  );

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
