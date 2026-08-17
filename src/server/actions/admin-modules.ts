"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createSystemNotificationAction } from "@/server/actions/notifications-system";

export type SystemModule = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  monthlyPrice: number;
  lifetimePrice: number;
  billingType: "SUBSCRIPTION" | "ONE_TIME" | "BOTH";
  category: "GROWTH" | "OPERATIONS" | "FINANCE" | "AI";
  isActive: boolean;
};

export type ActiveCompanyLicenseRow = {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  businessType: string;
  moduleCode: string;
  moduleName: string;
  status: "ACTIVE" | "TRIAL" | "EXPIRED";
  expiresAt: string | null;
  grantedAt: string;
};

async function requireAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.role === "admin";
}

async function ensureTablesExist() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "system_module" (
      "id" TEXT PRIMARY KEY,
      "code" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "icon" TEXT NOT NULL DEFAULT 'Tag',
      "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "lifetimePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "billingType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
      "category" TEXT NOT NULL DEFAULT 'GROWTH',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "company_module_license" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "moduleCode" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "expiresAt" TIMESTAMP,
      "grantedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "grantedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
      CONSTRAINT "uniq_company_module" UNIQUE ("companyId", "moduleCode")
    );
  `);
}

export async function getSystemModulesAction() {
  try {
    await ensureTablesExist();

    const defaultModules = [
      { code: "promocoes", name: "Promoções & Cupons", description: "Crie campanhas e cupons de desconto estratégicos.", icon: "Tag", monthlyPrice: 29.9, lifetimePrice: 199.0, billingType: "BOTH", category: "GROWTH" },
      { code: "fidelidade", name: "Fidelidade & Pontos", description: "Programa de recompensas e acúmulo de pontos para retenção.", icon: "Award", monthlyPrice: 39.9, lifetimePrice: 299.0, billingType: "BOTH", category: "GROWTH" },
      { code: "waitlist", name: "Lista de Espera Inteligente", description: "Fila de espera automatizada para cancelamentos e horários ocupados.", icon: "UserCheck", monthlyPrice: 39.9, lifetimePrice: 249.0, billingType: "BOTH", category: "OPERATIONS" },
      { code: "clube_assinaturas", name: "Clube de Assinaturas Próprio", description: "Crie planos mensais de serviços ilimitados para seus clientes.", icon: "CreditCard", monthlyPrice: 79.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "FINANCE" },
      { code: "comanda_pos", name: "Comanda Rápida POS & Venda de Produtos", description: "Fechamento de comanda com adição de produtos físicos do estoque.", icon: "ClipboardList", monthlyPrice: 49.9, lifetimePrice: 349.0, billingType: "BOTH", category: "OPERATIONS" },
      { code: "smart_rebooking", name: "Smart Rebooking & Lembretes IA WhatsApp", description: "Disparo automático de mensagens para remarcação de clientes.", icon: "Bell", monthlyPrice: 59.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "AI" },
      { code: "split_pagamentos", name: "Split Automático de Comissões", description: "Divisão instantânea de comissões por atendimento e profissional.", icon: "DollarSign", monthlyPrice: 49.9, lifetimePrice: 0.0, billingType: "SUBSCRIPTION", category: "FINANCE" },
    ];

    for (const m of defaultModules) {
      await db.$executeRawUnsafe(
        `INSERT INTO "system_module" ("id", "code", "name", "description", "icon", "monthlyPrice", "lifetimePrice", "billingType", "category", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) ON CONFLICT DO NOTHING`,
        `mod_${m.code}`, m.code, m.name, m.description, m.icon, m.monthlyPrice, m.lifetimePrice, m.billingType, m.category
      );
    }

    const rows = await db.$queryRawUnsafe<Array<any>>(`SELECT * FROM "system_module" ORDER BY "name" ASC`);
    const modules: SystemModule[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      icon: r.icon || "Tag",
      monthlyPrice: Number(r.monthlyPrice || 0),
      lifetimePrice: Number(r.lifetimePrice || 0),
      billingType: r.billingType || "SUBSCRIPTION",
      category: r.category || "GROWTH",
      isActive: r.isActive ?? true,
    }));

    return { success: true, modules };
  } catch (err) {
    console.error("Erro ao buscar módulos do sistema:", err);
    return { success: false, modules: [] };
  }
}

export async function getAllActiveCompanyLicensesAction(): Promise<{
  success: boolean;
  licenses: ActiveCompanyLicenseRow[];
}> {
  try {
    await ensureTablesExist();
    const rows = await db.$queryRawUnsafe<Array<any>>(`
      SELECT 
        l.id, l."companyId", c.name as "companyName", c.slug as "companySlug", c."businessType",
        l."moduleCode", m.name as "moduleName", l.status, l."expiresAt", l."grantedAt"
      FROM "company_module_license" l
      JOIN "company" c ON c.id = l."companyId"
      LEFT JOIN "system_module" m ON m.code = l."moduleCode"
      ORDER BY l."grantedAt" DESC
    `);

    const licenses: ActiveCompanyLicenseRow[] = rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.companyName || "Empresa Desconhecida",
      companySlug: r.companySlug || "",
      businessType: r.businessType || "OTHER",
      moduleCode: r.moduleCode,
      moduleName: r.moduleName || r.moduleCode,
      status: r.status as any,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("pt-BR") : null,
      grantedAt: new Date(r.grantedAt).toLocaleDateString("pt-BR"),
    }));

    return { success: true, licenses };
  } catch (err) {
    console.error("Erro ao buscar licenças ativas:", err);
    return { success: false, licenses: [] };
  }
}

export async function grantBatchModuleLicensesAction(
  targetCompanyIds: string[],
  modulesConfig: Array<{ moduleCode: string; isTrial: boolean; trialDays?: number }>
) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };
  if (!targetCompanyIds.length || !modulesConfig.length) {
    return { success: false, error: "Selecione ao menos uma empresa e um módulo." };
  }

  try {
    await ensureTablesExist();

    for (const companyId of targetCompanyIds) {
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, phone: true },
      });
      if (!company) continue;

      for (const mod of modulesConfig) {
        const status = mod.isTrial ? "TRIAL" : "ACTIVE";
        let expiresAt: Date | null = null;
        if (mod.isTrial && mod.trialDays) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + mod.trialDays);
        }

        await db.$executeRawUnsafe(
          `
          INSERT INTO "company_module_license" ("id", "companyId", "moduleCode", "status", "expiresAt", "grantedAt", "grantedBy")
          VALUES ($1, $2, $3, $4, $5, NOW(), 'SUPER_ADMIN')
          ON CONFLICT ("companyId", "moduleCode") DO UPDATE SET
            "status" = EXCLUDED."status",
            "expiresAt" = EXCLUDED."expiresAt",
            "grantedAt" = NOW(),
            "grantedBy" = 'SUPER_ADMIN'
        `,
          `lic_${companyId}_${mod.moduleCode}`,
          companyId,
          mod.moduleCode,
          status,
          expiresAt
        );

        const moduleName = mod.moduleCode.replace(/_/g, " ").toUpperCase();
        const title = mod.isTrial ? `🎉 Boas Notícias! Módulo Liberado para Degustação!` : `🚀 Boas Notícias! Módulo Ativado no Sistema!`;
        const message = mod.isTrial
          ? `O módulo '${moduleName}' foi liberado no seu sistema para degustação por ${mod.trialDays || 30} dias! Aproveite todas as funcionalidades.`
          : `O módulo '${moduleName}' foi ativado no seu sistema pelo Super Admin! Aproveite todas as funcionalidades.`;

        await createSystemNotificationAction(title, message, "INFO", companyId);
      }
    }

    revalidatePath("/admin/modulos");
    revalidatePath("/", "layout");
    return {
      success: true,
      message: `Módulos liberados com sucesso para ${targetCompanyIds.length} empresa(s)! Notificações multi-canal disparadas.`,
    };
  } catch (err) {
    console.error("Erro ao liberar módulos em batch:", err);
    return { success: false, error: "Falha ao liberar módulos." };
  }
}

export async function renewModuleLicenseAction(companyId: string, moduleCode: string, addDays: number = 30) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  try {
    await ensureTablesExist();
    const rows = await db.$queryRawUnsafe<Array<{ expiresAt: Date | null }>>(
      `SELECT "expiresAt" FROM "company_module_license" WHERE "companyId" = $1 AND "moduleCode" = $2 LIMIT 1`,
      companyId,
      moduleCode
    );

    const baseDate = rows[0]?.expiresAt && new Date(rows[0].expiresAt) > new Date()
      ? new Date(rows[0].expiresAt)
      : new Date();
    
    baseDate.setDate(baseDate.getDate() + addDays);

    await db.$executeRawUnsafe(
      `UPDATE "company_module_license" SET "expiresAt" = $1, "status" = 'TRIAL' WHERE "companyId" = $2 AND "moduleCode" = $3`,
      baseDate,
      companyId,
      moduleCode
    );

    revalidatePath("/admin/modulos");
    revalidatePath("/", "layout");
    return { success: true, message: `Licença renovada por +${addDays} dias com sucesso!` };
  } catch (err) {
    console.error("Erro ao renovar licença:", err);
    return { success: false, error: "Falha ao renovar licença." };
  }
}

export async function revokeModuleLicenseAction(companyId: string, moduleCode: string) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  try {
    await ensureTablesExist();
    await db.$executeRawUnsafe(
      `DELETE FROM "company_module_license" WHERE "companyId" = $1 AND "moduleCode" = $2`,
      companyId,
      moduleCode
    );

    revalidatePath("/admin/modulos");
    revalidatePath("/", "layout");
    return { success: true, message: "Licença do módulo revogada." };
  } catch (err) {
    console.error("Erro ao revogar licença:", err);
    return { success: false, error: "Falha ao revogar licença." };
  }
}

export async function getCompanyLicensedModuleCodesAction(companySlug: string): Promise<string[]> {
  try {
    await ensureTablesExist();
    const company = await db.company.findFirst({
      where: { slug: companySlug },
      select: { id: true },
    });
    if (!company) return [];

    const rows = await db.$queryRawUnsafe<Array<{ moduleCode: string; status: string; expiresAt: Date | null }>>(
      `SELECT "moduleCode", "status", "expiresAt" FROM "company_module_license" WHERE "companyId" = $1`,
      company.id
    );

    const activeCodes: string[] = [];

    const now = new Date();
    for (const r of rows) {
      if (r.status === "ACTIVE") {
        activeCodes.push(r.moduleCode);
      } else if (r.status === "TRIAL" && r.expiresAt && new Date(r.expiresAt) > now) {
        activeCodes.push(r.moduleCode);
      }
    }

    return Array.from(new Set(activeCodes));
  } catch (err) {
    return [];
  }
}
