"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { checkFeature } from "@/lib/features";
import { countActiveProfessionals } from "@/server/queries/professionals";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function resolveCompany(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  if (!company) return null;
  const role = company.members?.[0]?.role ?? "EMPLOYEE";
  const isGlobalAdmin = session.user.role === "admin";
  return { ...company, role, canManage: isGlobalAdmin || role === "OWNER" || role === "MANAGER" };
}

/**
 * Cadastro de profissional carrega comissão, chave PIX e documento — dados
 * financeiros. Sem esta trava um EMPLOYEE podia alterar a própria comissão e
 * a chave PIX de recebimento da empresa.
 */
async function resolveCompanyForManage(slug: string) {
  const company = await resolveCompany(slug);
  if (!company || !company.canManage) return null;
  return company;
}

async function ensureProfessionalColumnsExist() {
  const statements = [
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "roleTitle" TEXT`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2) DEFAULT 0`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "productCommissionRate" DECIMAL(5,2) DEFAULT 0`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "pixKey" TEXT`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "instagram" TEXT`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "showOnLanding" BOOLEAN DEFAULT true`,
    `ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "servicesJson" TEXT`,
  ];

  for (const stmt of statements) {
    try {
      await db.$executeRawUnsafe(stmt);
    } catch (err) {
      // Ignora warning se a coluna já existe
    }
  }
}

export type FullProfessionalData = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  roleTitle: string | null;
  documentNumber: string | null;
  commissionRate: number;
  productCommissionRate: number;
  pixKeyType: string | null;
  pixKey: string | null;
  instagram: string | null;
  showOnLanding: boolean;
  servicesJson: string | null;
  isActive: boolean;
};

export async function getProfessionalByIdAction(companySlug: string, professionalId: string): Promise<FullProfessionalData | null> {
  // Devolve comissão, documento e chave PIX — leitura restrita à gestão
  const company = await resolveCompanyForManage(companySlug);
  if (!company) return null;

  await ensureProfessionalColumnsExist();

  try {
    const rows = await db.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "professional" WHERE id = $1 AND "companyId" = $2 LIMIT 1`,
      professionalId,
      company.id
    );

    if (!rows.length) return null;
    const r = rows[0];

    return {
      id: r.id,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      bio: r.bio || null,
      avatarUrl: r.avatarUrl || null,
      roleTitle: r.roleTitle || null,
      documentNumber: r.documentNumber || null,
      commissionRate: Number(r.commissionRate || 0),
      productCommissionRate: Number(r.productCommissionRate || 0),
      pixKeyType: r.pixKeyType || null,
      pixKey: r.pixKey || null,
      instagram: r.instagram || null,
      showOnLanding: r.showOnLanding ?? true,
      servicesJson: r.servicesJson || "[]",
      isActive: r.isActive ?? true,
    };
  } catch (err) {
    console.error("Erro ao buscar profissional por ID:", err);
    const pro = await db.professional.findFirst({
      where: { id: professionalId, companyId: company.id },
    });
    if (!pro) return null;
    return {
      id: pro.id,
      name: pro.name,
      email: pro.email,
      phone: pro.phone,
      bio: pro.bio,
      avatarUrl: pro.avatarUrl,
      roleTitle: null,
      documentNumber: null,
      commissionRate: 0,
      productCommissionRate: 0,
      pixKeyType: null,
      pixKey: null,
      instagram: null,
      showOnLanding: true,
      servicesJson: "[]",
      isActive: pro.isActive,
    };
  }
}

export async function createProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompanyForManage(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  await ensureProfessionalColumnsExist();

  // Feature flag: max_professionals
  const feature = await checkFeature(company.id, "max_professionals");
  if (!feature.enabled)
    return {
      success: false,
      errors: { _: ["Seu plano não inclui profissionais"] },
    };
  if (feature.limit !== null) {
    const current = await countActiveProfessionals(company.id);
    if (current >= feature.limit)
      return {
        success: false,
        errors: {
          _: [
            `Limite de ${feature.limit} profissional(is) atingido no plano atual`,
          ],
        },
      };
  }

  const name = (formData.get("name") as string || "").trim();
  if (!name) {
    return { success: false, errors: { name: ["Nome é obrigatório"] } };
  }

  const email = (formData.get("email") as string || "").trim() || null;
  const phone = (formData.get("phone") as string || "").trim() || null;
  const bio = (formData.get("bio") as string || "").trim() || null;
  const roleTitle = (formData.get("roleTitle") as string || "").trim() || null;
  const documentNumber = (formData.get("documentNumber") as string || "").trim() || null;
  const commissionRate = parseFloat(formData.get("commissionRate") as string) || 0;
  const productCommissionRate = parseFloat(formData.get("productCommissionRate") as string) || 0;
  const pixKeyType = (formData.get("pixKeyType") as string || "").trim() || null;
  const pixKey = (formData.get("pixKey") as string || "").trim() || null;
  const instagram = (formData.get("instagram") as string || "").trim() || null;
  const showOnLanding = formData.get("showOnLanding") === "true";
  const servicesJson = (formData.get("servicesJson") as string || "[]");

  const id = `pro_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    await db.$executeRawUnsafe(
      `
      INSERT INTO "professional" (
        "id", "companyId", "name", "email", "phone", "bio", "roleTitle", "documentNumber",
        "commissionRate", "productCommissionRate", "pixKeyType", "pixKey", "instagram",
        "showOnLanding", "servicesJson", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW(), NOW()
      )
    `,
      id,
      company.id,
      name,
      email,
      phone,
      bio,
      roleTitle,
      documentNumber,
      commissionRate,
      productCommissionRate,
      pixKeyType,
      pixKey,
      instagram,
      showOnLanding,
      servicesJson
    );
  } catch (err) {
    console.error("Erro no insert SQL de profissional, executando fallback Prisma:", err);
    await db.professional.create({
      data: {
        id,
        // companyId sempre da empresa resolvida pela sessão, nunca do formulário
        companyId: company.id,
        name,
        email,
        phone,
        bio,
        isActive: true,
      },
    });
  }

  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}

