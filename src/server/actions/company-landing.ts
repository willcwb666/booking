"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit-log";
import { canAccessCompany } from "@/lib/admin-guard";

export async function updateCompanyLandingSettingsAction(
  companySlug: string,
  payload: {
    heroTitle: string;
    heroSubtitle: string;
    brandColor: string;
    coverImageUrl: string;
    socialInstagram: string;
    socialWhatsapp: string;
    socialFacebook: string;
  }
) {
  /**
   * So checava sessao. Titulo, subtitulo, cor, capa e redes sociais sao a
   * PAGINA PUBLICA da empresa — qualquer usuario logado podia reescrever a
   * vitrine de qualquer salao passando o slug. Pichacao com uma chamada.
   */
  const access = await canAccessCompany(companySlug, "MANAGER");
  if (!access.ok) return { success: false, error: access.error };
  const company = { id: access.companyId };

  try {
    await db.$executeRawUnsafe(`
      ALTER TABLE "company"
      ADD COLUMN IF NOT EXISTS "heroTitle" TEXT,
      ADD COLUMN IF NOT EXISTS "heroSubtitle" TEXT,
      ADD COLUMN IF NOT EXISTS "brandColor" TEXT DEFAULT '#0f172a',
      ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "socialInstagram" TEXT,
      ADD COLUMN IF NOT EXISTS "socialWhatsapp" TEXT,
      ADD COLUMN IF NOT EXISTS "socialFacebook" TEXT;
    `);
  } catch {
    // ignora se colunas já existirem
  }

  await db.$executeRawUnsafe(
    `
    UPDATE "company"
    SET "heroTitle" = $1,
        "heroSubtitle" = $2,
        "brandColor" = $3,
        "coverImageUrl" = $4,
        "socialInstagram" = $5,
        "socialWhatsapp" = $6,
        "socialFacebook" = $7,
        "updatedAt" = NOW()
    WHERE id = $8
  `,
    payload.heroTitle || null,
    payload.heroSubtitle || null,
    payload.brandColor || "#0f172a",
    payload.coverImageUrl || null,
    payload.socialInstagram || null,
    payload.socialWhatsapp || null,
    payload.socialFacebook || null,
    company.id
  );

  await logAuditEvent({
    companyId: company.id,
    action: "LANDING_PAGE_UPDATE",
    entity: "Company",
    details: payload,
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  revalidatePath(`/${companySlug}`);
  revalidatePath(`/book/${companySlug}`);

  return { success: true };
}
