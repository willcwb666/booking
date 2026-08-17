"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { revalidatePath } from "next/cache";

export type CompanyRoleItem = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isPreset: boolean;
};

async function resolveCompany(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  return company ?? null;
}

async function ensureTableExist() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_role" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "isPreset" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error("Erro ao criar tabela company_role:", err);
  }
}

const PRESET_ROLES_BY_SEGMENT: Record<string, string[]> = {
  HOME_CLEANING: ["House Cleaner", "Helper", "Líder de Equipe", "Supervisor de Qualidade"],
  BARBER: ["Barbeiro Master", "Barbeiro Junior", "Colorista Masculino"],
  HAIR_SALON: ["Cabeleireiro", "Manicure & Pedicure", "Esteticista", "Maquiador"],
  MECHANIC: ["Mecânico Chefe", "Técnico Automotivo", "Auxiliar de Oficina"],
  PET_GROOMER: ["Groomer Master", "Banhista", "Tosador"],
  CAR_WASH: ["Detalhador Automotivo", "Lavador", "Polidor"],
  LAWN_CARE: ["Jardineiro Principal", "Auxiliar de Paisagismo"],
  POOL_CLEANING: ["Técnico de Piscinas", "Auxiliar de Manutenção"],
  PHOTOGRAPHER: ["Fotógrafo Principal", "Assistente de Iluminação", "Editor de Imagem"],
  OTHER: ["Profissional Especialista", "Assistente", "Supervisor"],
};

export async function getCompanyRolesAction(companySlug: string): Promise<CompanyRoleItem[]> {
  const company = await resolveCompany(companySlug);
  if (!company) return [];

  await ensureTableExist();

  // Verifica se a empresa já possui cargos cadastrados
  const countRows = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) FROM "company_role" WHERE "companyId" = $1`,
    company.id
  );

  if (Number(countRows[0]?.count || 0) === 0) {
    const segmentKey = (company.businessType || "OTHER").toUpperCase();
    const defaultRoleNames = PRESET_ROLES_BY_SEGMENT[segmentKey] || PRESET_ROLES_BY_SEGMENT["OTHER"];

    for (const rName of defaultRoleNames) {
      const id = `role_${company.id}_${Math.random().toString(36).substring(2, 6)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO "company_role" ("id", "companyId", "name", "description", "isPreset", "createdAt")
         VALUES ($1, $2, $3, $4, true, NOW()) ON CONFLICT DO NOTHING`,
        id,
        company.id,
        rName,
        `Cargo padrão do segmento ${company.businessType}`
      );
    }
  }

  const rows = await db.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM "company_role" WHERE "companyId" = $1 ORDER BY "name" ASC`,
    company.id
  );

  return rows.map((r) => ({
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    description: r.description || null,
    isPreset: Boolean(r.isPreset),
  }));
}

export async function createCompanyRoleAction(formData: FormData) {
  const slug = formData.get("companySlug") as string;
  const name = (formData.get("name") as string || "").trim();
  const description = (formData.get("description") as string || "").trim() || null;

  if (!name) return { success: false, error: "Nome do cargo é obrigatório." };

  const company = await resolveCompany(slug);
  if (!company) return { success: false, error: "Não autorizado." };

  await ensureTableExist();

  const id = `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await db.$executeRawUnsafe(
    `INSERT INTO "company_role" ("id", "companyId", "name", "description", "isPreset", "createdAt")
     VALUES ($1, $2, $3, $4, false, NOW())`,
    id,
    company.id,
    name,
    description
  );

  revalidatePath(`/${slug}/cargos`);
  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}

export async function deleteCompanyRoleAction(companySlug: string, roleId: string) {
  const company = await resolveCompany(companySlug);
  if (!company) return { success: false, error: "Não autorizado." };

  await ensureTableExist();
  await db.$executeRawUnsafe(
    `DELETE FROM "company_role" WHERE id = $1 AND "companyId" = $2`,
    roleId,
    company.id
  );

  revalidatePath(`/${companySlug}/cargos`);
  revalidatePath(`/${companySlug}/profissionais`);
  return { success: true };
}