export async function updateProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompanyForManage(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  await ensureProfessionalColumnsExist();

  const name = (formData.get("name") as string || "").trim();
  if (!name) {
    return { success: false, errors: { name: ["Nome é obrigatório"] } };
  }

  const email = (formData.get("email") as string || "").trim() || null;
  const phone = (formData.get("phone") as string || "").trim() || null;
  const bio = (formData.get("bio") as string || "").trim() || null;
  const roleTitle = (formData.get("roleTitle") as string || "").trim() || null;
  const documentNumber = (formData.get("documentNumber") as string || "").trim() || null;
  const commissionRate = parseFloat(formData.get("commissionRate") as string) || 0;
  const productCommissionRate = parseFloat(formData.get("productCommissionRate") as string) || 0;
  const pixKeyType = (formData.get("pixKeyType") as string || "").trim() || null;
  const pixKey = (formData.get("pixKey") as string || "").trim() || null;
  const instagram = (formData.get("instagram") as string || "").trim() || null;
  const showOnLanding = formData.get("showOnLanding") === "true";
  const servicesJson = (formData.get("servicesJson") as string || "[]");

  try {
    await db.$executeRawUnsafe(
      `
      UPDATE "professional" SET
        "name" = $1,
        "email" = $2,
        "phone" = $3,
        "bio" = $4,
        "roleTitle" = $5,
        "documentNumber" = $6,
        "commissionRate" = $7,
        "productCommissionRate" = $8,
        "pixKeyType" = $9,
        "pixKey" = $10,
        "instagram" = $11,
        "showOnLanding" = $12,
        "servicesJson" = $13,
        "updatedAt" = NOW()
      WHERE id = $14 AND "companyId" = $15
    `,
      name,
      email,
      phone,
      bio,
      roleTitle,
      documentNumber,
      commissionRate,
      productCommissionRate,
      pixKeyType,
      pixKey,
      instagram,
      showOnLanding,
      servicesJson,
      id,
      company.id
    );
  } catch (err) {
    console.error("Erro na atualização SQL de profissional, executando fallback Prisma:", err);
    // updateMany com companyId: o `update({ where: { id } })` original escrevia
    // em profissional de QUALQUER empresa se o SQL bruto falhasse (IDOR).
    await db.professional.updateMany({
      where: { id, companyId: company.id },
      data: {
        name,
        email,
        phone,
        bio,
      },
    });
  }

  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}

export async function deleteProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompanyForManage(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  try {
    await db.$executeRawUnsafe(
      `UPDATE "professional" SET "isActive" = false WHERE id = $1 AND "companyId" = $2`,
      id,
      company.id
    );
  } catch {
    // Escopado por companyId — sem isso o fallback desativaria profissional de
    // outra empresa a partir de um id adivinhado.
    await db.professional.updateMany({
      where: { id, companyId: company.id },
      data: { isActive: false },
    });
  }

  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}
